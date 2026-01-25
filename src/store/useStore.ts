import { create } from 'zustand';
import type { GlobeState, CountryDataMap, ChatMessage, ChatHistory } from '@/types';

const initialChatHistory: ChatHistory = {
  messages: [],
  summary: null,
};

export const useStore = create<GlobeState>((set, get) => ({
  countries: {},
  selectedCountry: null,
  hoveredCountry: null,
  heatmapEnabled: true,
  isLoading: true,
  chatHistories: {},

  setCountries: (countries: CountryDataMap) => set({ countries, isLoading: false }),

  selectCountry: (iso3: string | null) => set({ selectedCountry: iso3 }),

  setHoveredCountry: (iso3: string | null) => set({ hoveredCountry: iso3 }),

  toggleHeatmap: () => set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  addChatMessage: (iso3: string, message: ChatMessage) =>
    set((state) => {
      const existing = state.chatHistories[iso3] || initialChatHistory;
      return {
        chatHistories: {
          ...state.chatHistories,
          [iso3]: {
            ...existing,
            messages: [...existing.messages, message],
          },
        },
      };
    }),

  setSummary: (iso3: string, summary: string) =>
    set((state) => {
      const existing = state.chatHistories[iso3] || initialChatHistory;
      return {
        chatHistories: {
          ...state.chatHistories,
          [iso3]: {
            ...existing,
            summary,
          },
        },
      };
    }),

  getChatHistory: (iso3: string): ChatHistory => {
    const state = get();
    return state.chatHistories[iso3] || initialChatHistory;
  },
}));
