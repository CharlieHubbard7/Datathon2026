'use client';

import { useStore } from '@/store/useStore';
import { getScoreColor, getNeedLevel, NEED_LABELS, formatPercentage, formatCurrency, formatBudgetPerPerson } from '@/lib/colors';
import { MetricCard } from './MetricCard';
import { ChatBot } from './ChatBot';

export function CountryPanel() {
  const { selectedCountry, countries, selectCountry } = useStore();

  const country = selectedCountry ? countries[selectedCountry] : null;

  if (!country) return null;

  const scoreColor = getScoreColor(country.need_score);
  const needLevel = getNeedLevel(country.need_score);
  const helpedPercentage = formatPercentage(country.helped_individuals, country.people_in_need);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={() => selectCountry(null)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 z-40 animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold"
                style={{ backgroundColor: scoreColor }}
              >
                {country.need_score}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{country.country_name}</h2>
                <p className="text-sm text-gray-400">{NEED_LABELS[needLevel]}</p>
              </div>
            </div>
            <button
              onClick={() => selectCountry(null)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Key Metrics */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Key Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard
                label="Population"
                value={country.population}
              />
              <MetricCard
                label="People in Need"
                value={country.people_in_need}
                color={scoreColor}
              />
              <MetricCard
                label="Targeted"
                value={country.targeted_individuals}
                subtext="For assistance"
              />
              <MetricCard
                label="Reached"
                value={country.helped_individuals}
                subtext={`${helpedPercentage} of need`}
              />
              <MetricCard
                label="CBPF Budget 2025"
                value={formatCurrency(country.cbpf_total_budget_2025)}
                subtext={country.cbpf_project_count_2025 ? `${country.cbpf_project_count_2025} projects` : undefined}
                color="#22C55E"
              />
              <MetricCard
                label="Budget per Person"
                value={formatBudgetPerPerson(country.cbpf_budget_per_in_need)}
                subtext="Per person in need"
                color="#22C55E"
              />
            </div>
          </div>

          {/* Top 3 Unmet Groups */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Top 3 Unmet Groups</h3>
            <div className="space-y-2">
              {country.top_3_unmet_groups.map((group, idx) => (
                <div
                  key={group}
                  className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: idx === 0 ? scoreColor : 'transparent',
                      border: idx > 0 ? `2px solid ${scoreColor}` : 'none',
                      color: idx === 0 ? '#000' : scoreColor,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-sm text-gray-200">{group}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chatbot */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Ask the AI Assistant</h3>
            <ChatBot country={country} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-900/80">
          <p className="text-xs text-gray-500 text-center">
            Data from 2025 Humanitarian Snapshot
          </p>
        </div>
      </div>
    </>
  );
}
