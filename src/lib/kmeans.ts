/**
 * Pure TypeScript K-Means Clustering Implementation
 * No external dependencies required
 */

export interface DataPoint {
  id: string;
  features: number[];
}

export interface ClusterResult {
  assignments: Map<string, number>; // id -> cluster index
  centroids: number[][];
  iterations: number;
}

/**
 * Min-max normalize an array of values to 0-1 range
 */
export function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    return values.map(() => 0.5);
  }

  return values.map(v => (v - min) / range);
}

/**
 * Calculate Euclidean distance between two feature vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Initialize centroids deterministically using percentile-based selection
 * Selects points at evenly spaced percentiles based on the first feature (need score)
 */
function initializeCentroids(data: DataPoint[], k: number): number[][] {
  const n = data.length;

  // Sort data by first feature (need score) for deterministic selection
  const sortedIndices = data
    .map((point, idx) => ({ idx, value: point.features[0] }))
    .sort((a, b) => a.value - b.value)
    .map(item => item.idx);

  // Select points at evenly spaced percentiles
  const centroids: number[][] = [];
  for (let c = 0; c < k; c++) {
    // Position at (c + 0.5) / k percentile for even distribution
    const percentile = (c + 0.5) / k;
    const idx = Math.min(Math.floor(percentile * n), n - 1);
    centroids.push([...data[sortedIndices[idx]].features]);
  }

  return centroids;
}

/**
 * Assign each point to the nearest centroid
 */
function assignClusters(data: DataPoint[], centroids: number[][]): Map<string, number> {
  const assignments = new Map<string, number>();

  for (const point of data) {
    let minDist = Infinity;
    let closestCluster = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = euclideanDistance(point.features, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        closestCluster = i;
      }
    }

    assignments.set(point.id, closestCluster);
  }

  return assignments;
}

/**
 * Recalculate centroids as the mean of assigned points
 */
function updateCentroids(
  data: DataPoint[],
  assignments: Map<string, number>,
  k: number,
  featureCount: number
): number[][] {
  const sums: number[][] = Array.from({ length: k }, () => Array(featureCount).fill(0));
  const counts: number[] = Array(k).fill(0);

  for (const point of data) {
    const cluster = assignments.get(point.id)!;
    counts[cluster]++;
    for (let f = 0; f < featureCount; f++) {
      sums[cluster][f] += point.features[f];
    }
  }

  return sums.map((sum, i) => {
    if (counts[i] === 0) {
      // Empty cluster - reinitialize randomly
      const randPoint = data[Math.floor(Math.random() * data.length)];
      return [...randPoint.features];
    }
    return sum.map(s => s / counts[i]);
  });
}

/**
 * Check if centroids have converged (no significant change)
 */
function hasConverged(oldCentroids: number[][], newCentroids: number[][], epsilon: number = 0.0001): boolean {
  for (let i = 0; i < oldCentroids.length; i++) {
    if (euclideanDistance(oldCentroids[i], newCentroids[i]) > epsilon) {
      return false;
    }
  }
  return true;
}

/**
 * Run K-Means clustering algorithm
 */
export function kMeans(data: DataPoint[], k: number, maxIterations: number = 100): ClusterResult {
  if (data.length === 0) {
    return { assignments: new Map(), centroids: [], iterations: 0 };
  }

  if (data.length < k) {
    k = data.length;
  }

  const featureCount = data[0].features.length;
  let centroids = initializeCentroids(data, k);
  let assignments = new Map<string, number>();
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Assign points to clusters
    assignments = assignClusters(data, centroids);

    // Update centroids
    const newCentroids = updateCentroids(data, assignments, k, featureCount);

    // Check for convergence
    if (hasConverged(centroids, newCentroids)) {
      centroids = newCentroids;
      break;
    }

    centroids = newCentroids;
  }

  return { assignments, centroids, iterations };
}

/**
 * Label clusters based on their centroid characteristics
 * Features expected: [needScore, fundingPerPerson, coverageGap, scale]
 */
export function labelCluster(centroid: number[]): { name: string; color: string } {
  const [needScore, funding] = centroid;

  // High need = needScore > 0.5, High funding = funding > 0.5
  const highNeed = needScore > 0.5;
  const highFunding = funding > 0.5;

  if (highNeed && !highFunding) {
    return { name: 'Critical Need', color: '#DC143C' }; // Deep red
  } else if (highNeed && highFunding) {
    return { name: 'Supported', color: '#FFA500' }; // Orange
  } else if (!highNeed && !highFunding) {
    return { name: 'Underfunded', color: '#FFD700' }; // Gold
  } else {
    return { name: 'Well-Covered', color: '#22C55E' }; // Green
  }
}
