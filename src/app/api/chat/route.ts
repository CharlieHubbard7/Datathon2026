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
    const systemPrompt = `You are a humanitarian aid expert assistant. You are providing information about ${country.name} based on 2025 humanitarian data.

COUNTRY DATA (2025):
- Country: ${country.name} (${country.iso3})
- Need Score: ${country.need_score}/100
- Population: ${country.population.toLocaleString()}
- People in Need: ${country.people_in_need.toLocaleString()}
- Targeted for Assistance: ${country.targeted_individuals.toLocaleString()}
- People Reached: ${country.helped_individuals.toLocaleString()}
- Top 3 Unmet Groups: ${country.top_3_unmet_groups.join(', ')}

IMPORTANT RULES:
1. ONLY use the data provided above. DO NOT invent statistics or numbers.
2. Be factual, concise, and actionable.
3. Maintain a respectful, non-sensational tone.
4. If asked about data not provided, acknowledge the limitation.
5. Focus on how people can help through legitimate humanitarian organizations.
6. Do not make political statements or assign blame.
7. Keep responses focused on humanitarian assistance and aid.`;

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
      model: 'gpt-4-turbo-preview',
      messages,
      max_tokens: isSummary ? 150 : 500,
      temperature: 0.7,
    });

    const responseMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
