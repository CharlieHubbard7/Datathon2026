'use client';

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { getScoreColor } from '@/lib/colors';

export function Leaderboard() {
  const { countries, compositeScores, selectedCountry, selectCountry } = useStore();

  // Get top 8 countries by composite score (ML-adjusted need score)
  const topCountries = useMemo(() => {
    return Object.values(countries)
      .map(country => ({
        ...country,
        compositeScore: compositeScores[country.iso3]?.compositeScore ?? country.need_score,
        clusterName: compositeScores[country.iso3]?.clusterName ?? 'N/A',
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 8);
  }, [countries, compositeScores]);

  // Hide when a country is selected (panel is open)
  if (selectedCountry || topCountries.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden shadow-xl w-56">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Highest Priority</h3>
          <p className="text-xs text-gray-400 mt-0.5">ML-adjusted scores</p>
        </div>

        {/* List */}
        <div className="py-2">
          {topCountries.map((country, idx) => {
            const scoreColor = getScoreColor(country.compositeScore);
            return (
              <button
                key={country.iso3}
                onClick={() => selectCountry(country.iso3)}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-800/50 transition-colors text-left"
              >
                {/* Rank */}
                <span className="text-xs text-gray-500 w-4">{idx + 1}</span>

                {/* Score badge */}
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: scoreColor, color: '#000' }}
                  title={`Original: ${country.need_score}`}
                >
                  {country.compositeScore}
                </div>

                {/* Country name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{country.country_name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {(country.people_in_need / 1000000).toFixed(1)}M in need
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
