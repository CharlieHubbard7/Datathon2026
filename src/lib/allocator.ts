/**
 * ML-based Budget Allocator using K-Means Clustering
 */

import type { CountryData, CountryDataMap, ClusterInfo, AllocationResult } from '@/types';
import { kMeans, normalize, type DataPoint } from './kmeans';

const K_CLUSTERS = 4;

/**
 * Prepare feature vectors for clustering
 * Features: [needScore, fundingPerPerson, coverageGap, scale]
 */
function prepareFeatures(countries: CountryData[]): {
  dataPoints: DataPoint[];
  featureRanges: { needScores: number[]; fundings: number[]; gaps: number[]; scales: number[] };
} {
  const needScores: number[] = [];
  const fundings: number[] = [];
  const gaps: number[] = [];
  const scales: number[] = [];

  // Extract raw features
  for (const country of countries) {
    needScores.push(country.need_score / 100); // Already 0-1

    // Funding per person (0 if null)
    const funding = country.cbpf_budget_per_in_need ?? 0;
    fundings.push(funding);

    // Coverage gap: 1 - (helped / in_need)
    const coverage = country.people_in_need > 0
      ? country.helped_individuals / country.people_in_need
      : 0;
    gaps.push(1 - coverage);

    // Scale: log of people in need (normalized later)
    const scale = country.people_in_need > 0 ? Math.log10(country.people_in_need) : 0;
    scales.push(scale);
  }

  // Normalize all features to 0-1
  const normFundings = normalize(fundings);
  const normGaps = normalize(gaps);
  const normScales = normalize(scales);

  // Build data points
  const dataPoints: DataPoint[] = countries.map((country, i) => ({
    id: country.iso3,
    features: [needScores[i], normFundings[i], normGaps[i], normScales[i]],
  }));

  return {
    dataPoints,
    featureRanges: { needScores, fundings, gaps, scales },
  };
}

/**
 * Run K-Means clustering on countries and build cluster info
 */
export function clusterCountries(countriesMap: CountryDataMap): ClusterInfo[] {
  const countries = Object.values(countriesMap).filter(c => c.people_in_need > 0);

  if (countries.length === 0) {
    return [];
  }

  const { dataPoints } = prepareFeatures(countries);
  const result = kMeans(dataPoints, K_CLUSTERS);

  // Build cluster info
  const clusterMap = new Map<number, { countries: string[]; needSum: number; fundingSum: number }>();

  for (let i = 0; i < K_CLUSTERS; i++) {
    clusterMap.set(i, { countries: [], needSum: 0, fundingSum: 0 });
  }

  for (const country of countries) {
    const clusterId = result.assignments.get(country.iso3);
    if (clusterId !== undefined) {
      const cluster = clusterMap.get(clusterId)!;
      cluster.countries.push(country.iso3);
      cluster.needSum += country.need_score;
      cluster.fundingSum += country.cbpf_budget_per_in_need ?? 0;
    }
  }

  // Convert to ClusterInfo array with preliminary data
  const clusters: ClusterInfo[] = [];

  for (let i = 0; i < K_CLUSTERS; i++) {
    const data = clusterMap.get(i)!;
    if (data.countries.length === 0) continue;

    const centroid = result.centroids[i];
    const avgNeedScore = data.needSum / data.countries.length;
    const avgFunding = data.fundingSum / data.countries.length;

    // Priority = high need + low funding = avgNeedScore - normalized(avgFunding)
    // Higher priority means more allocation
    const priority = Math.max(0, (avgNeedScore / 100) - centroid[1]); // centroid[1] is normalized funding

    clusters.push({
      id: i,
      name: '', // Will be set after ranking
      color: '', // Will be set after ranking
      avgNeedScore,
      avgFunding,
      priority,
      countries: data.countries,
      allocation: 0, // Will be set during budget allocation
    });
  }

  // Sort by priority (highest first) for labeling
  clusters.sort((a, b) => b.priority - a.priority);

  // Assign labels based on relative ranking
  const clusterLabels = [
    { name: 'Critical Need', color: '#DC143C' },    // Highest priority - red
    { name: 'High Priority', color: '#FF6347' },    // Second - tomato
    { name: 'Moderate Priority', color: '#FFA500' }, // Third - orange
    { name: 'Lower Priority', color: '#FFD700' },   // Fourth - gold
  ];

  clusters.forEach((cluster, index) => {
    const label = clusterLabels[Math.min(index, clusterLabels.length - 1)];
    cluster.name = label.name;
    cluster.color = label.color;
  });

  return clusters;
}

/**
 * Allocate budget based on individual country need scores
 * Higher need score = higher individual allocation
 * Clusters are used for grouping/visualization only
 */
export function allocateBudget(
  clusters: ClusterInfo[],
  countriesMap: CountryDataMap,
  totalBudget: number
): { clusters: ClusterInfo[]; allocations: AllocationResult[] } {
  if (clusters.length === 0) {
    return { clusters, allocations: [] };
  }

  // Get all countries from all clusters
  const allCountryIsos = clusters.flatMap(c => c.countries);
  const allCountries = allCountryIsos.map(iso3 => countriesMap[iso3]).filter(Boolean);

  // Calculate total need score across ALL countries
  const totalNeedScore = allCountries.reduce((sum, c) => sum + c.need_score, 0);

  // Build a map of iso3 -> cluster info for labeling
  const countryToCluster = new Map<string, ClusterInfo>();
  for (const cluster of clusters) {
    for (const iso3 of cluster.countries) {
      countryToCluster.set(iso3, cluster);
    }
  }

  // Allocate to each country based on their individual need score
  const allocations: AllocationResult[] = [];
  const clusterAllocations = new Map<number, number>(); // Track totals per cluster

  for (const country of allCountries) {
    // Individual allocation based on need score proportion
    const share = totalNeedScore > 0 ? country.need_score / totalNeedScore : 1 / allCountries.length;
    const allocation = share * totalBudget;

    const cluster = countryToCluster.get(country.iso3)!;

    allocations.push({
      iso3: country.iso3,
      countryName: country.country_name,
      clusterId: cluster.id,
      clusterName: cluster.name,
      needScore: country.need_score,
      currentFundingPerPerson: country.cbpf_budget_per_in_need,
      allocation,
    });

    // Track cluster totals for display
    clusterAllocations.set(
      cluster.id,
      (clusterAllocations.get(cluster.id) || 0) + allocation
    );
  }

  // Update cluster allocation totals
  for (const cluster of clusters) {
    cluster.allocation = clusterAllocations.get(cluster.id) || 0;
  }

  // Sort allocations by amount (highest first)
  allocations.sort((a, b) => b.allocation - a.allocation);

  return { clusters, allocations };
}

/**
 * Main function: cluster countries and allocate budget
 */
export function runAllocation(
  countriesMap: CountryDataMap,
  budget: number
): { clusters: ClusterInfo[]; allocations: AllocationResult[] } {
  const clusters = clusterCountries(countriesMap);
  return allocateBudget(clusters, countriesMap, budget);
}
