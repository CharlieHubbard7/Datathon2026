'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { clusterCountries, allocateBudget } from '@/lib/allocator';
import { formatCurrency } from '@/lib/colors';
import type { ClusterInfo, AllocationResult } from '@/types';

const MIN_BUDGET = 1_000_000; // $1M
const MAX_BUDGET = 500_000_000; // $500M
const DEFAULT_BUDGET = 50_000_000; // $50M

function formatBudgetDisplay(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  return `$${(value / 1_000).toFixed(0)}K`;
}

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function FundingAllocator() {
  const { allocatorOpen, setAllocatorOpen, countries } = useStore();
  const [budget, setBudget] = useState(DEFAULT_BUDGET);

  // Compute clusters ONCE when modal opens - stable across budget changes
  const stableClusters = useMemo(() => {
    if (!allocatorOpen || Object.keys(countries).length === 0) {
      return [] as ClusterInfo[];
    }
    return clusterCountries(countries);
  }, [countries, allocatorOpen]);

  // Recompute allocations when budget changes (uses stable clusters)
  const { clusters, allocations } = useMemo(() => {
    if (stableClusters.length === 0) {
      return { clusters: [] as ClusterInfo[], allocations: [] as AllocationResult[] };
    }
    return allocateBudget(stableClusters, countries, budget);
  }, [stableClusters, countries, budget]);

  if (!allocatorOpen) return null;

  const maxAllocation = Math.max(...allocations.map(a => a.allocation), 1);
  const countryCount = allocations.length;
  const totalNeedScore = allocations.reduce((sum, a) => sum + a.needScore, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50"
        onClick={() => setAllocatorOpen(false)}
      />

      {/* Modal - Full screen with padding */}
      <div className="fixed inset-2 md:inset-4 lg:inset-6 bg-gray-900 rounded-xl z-50 flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">ML Funding Allocator</h2>
            <p className="text-xs md:text-sm text-gray-400">K-Means Clustering | {countryCount} countries | {clusters.length} clusters</p>
          </div>
          <button
            onClick={() => setAllocatorOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Left Column - Budget Slider (Vertical on desktop) */}
          <div className="lg:w-48 p-4 border-b lg:border-b-0 lg:border-r border-gray-700 flex flex-col items-center justify-center bg-gray-800/30 shrink-0">
            <div className="text-center mb-4">
              <div className="text-3xl md:text-4xl font-bold text-white">{formatBudgetDisplay(budget)}</div>
              <div className="text-xs text-gray-500 mt-1">Total Budget</div>
            </div>

            {/* Vertical slider on desktop, horizontal on mobile */}
            <div className="hidden lg:flex flex-col items-center flex-1 py-4">
              <span className="text-xs text-gray-500 mb-2">$500M</span>
              <input
                type="range"
                min={MIN_BUDGET}
                max={MAX_BUDGET}
                step={1_000_000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="h-48 w-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              />
              <span className="text-xs text-gray-500 mt-2">$1M</span>
            </div>

            {/* Horizontal slider on mobile */}
            <div className="lg:hidden w-full flex items-center gap-2">
              <span className="text-xs text-gray-500">$1M</span>
              <input
                type="range"
                min={MIN_BUDGET}
                max={MAX_BUDGET}
                step={1_000_000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-gray-500">$500M</span>
            </div>
          </div>

          {/* Middle Column - Cluster Visualization */}
          <div className="lg:w-72 p-4 border-b lg:border-b-0 lg:border-r border-gray-700 overflow-y-auto shrink-0">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Cluster Breakdown</h3>
            <div className="space-y-3">
              {clusters.map((cluster) => {
                const percentage = (cluster.allocation / budget) * 100;
                return (
                  <div key={cluster.id} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <span className="font-medium text-white text-sm">{cluster.name}</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-lg font-bold text-white">{formatCurrency(cluster.allocation)}</span>
                      <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cluster.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{cluster.countries.length} countries</span>
                      <span>Avg: {cluster.avgNeedScore.toFixed(0)} need</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Country Allocations Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Country Allocations</h3>

            {/* Compact Grid of Countries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
              {allocations.map((allocation) => {
                const barWidth = (allocation.allocation / maxAllocation) * 100;
                const cluster = clusters.find(c => c.id === allocation.clusterId);
                return (
                  <div
                    key={allocation.iso3}
                    className="bg-gray-800/40 rounded-lg p-2 hover:bg-gray-800/60 transition-colors relative overflow-hidden"
                  >
                    {/* Background bar */}
                    <div
                      className="absolute inset-0 opacity-20 transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: cluster?.color || '#22C55E',
                      }}
                    />

                    {/* Content */}
                    <div className="relative flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cluster?.color || '#888' }}
                        />
                        <span className="text-sm text-white truncate">{allocation.countryName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">{allocation.needScore}</span>
                        <span className="text-sm font-semibold text-green-400">{formatShortCurrency(allocation.allocation)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer - Summary Stats */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50 shrink-0">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{formatBudgetDisplay(budget)}</div>
              <div className="text-xs text-gray-500">Total Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{countryCount}</div>
              <div className="text-xs text-gray-500">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{clusters.length}</div>
              <div className="text-xs text-gray-500">Clusters</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{formatShortCurrency(budget / countryCount)}</div>
              <div className="text-xs text-gray-500">Avg per Country</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
