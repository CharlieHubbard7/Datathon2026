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

  // Assign labels based on centroid characteristics (need vs funding)
  // Find median values for need and funding to determine high/low thresholds
  const needValues = clusters.map(c => c.avgNeedScore).sort((a, b) => a - b);
  const fundingCentroids = clusters.map(c => result.centroids[c.id]?.[1] ?? 0).sort((a, b) => a - b);

  const medianNeed = needValues.length > 1
    ? (needValues[Math.floor(needValues.length / 2) - 1] + needValues[Math.floor(needValues.length / 2)]) / 2
    : needValues[0] || 50;
  const medianFunding = fundingCentroids.length > 1
    ? (fundingCentroids[Math.floor(fundingCentroids.length / 2) - 1] + fundingCentroids[Math.floor(fundingCentroids.length / 2)]) / 2
    : fundingCentroids[0] || 0.5;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const centroid = result.centroids[cluster.id];
    const highNeed = cluster.avgNeedScore >= medianNeed;
    const highFunding = centroid ? centroid[1] >= medianFunding : false;

    if (highNeed && !highFunding) {
      cluster.name = 'High Need Low Funding';
      cluster.color = '#DC143C'; // Red - most critical
    } else if (highNeed && highFunding) {
      cluster.name = 'High Need High Funding';
      cluster.color = '#FFA500'; // Orange - supported but high need
    } else if (!highNeed && !highFunding) {
      cluster.name = 'Low Need Low Funding';
      cluster.color = '#FFD700'; // Gold - underfunded but lower need
    } else {
      cluster.name = 'Low Need High Funding';
      cluster.color = '#22C55E'; // Green - well covered
    }
  }

  // Sort by priority (highest first) for display
  clusters.sort((a, b) => b.priority - a.priority);

  return clusters;
}

/**
 * Get cluster multiplier based on cluster type
 * High Need Low Funding gets the highest multiplier (most critical)
 * Low Need High Funding gets the lowest (already well-supported)
 */
function getClusterMultiplier(clusterName: string): number {
  switch (clusterName) {
    case 'High Need Low Funding':
      return 1.5;  // +50% boost - most critical, needs urgent funding
    case 'Low Need Low Funding':
      return 1.2;  // +20% boost - underfunded, deserves attention
    case 'High Need High Funding':
      return 1.0;  // neutral - high need but already getting support
    case 'Low Need High Funding':
      return 0.7;  // -30% - well covered, redirect resources elsewhere
    default:
      return 1.0;
  }
}

/**
 * Allocate budget based on composite need scores
 * Composite score = original need score × cluster multiplier
 * This ensures cluster characteristics influence final allocation
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

  // Build a map of iso3 -> cluster info for labeling
  const countryToCluster = new Map<string, ClusterInfo>();
  for (const cluster of clusters) {
    for (const iso3 of cluster.countries) {
      countryToCluster.set(iso3, cluster);
    }
  }

  // Calculate raw composite need scores (original need × cluster multiplier)
  const rawCompositeScores = new Map<string, number>();
  let totalRawScore = 0;
  let minRaw = Infinity;
  let maxRaw = -Infinity;

  for (const country of allCountries) {
    const cluster = countryToCluster.get(country.iso3)!;
    const multiplier = getClusterMultiplier(cluster.name);
    const rawScore = country.need_score * multiplier;
    rawCompositeScores.set(country.iso3, rawScore);
    totalRawScore += rawScore;
    minRaw = Math.min(minRaw, rawScore);
    maxRaw = Math.max(maxRaw, rawScore);
  }

  // Normalize composite scores to 0-100 for display
  const rangeRaw = maxRaw - minRaw;
  const normalizedScores = new Map<string, number>();
  rawCompositeScores.forEach((raw, iso3) => {
    const normalized = rangeRaw > 0 ? Math.round(((raw - minRaw) / rangeRaw) * 100) : 50;
    normalizedScores.set(iso3, normalized);
  });

  // Allocate to each country based on their RAW composite need score (for proper proportions)
  const allocations: AllocationResult[] = [];
  const clusterAllocations = new Map<number, number>(); // Track totals per cluster

  for (const country of allCountries) {
    const cluster = countryToCluster.get(country.iso3)!;
    const rawScore = rawCompositeScores.get(country.iso3)!;
    const normalizedScore = normalizedScores.get(country.iso3)!;

    // Allocation based on RAW composite score proportion (not normalized, for correct proportions)
    const share = totalRawScore > 0 ? rawScore / totalRawScore : 1 / allCountries.length;
    const allocation = share * totalBudget;

    allocations.push({
      iso3: country.iso3,
      countryName: country.country_name,
      clusterId: cluster.id,
      clusterName: cluster.name,
      needScore: country.need_score,
      compositeScore: normalizedScore, // Display normalized 0-100 score
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

  // Sort allocations by composite score (highest first)
  allocations.sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

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

/**
 * Compute composite scores for all countries based on K-Means clustering
 * Returns a map of ISO3 -> composite score data (normalized to 0-100)
 */
export function computeCompositeScores(
  countriesMap: CountryDataMap
): {
  scores: Record<string, { compositeScore: number; clusterName: string; multiplier: number }>;
  clusters: ClusterInfo[];
} {
  const clusters = clusterCountries(countriesMap);

  if (clusters.length === 0) {
    return { scores: {}, clusters: [] };
  }

  // Build a map of iso3 -> cluster info
  const countryToCluster = new Map<string, ClusterInfo>();
  for (const cluster of clusters) {
    for (const iso3 of cluster.countries) {
      countryToCluster.set(iso3, cluster);
    }
  }

  // First pass: calculate raw composite scores and find min/max for normalization
  const rawScores: Record<string, { rawScore: number; clusterName: string; multiplier: number }> = {};
  let minScore = Infinity;
  let maxScore = -Infinity;

  for (const [iso3, country] of Object.entries(countriesMap)) {
    const cluster = countryToCluster.get(iso3);
    if (cluster) {
      const multiplier = getClusterMultiplier(cluster.name);
      const rawScore = country.need_score * multiplier;
      rawScores[iso3] = { rawScore, clusterName: cluster.name, multiplier };
      minScore = Math.min(minScore, rawScore);
      maxScore = Math.max(maxScore, rawScore);
    } else {
      // Countries not in clusters (e.g., no people_in_need) keep original score
      rawScores[iso3] = { rawScore: country.need_score, clusterName: 'N/A', multiplier: 1.0 };
      minScore = Math.min(minScore, country.need_score);
      maxScore = Math.max(maxScore, country.need_score);
    }
  }

  // Second pass: normalize to 0-100 scale
  const scores: Record<string, { compositeScore: number; clusterName: string; multiplier: number }> = {};
  const range = maxScore - minScore;

  for (const [iso3, data] of Object.entries(rawScores)) {
    // Normalize: (value - min) / (max - min) * 100
    const normalizedScore = range > 0
      ? Math.round(((data.rawScore - minScore) / range) * 100)
      : 50; // If all scores are the same, default to 50

    scores[iso3] = {
      compositeScore: normalizedScore,
      clusterName: data.clusterName,
      multiplier: data.multiplier,
    };
  }

  return { scores, clusters };
}
