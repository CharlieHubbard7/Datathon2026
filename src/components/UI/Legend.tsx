'use client';

import { useState } from 'react';
import { NEED_COLORS, NEED_LABELS, NO_DATA_COLOR, type NeedLevel } from '@/lib/colors';
import { useStore } from '@/store/useStore';

const LEGEND_ITEMS: { level: NeedLevel; range: string }[] = [
  { level: 'extreme', range: '81-100' },
  { level: 'severe', range: '61-80' },
  { level: 'high', range: '41-60' },
  { level: 'moderate', range: '21-40' },
  { level: 'low', range: '0-20' },
];

export function Legend() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedYear } = useStore();

  return (
    <div className="fixed bottom-6 left-6 z-20">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden shadow-xl">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-medium text-white">Priority Score Legend</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1">
            {/* Scale */}
            <div className="space-y-2">
              {LEGEND_ITEMS.map(({ level, range }) => (
                <div key={level} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: NEED_COLORS[level] }}
                  />
                  <span className="text-xs text-gray-300 flex-1">
                    {NEED_LABELS[level].replace(/\s*\([^)]*\)/, '')}
                  </span>
                  <span className="text-xs text-gray-500">{range}</span>
                </div>
              ))}
              {/* No Data entry */}
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: NO_DATA_COLOR }}
                />
                <span className="text-xs text-gray-300 flex-1">No Data</span>
                <span className="text-xs text-gray-500">-</span>
              </div>
            </div>

            {/* Data note */}
            <div className="mt-4 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                {selectedYear} Humanitarian Snapshot
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
