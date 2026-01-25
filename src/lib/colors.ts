import type { NeedLevel } from '@/types';

export type { NeedLevel };

export const NEED_COLORS = {
  none: '#A0A0A0',     // Grey - no data
  low: '#FFFACD',      // Pale yellow (1-20)
  moderate: '#FFD700', // Golden yellow (21-40)
  high: '#FFA500',     // Orange (41-60)
  severe: '#FF6347',   // Red-orange (61-80)
  extreme: '#DC143C',  // Deep red (81-100)
} as const;

export const NEED_LABELS: Record<NeedLevel, string> = {
  none: 'No Data',
  low: 'Low Need (1-20)',
  moderate: 'Moderate Need (21-40)',
  high: 'High Need (41-60)',
  severe: 'Severe Need (61-80)',
  extreme: 'Extreme Need (81-100)',
};

export function getNeedLevel(score: number): NeedLevel {
  if (score === 0) return 'none';
  if (score <= 20) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 60) return 'high';
  if (score <= 80) return 'severe';
  return 'extreme';
}

export function getScoreColor(score: number): string {
  const level = getNeedLevel(score);
  return NEED_COLORS[level];
}

export function getScoreColorHex(score: number): number {
  const color = getScoreColor(score);
  return parseInt(color.replace('#', ''), 16);
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

export function formatCurrency(num: number | null): string {
  if (num === null) return 'N/A';
  if (num >= 1000000) {
    return '$' + (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return '$' + (num / 1000).toFixed(1) + 'K';
  }
  return '$' + num.toFixed(0);
}

export function formatBudgetPerPerson(num: number | null): string {
  if (num === null) return 'N/A';
  return '$' + num.toFixed(2);
}
