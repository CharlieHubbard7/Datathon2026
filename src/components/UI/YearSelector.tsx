'use client';

import { useStore } from '@/store/useStore';
import type { DataYear } from '@/types';

const YEARS: DataYear[] = [2025, 2024];

export function YearSelector() {
  const { selectedYear, setSelectedYear } = useStore();

  return (
    <div className="flex items-center gap-2">
      {YEARS.map((year) => (
        <button
          key={year}
          onClick={() => setSelectedYear(year)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            selectedYear === year
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
