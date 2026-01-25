'use client';

import { useEffect } from 'react';
import { Globe } from '@/components/Globe/Globe';
import { Tooltip } from '@/components/UI/Tooltip';
import { Legend } from '@/components/UI/Legend';
import { Leaderboard } from '@/components/UI/Leaderboard';
import { CountryPanel } from '@/components/UI/CountryPanel';
import { useStore } from '@/store/useStore';
import type { CountryDataMap } from '@/types';

export default function Home() {
  const { setCountries, isLoading, selectedCountry } = useStore();

  // Load country data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data: CountryDataMap = await response.json();
        setCountries(data);
      } catch (error) {
        console.error('Failed to load country data:', error);
      }
    };

    loadData();
  }, [setCountries]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 3D Globe */}
      <Globe />

      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 p-4 md:p-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              United Nations Global Humanitarian Need
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              2025 Data Snapshot
            </p>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading data...</span>
            </div>
          )}
        </header>

        {/* Instructions (show when no country selected) */}
        {!selectedCountry && !isLoading && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-sm text-gray-400 bg-gray-900/70 backdrop-blur-sm px-4 py-2 rounded-full">
              Click on a highlighted country to view details
            </p>
          </div>
        )}

        {/* Legend */}
        <Legend />

        {/* Leaderboard */}
        <Leaderboard />

        {/* Tooltip */}
        <Tooltip />

        {/* Country Panel */}
        <CountryPanel />
      </div>
    </main>
  );
}
