'use client';

import { useEffect } from 'react';
import { Globe } from '@/components/Globe/Globe';
import { Tooltip } from '@/components/UI/Tooltip';
import { Legend } from '@/components/UI/Legend';
import { Leaderboard } from '@/components/UI/Leaderboard';
import { CountryPanel } from '@/components/UI/CountryPanel';
import { FundingAllocator } from '@/components/UI/FundingAllocator';
import { YearSelector } from '@/components/UI/YearSelector';
import { useStore } from '@/store/useStore';
import { computeCompositeScores } from '@/lib/allocator';
import type { CountryDataMap } from '@/types';

export default function Home() {
  const { setCountries, setCompositeScores, isLoading, selectedCountry, setAllocatorOpen, selectedYear } = useStore();

  // Load country data when year changes
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/data/countries-${selectedYear}.json`);
        const data: CountryDataMap = await response.json();
        setCountries(data);

        // Compute composite scores using K-Means clustering
        const { scores, clusters } = computeCompositeScores(data);
        setCompositeScores(scores, clusters);
      } catch (error) {
        console.error('Failed to load country data:', error);
      }
    };

    loadData();
  }, [setCountries, setCompositeScores, selectedYear]);

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
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-400">
                Based on CBPF Allocations & Global HPC {selectedYear}
              </p>
              <YearSelector />
            </div>
            {/* ML Funding Allocator Button */}
            {!isLoading && (
              <button
                onClick={() => setAllocatorOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-white text-sm font-medium mt-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Funding Allocator
              </button>
            )}
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

        {/* ML Funding Allocator Modal */}
        <FundingAllocator />
      </div>
    </main>
  );
}
