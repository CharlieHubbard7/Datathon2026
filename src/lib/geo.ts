import * as THREE from 'three';
import earcut from 'earcut';

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
  const startNorm = start.clone().normalize();
  const endNorm = end.clone().normalize();

  let dot = startNorm.dot(endNorm);
  dot = Math.max(-1, Math.min(1, dot));

  const angle = Math.acos(dot);

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
function densifyRing(
  ring: number[][],
  radius: number,
  maxAngle: number = 0.05
): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];

  for (let i = 0; i < ring.length - 1; i++) {
    const start = coordToVector3(ring[i] as [number, number], radius);
    const end = coordToVector3(ring[i + 1] as [number, number], radius);

    const angle = angularDistance(start, end);
    const segments = Math.max(1, Math.ceil(angle / maxAngle));

    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      result.push(slerp(start, end, t, radius));
    }
  }

  return result;
}

// Project 3D points to 2D using a local tangent plane for triangulation
function projectToTangentPlane(
  points: THREE.Vector3[],
  center: THREE.Vector3
): { coords2D: number[]; basis: { u: THREE.Vector3; v: THREE.Vector3 } } {
  // Create a local coordinate system on the tangent plane
  const normal = center.clone().normalize();

  // Find a vector not parallel to normal
  const up = Math.abs(normal.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);

  // Create orthonormal basis on tangent plane
  const u = new THREE.Vector3().crossVectors(up, normal).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();

  // Project each point onto the tangent plane
  const coords2D: number[] = [];
  for (const p of points) {
    const relative = p.clone().sub(center);
    const x = relative.dot(u);
    const y = relative.dot(v);
    coords2D.push(x, y);
  }

  return { coords2D, basis: { u, v } };
}

// Subdivide a triangle and project vertices onto sphere
function subdivideTriangle(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  radius: number,
  maxAngle: number,
  vertices: number[],
  indices: number[],
  vertexMap: Map<string, number>
): void {
  const angle01 = angularDistance(v0, v1);
  const angle12 = angularDistance(v1, v2);
  const angle20 = angularDistance(v2, v0);
  const maxEdgeAngle = Math.max(angle01, angle12, angle20);

  if (maxEdgeAngle <= maxAngle) {
    // Triangle is small enough, add it with all vertices on sphere surface
    const i0 = addVertex(v0.clone().normalize().multiplyScalar(radius), vertices, vertexMap);
    const i1 = addVertex(v1.clone().normalize().multiplyScalar(radius), vertices, vertexMap);
    const i2 = addVertex(v2.clone().normalize().multiplyScalar(radius), vertices, vertexMap);
    indices.push(i0, i1, i2);
    return;
  }

  // Subdivide by adding midpoints on the sphere surface
  const m01 = slerp(v0, v1, 0.5, radius);
  const m12 = slerp(v1, v2, 0.5, radius);
  const m20 = slerp(v2, v0, 0.5, radius);

  subdivideTriangle(v0, m01, m20, radius, maxAngle, vertices, indices, vertexMap);
  subdivideTriangle(m01, v1, m12, radius, maxAngle, vertices, indices, vertexMap);
  subdivideTriangle(m20, m12, v2, radius, maxAngle, vertices, indices, vertexMap);
  subdivideTriangle(m01, m12, m20, radius, maxAngle, vertices, indices, vertexMap);
}

// Add a vertex and return its index, reusing existing vertices
function addVertex(
  v: THREE.Vector3,
  vertices: number[],
  vertexMap: Map<string, number>
): number {
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

// Create geometry from a polygon ring using earcut triangulation
export function createPolygonGeometry(
  ring: number[][],
  radius: number
): THREE.BufferGeometry | null {
  if (ring.length < 4) return null;

  // Densify the ring to follow sphere surface
  const densePoints = densifyRing(ring, radius, 0.06);

  if (densePoints.length < 3) return null;

  // Calculate the spherical centroid for the tangent plane
  const centroid = sphericalCentroid(densePoints, radius);

  // Project to 2D tangent plane for triangulation
  const { coords2D } = projectToTangentPlane(densePoints, centroid);

  // Triangulate using earcut (works on 2D coordinates)
  const triangleIndices = earcut(coords2D);

  if (triangleIndices.length === 0) return null;

  // Now create the 3D geometry with subdivision for sphere curvature
  const vertices: number[] = [];
  const indices: number[] = [];
  const vertexMap = new Map<string, number>();

  // Process each triangle from earcut
  const maxAngle = 0.08; // ~4.5 degrees for smooth curvature

  for (let i = 0; i < triangleIndices.length; i += 3) {
    const v0 = densePoints[triangleIndices[i]];
    const v1 = densePoints[triangleIndices[i + 1]];
    const v2 = densePoints[triangleIndices[i + 2]];

    // Subdivide each triangle to follow sphere curvature
    subdivideTriangle(v0, v1, v2, radius, maxAngle, vertices, indices, vertexMap);
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
  const maxAngle = 0.05;

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

  if (points.length > 0) {
    points.push(points[0]);
  }

  return points;
}
