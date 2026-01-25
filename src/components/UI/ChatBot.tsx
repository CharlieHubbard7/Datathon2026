'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { CountryData, ChatMessage } from '@/types';

interface ChatBotProps {
  country: CountryData;
}

const SUGGESTED_QUESTIONS = [
  "What's driving the need here?",
  "Who is being left out?",
  "How can individuals help?",
  "What types of aid matter most?",
];

export function ChatBot({ country }: ChatBotProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getChatHistory, addChatMessage } = useStore();

  const chatHistory = getChatHistory(country.iso3);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory.messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    addChatMessage(country.iso3, userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          country: {
            name: country.country_name,
            iso3: country.iso3,
            need_score: country.need_score,
            population: country.population,
            people_in_need: country.people_in_need,
            targeted_individuals: country.targeted_individuals,
            helped_individuals: country.helped_individuals,
            top_3_unmet_groups: country.top_3_unmet_groups,
          },
          history: chatHistory.messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = { role: 'assistant', content: data.message };
      addChatMessage(country.iso3, assistantMessage);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${errorText}. Please check your API key and try again.`,
      };
      addChatMessage(country.iso3, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-80">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-3">
        {chatHistory.messages.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-4">
              Ask questions about humanitarian needs in {country.country_name}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-gray-700/50 hover:bg-gray-700 px-3 py-1.5 rounded-full text-gray-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about humanitarian needs..."
          className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
