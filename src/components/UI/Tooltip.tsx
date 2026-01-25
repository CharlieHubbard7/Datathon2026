'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { getScoreColor, getNeedLevel, NEED_LABELS } from '@/lib/colors';

export function Tooltip() {
  const { hoveredCountry, countries } = useStore();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!hoveredCountry || !countries[hoveredCountry]) {
    return null;
  }

  const country = countries[hoveredCountry];
  const scoreColor = getScoreColor(country.need_score);
  const needLevel = getNeedLevel(country.need_score);

  return (
    <div
      className="fixed z-50 pointer-events-none animate-fade-in"
      style={{
        left: position.x + 15,
        top: position.y + 15,
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-xl max-w-xs">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: scoreColor }}
          />
          <span className="font-semibold text-white">{country.country_name}</span>
        </div>
        <div className="mt-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-400">Need Score</span>
            <span
              className="font-bold"
              style={{ color: scoreColor }}
            >
              {country.need_score}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {NEED_LABELS[needLevel]}
          </div>
        </div>
      </div>
    </div>
  );
}
