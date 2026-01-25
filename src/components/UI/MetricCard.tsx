'use client';

import { formatNumber } from '@/lib/colors';

interface MetricCardProps {
  label: string;
  value: number;
  subtext?: string;
  color?: string;
}

export function MetricCard({ label, value, subtext, color }: MetricCardProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div
        className="text-xl font-bold"
        style={{ color: color || '#ffffff' }}
      >
        {formatNumber(value)}
      </div>
      {subtext && (
        <div className="text-xs text-gray-500 mt-1">{subtext}</div>
      )}
    </div>
  );
}
