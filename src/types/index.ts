export interface CountryData {
  country_name: string;
  iso3: string;
  population: number;
  people_in_need: number;
  targeted_individuals: number;
  helped_individuals: number;
  inform_severity: number;
  need_score: number;
  top_3_unmet_groups: string[];
}

export type CountryDataMap = Record<string, CountryData>;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatHistory {
  messages: ChatMessage[];
  summary: string | null;
}

export type ChatHistoryMap = Record<string, ChatHistory>;

export interface HoverInfo {
  country: CountryData | null;
  position: { x: number; y: number };
}

export type NeedLevel = 'none' | 'low' | 'moderate' | 'high' | 'severe' | 'extreme';

export interface GlobeState {
  countries: CountryDataMap;
  selectedCountry: string | null;
  hoveredCountry: string | null;
  heatmapEnabled: boolean;
  isLoading: boolean;
  chatHistories: ChatHistoryMap;

  setCountries: (countries: CountryDataMap) => void;
  selectCountry: (iso3: string | null) => void;
  setHoveredCountry: (iso3: string | null) => void;
  toggleHeatmap: () => void;
  setLoading: (loading: boolean) => void;
  addChatMessage: (iso3: string, message: ChatMessage) => void;
  setSummary: (iso3: string, summary: string) => void;
  getChatHistory: (iso3: string) => ChatHistory;
}
