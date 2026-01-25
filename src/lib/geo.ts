import * as THREE from 'three';

// Convert latitude/longitude to 3D coordinates on a sphere
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Convert GeoJSON coordinates [lon, lat] to Vector3
export function coordToVector3(
  coord: [number, number],
  radius: number
): THREE.Vector3 {
  return latLonToVector3(coord[1], coord[0], radius);
}

// Interpolate between two points on a sphere surface (spherical linear interpolation)
export function slerp(
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  radius: number
): THREE.Vector3 {
  // Normalize to unit vectors
  const startNorm = start.clone().normalize();
  const endNorm = end.clone().normalize();

  // Calculate angle between vectors
  let dot = startNorm.dot(endNorm);
  dot = Math.max(-1, Math.min(1, dot)); // Clamp for numerical stability

  const angle = Math.acos(dot);

  // If angle is very small, use linear interpolation
  if (angle < 0.001) {
    const result = new THREE.Vector3().lerpVectors(start, end, t);
    return result.normalize().multiplyScalar(radius);
  }

  const sinAngle = Math.sin(angle);
  const a = Math.sin((1 - t) * angle) / sinAngle;
  const b = Math.sin(t * angle) / sinAngle;

  const result = new THREE.Vector3(
    a * startNorm.x + b * endNorm.x,
    a * startNorm.y + b * endNorm.y,
    a * startNorm.z + b * endNorm.z
  );

  return result.normalize().multiplyScalar(radius);
}

// Create intermediate points along a great circle arc
export function createSphericalArc(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  radius: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(slerp(start, end, t, radius));
  }

  return points;
}

// GeoJSON types
export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    ISO_A3: string;
    NAME: string;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Calculate the angular distance between two points on a sphere
function angularDistance(p1: THREE.Vector3, p2: THREE.Vector3): number {
  const dot = p1.clone().normalize().dot(p2.clone().normalize());
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

// Densify a ring by adding intermediate points along great circle arcs
// This ensures the polygon follows the sphere surface
function densifyRing(
  ring: number[][],
  radius: number,
  maxAngle: number = 0.05 // ~3 degrees
): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];

  for (let i = 0; i < ring.length - 1; i++) {
    const start = coordToVector3(ring[i] as [number, number], radius);
    const end = coordToVector3(ring[i + 1] as [number, number], radius);

    const angle = angularDistance(start, end);
    const segments = Math.max(1, Math.ceil(angle / maxAngle));

    // Add points along the great circle arc (excluding the last point to avoid duplicates)
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      result.push(slerp(start, end, t, radius));
    }
  }

  return result;
}

// Subdivide a triangle on a sphere surface
function subdivideSphericalTriangle(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  radius: number,
  maxAngle: number,
  vertices: number[],
  indices: number[],
  vertexMap: Map<string, number>
): void {
  // Check if triangle needs subdivision
  const angle01 = angularDistance(v0, v1);
  const angle12 = angularDistance(v1, v2);
  const angle20 = angularDistance(v2, v0);
  const maxEdgeAngle = Math.max(angle01, angle12, angle20);

  if (maxEdgeAngle <= maxAngle) {
    // Triangle is small enough, add it
    const i0 = addVertex(v0, vertices, vertexMap);
    const i1 = addVertex(v1, vertices, vertexMap);
    const i2 = addVertex(v2, vertices, vertexMap);
    indices.push(i0, i1, i2);
    return;
  }

  // Subdivide by adding midpoints
  const m01 = slerp(v0, v1, 0.5, radius);
  const m12 = slerp(v1, v2, 0.5, radius);
  const m20 = slerp(v2, v0, 0.5, radius);

  // Recursively subdivide into 4 triangles
  subdivideSphericalTriangle(v0, m01, m20, radius, maxAngle, vertices, indices, vertexMap);
  subdivideSphericalTriangle(m01, v1, m12, radius, maxAngle, vertices, indices, vertexMap);
  subdivideSphericalTriangle(m20, m12, v2, radius, maxAngle, vertices, indices, vertexMap);
  subdivideSphericalTriangle(m01, m12, m20, radius, maxAngle, vertices, indices, vertexMap);
}

// Add a vertex and return its index, reusing existing vertices
function addVertex(
  v: THREE.Vector3,
  vertices: number[],
  vertexMap: Map<string, number>
): number {
  // Create a key for the vertex (with some precision to handle floating point)
  const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;

  if (vertexMap.has(key)) {
    return vertexMap.get(key)!;
  }

  const index = vertices.length / 3;
  vertices.push(v.x, v.y, v.z);
  vertexMap.set(key, index);
  return index;
}

// Calculate centroid of points on sphere surface
function sphericalCentroid(points: THREE.Vector3[], radius: number): THREE.Vector3 {
  const sum = new THREE.Vector3();
  points.forEach(p => sum.add(p));
  return sum.normalize().multiplyScalar(radius);
}

// Create geometry from a polygon ring with proper spherical tessellation
export function createPolygonGeometry(
  ring: number[][],
  radius: number
): THREE.BufferGeometry | null {
  if (ring.length < 4) return null; // Need at least 3 points + closing point

  // Densify the ring to follow sphere surface
  const densePoints = densifyRing(ring, radius, 0.08); // ~4.5 degrees

  if (densePoints.length < 3) return null;

  // Calculate the spherical centroid
  const centroid = sphericalCentroid(densePoints, radius);

  const vertices: number[] = [];
  const indices: number[] = [];
  const vertexMap = new Map<string, number>();

  // Add centroid as first vertex
  const centroidIdx = addVertex(centroid, vertices, vertexMap);

  // Create fan triangulation from centroid, with subdivision for large triangles
  const maxAngle = 0.1; // ~5.7 degrees - maximum angle for triangle edges

  for (let i = 0; i < densePoints.length; i++) {
    const v1 = densePoints[i];
    const v2 = densePoints[(i + 1) % densePoints.length];

    // Subdivide each fan triangle to follow sphere curvature
    subdivideSphericalTriangle(centroid, v1, v2, radius, maxAngle, vertices, indices, vertexMap);
  }

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Convert a polygon ring to 3D points (for borders)
export function ringToPoints(
  ring: number[][],
  radius: number
): THREE.Vector3[] {
  return ring.map((coord) => coordToVector3(coord as [number, number], radius));
}

// Create line points with proper spherical interpolation for borders
export function createSphericalLinePoints(
  ring: number[][],
  radius: number
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const maxAngle = 0.05; // ~3 degrees

  for (let i = 0; i < ring.length - 1; i++) {
    const start = coordToVector3(ring[i] as [number, number], radius);
    const end = coordToVector3(ring[i + 1] as [number, number], radius);

    const angle = angularDistance(start, end);
    const segments = Math.max(1, Math.ceil(angle / maxAngle));

    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      const point = slerp(start, end, t, radius);
      points.push([point.x, point.y, point.z]);
    }
  }

  // Close the ring
  if (points.length > 0) {
    points.push(points[0]);
  }

  return points;
}
