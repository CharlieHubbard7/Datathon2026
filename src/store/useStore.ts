import { create } from 'zustand';
import type { GlobeState, CountryDataMap, ChatMessage, ChatHistory, CompositeScoreMap, ClusterInfo } from '@/types';

const initialChatHistory: ChatHistory = {
  messages: [],
  summary: null,
};

export const useStore = create<GlobeState>((set, get) => ({
  countries: {},
  compositeScores: {},
  clusters: [],
  selectedCountry: null,
  hoveredCountry: null,
  heatmapEnabled: true,
  isLoading: true,
  chatHistories: {},
  allocatorOpen: false,

  setCountries: (countries: CountryDataMap) => set({ countries, isLoading: false }),

  setCompositeScores: (scores: CompositeScoreMap, clusters: ClusterInfo[]) =>
    set({ compositeScores: scores, clusters }),

  getCompositeScore: (iso3: string): number => {
    const state = get();
    const scoreData = state.compositeScores[iso3];
    if (scoreData) {
      return scoreData.compositeScore;
    }
    // Fallback to original need score if composite not computed yet
    const country = state.countries[iso3];
    return country?.need_score ?? 0;
  },

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

  setAllocatorOpen: (open: boolean) => set({ allocatorOpen: open }),
}));
