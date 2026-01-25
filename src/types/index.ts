export interface CountryData {
  country_name: string;
  iso3: string;
  population: number;
  people_in_need: number;
  targeted_individuals: number;
  helped_individuals: number;
  need_score: number;
  top_3_unmet_groups: string[];
  // CBPF financial metrics (nullable for countries without CBPF data)
  cbpf_total_budget_2025: number | null;
  cbpf_project_count_2025: number | null;
  cbpf_budget_per_in_need: number | null;
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

// ML Funding Allocator types
export interface ClusterInfo {
  id: number;
  name: string;
  color: string;
  avgNeedScore: number;
  avgFunding: number;
  priority: number;
  countries: string[];
  allocation: number;
}

export interface AllocationResult {
  iso3: string;
  countryName: string;
  clusterId: number;
  clusterName: string;
  needScore: number;
  currentFundingPerPerson: number | null;
  allocation: number;
}

export interface GlobeState {
  countries: CountryDataMap;
  selectedCountry: string | null;
  hoveredCountry: string | null;
  heatmapEnabled: boolean;
  isLoading: boolean;
  chatHistories: ChatHistoryMap;
  allocatorOpen: boolean;

  setCountries: (countries: CountryDataMap) => void;
  selectCountry: (iso3: string | null) => void;
  setHoveredCountry: (iso3: string | null) => void;
  toggleHeatmap: () => void;
  setLoading: (loading: boolean) => void;
  addChatMessage: (iso3: string, message: ChatMessage) => void;
  setSummary: (iso3: string, summary: string) => void;
  getChatHistory: (iso3: string) => ChatHistory;
  setAllocatorOpen: (open: boolean) => void;
}
