import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface CountryContext {
  name: string;
  iso3: string;
  need_score: number;
  population: number;
  people_in_need: number;
  targeted_individuals: number;
  helped_individuals: number;
  top_3_unmet_groups: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, country, history, isSummary } = await request.json() as {
      message: string;
      country: CountryContext;
      history: ChatMessage[];
      isSummary?: boolean;
    };

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Build system prompt with country context
    const systemPrompt = `You are a UN humanitarian aid advisor. Provide concise, helpful guidance about ${country.name}.

COUNTRY DATA (2025):
- Need Score: ${country.need_score}/100
- Population: ${country.population.toLocaleString()}
- People in Need: ${country.people_in_need.toLocaleString()}
- People Reached: ${country.helped_individuals.toLocaleString()}
- Unmet Groups: ${country.top_3_unmet_groups.join(', ')}

RESPONSE RULES:
1. Keep responses SHORT (3-4 paragraphs max, ~150 words total)
2. Use clear paragraph breaks between ideas
3. Be direct and actionable
4. Only use the data provided - don't invent statistics
5. Stay neutral and avoid political statements

FORMATTING:
- Write in short, clear paragraphs
- NO bullet points, lists, or markdown
- NO section headers
- Just flowing prose with paragraph breaks
- Each paragraph should be 2-3 sentences max

CONTENT FOCUS:
- Answer the user's specific question directly
- Include one concrete way to help if relevant
- Reference UN agencies (WFP, UNICEF, UNHCR) when appropriate
- Mention pooled funds (CERF, CBPFs) for donation questions

Keep it conversational and readable - like a knowledgeable colleague giving a brief answer.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (limit to last 10 messages for context window)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for reliability and cost efficiency
      messages,
      max_tokens: isSummary ? 150 : 500,
      temperature: 0.7,
    });

    const responseMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    return NextResponse.json({ message: responseMessage });
  } catch (error: unknown) {
    console.error('OpenAI API error:', error);

    // Extract error message for debugging
    let errorMessage = 'Failed to process request';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
