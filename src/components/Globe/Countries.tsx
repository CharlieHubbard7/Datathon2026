'use client';

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { getScoreColor } from '@/lib/colors';
import {
  GeoJSONCollection,
  GeoJSONFeature,
  createPolygonGeometry,
  createSphericalLinePoints,
} from '@/lib/geo';

// Helper to check if a point on the globe is facing the camera
function isFacingCamera(point: THREE.Vector3, cameraPosition: THREE.Vector3): boolean {
  // Normalize both vectors (point is on globe surface, camera is at some distance)
  const pointDir = point.clone().normalize();
  const cameraDir = cameraPosition.clone().normalize();
  // If dot product is positive, the point is on the hemisphere facing the camera
  return pointDir.dot(cameraDir) > 0;
}

const COUNTRY_RADIUS = 2.005; // Slightly above earth surface
const BORDER_RADIUS = 2.008; // Borders above countries

interface CountryMeshProps {
  feature: GeoJSONFeature;
  color: string;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function CountryMesh({
  feature,
  color,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: CountryMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [geometries, setGeometries] = useState<THREE.BufferGeometry[]>([]);
  const [borderPoints, setBorderPoints] = useState<[number, number, number][][]>([]);
  const { camera } = useThree();

  // Generate geometries from GeoJSON
  useEffect(() => {
    const geos: THREE.BufferGeometry[] = [];
    const borders: [number, number, number][][] = [];

    const processRing = (ring: number[][]) => {
      const geo = createPolygonGeometry(ring, COUNTRY_RADIUS);
      if (geo) geos.push(geo);

      const linePoints = createSphericalLinePoints(ring, BORDER_RADIUS);
      if (linePoints.length > 2) {
        borders.push(linePoints);
      }
    };

    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates as number[][][];
      coords.forEach((ring) => processRing(ring));
    } else if (feature.geometry.type === 'MultiPolygon') {
      const coords = feature.geometry.coordinates as number[][][][];
      coords.forEach((polygon) => {
        polygon.forEach((ring) => processRing(ring));
      });
    }

    setGeometries(geos);
    setBorderPoints(borders);

    // Cleanup
    return () => {
      geos.forEach((g) => g.dispose());
    };
  }, [feature]);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      // Only trigger hover if the country is on the front of the globe (facing camera)
      if (e.point && !isFacingCamera(e.point, camera.position)) {
        return;
      }
      onHover(true);
      document.body.style.cursor = 'pointer';
    },
    [onHover, camera]
  );

  const handlePointerOut = useCallback(() => {
    onHover(false);
    document.body.style.cursor = 'default';
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      // Only trigger click if the country is on the front of the globe (facing camera)
      if (e.point && !isFacingCamera(e.point, camera.position)) {
        return;
      }
      onClick();
    },
    [onClick, camera]
  );

  // Determine colors
  const fillColor = useMemo(() => new THREE.Color(color), [color]);
  const hoverColor = useMemo(
    () => new THREE.Color(color).multiplyScalar(1.3),
    [color]
  );
  const borderColor = isSelected ? '#ffffff' : '#888888';
  const borderOpacity = isSelected ? 1 : 0.6;

  return (
    <group ref={groupRef}>
      {/* Country fill */}
      {geometries.map((geo, idx) => (
        <mesh
          key={`fill-${idx}`}
          geometry={geo}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <meshBasicMaterial
            color={isHovered || isSelected ? hoverColor : fillColor}
            transparent
            opacity={isSelected ? 1 : 0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Country borders */}
      {borderPoints.map((points, idx) => (
        <Line
          key={`border-${idx}`}
          points={points}
          color={borderColor}
          lineWidth={isSelected ? 2 : 1}
          transparent
          opacity={borderOpacity}
        />
      ))}
    </group>
  );
}

// Countries without data - render in neutral gray
function NeutralCountry({ feature }: { feature: GeoJSONFeature }) {
  const [geometries, setGeometries] = useState<THREE.BufferGeometry[]>([]);
  const [borderPoints, setBorderPoints] = useState<[number, number, number][][]>([]);

  useEffect(() => {
    const geos: THREE.BufferGeometry[] = [];
    const borders: [number, number, number][][] = [];

    const processRing = (ring: number[][]) => {
      const geo = createPolygonGeometry(ring, COUNTRY_RADIUS);
      if (geo) geos.push(geo);

      const linePoints = createSphericalLinePoints(ring, BORDER_RADIUS);
      if (linePoints.length > 2) {
        borders.push(linePoints);
      }
    };

    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates as number[][][];
      coords.forEach((ring) => processRing(ring));
    } else if (feature.geometry.type === 'MultiPolygon') {
      const coords = feature.geometry.coordinates as number[][][][];
      coords.forEach((polygon) => {
        polygon.forEach((ring) => processRing(ring));
      });
    }

    setGeometries(geos);
    setBorderPoints(borders);

    return () => {
      geos.forEach((g) => g.dispose());
    };
  }, [feature]);

  return (
    <group>
      {geometries.map((geo, idx) => (
        <mesh key={`neutral-fill-${idx}`} geometry={geo}>
          <meshBasicMaterial
            color="#79d"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {borderPoints.map((points, idx) => (
        <Line
          key={`neutral-border-${idx}`}
          points={points}
          color="#3a4a5a"
          lineWidth={0.5}
          transparent
          opacity={0.4}
        />
      ))}
    </group>
  );
}

interface CountriesProps {
  visible?: boolean;
}

export function Countries({ visible = true }: CountriesProps) {
  const { countries, selectedCountry, hoveredCountry, selectCountry, setHoveredCountry } =
    useStore();
  const [geoData, setGeoData] = useState<GeoJSONCollection | null>(null);

  // Load GeoJSON data
  useEffect(() => {
    fetch('/data/countries-geo.json')
      .then((res) => res.json())
      .then((data: GeoJSONCollection) => setGeoData(data))
      .catch((err) => console.error('Failed to load GeoJSON:', err));
  }, []);

  const handleCountryClick = useCallback(
    (iso3: string) => {
      if (countries[iso3]) {
        selectCountry(iso3);
      }
    },
    [countries, selectCountry]
  );

  const handleCountryHover = useCallback(
    (iso3: string, hovered: boolean) => {
      if (countries[iso3]) {
        setHoveredCountry(hovered ? iso3 : null);
      }
    },
    [countries, setHoveredCountry]
  );

  if (!visible || !geoData) return null;

  // Separate countries with data from those without
  const countriesWithData = geoData.features.filter(
    (f) => countries[f.properties.ISO_A3]
  );
  const countriesWithoutData = geoData.features.filter(
    (f) => !countries[f.properties.ISO_A3]
  );

  return (
    <group>
      {/* Render countries without data first (background) */}
      {countriesWithoutData.map((feature) => (
        <NeutralCountry
          key={`neutral-${feature.properties.ISO_A3 || feature.properties.NAME}`}
          feature={feature}
        />
      ))}

      {/* Render countries with data (with heatmap colors) */}
      {countriesWithData.map((feature) => {
        const iso3 = feature.properties.ISO_A3;
        const country = countries[iso3];
        const color = getScoreColor(country.need_score);

        return (
          <CountryMesh
            key={iso3}
            feature={feature}
            color={color}
            isSelected={selectedCountry === iso3}
            isHovered={hoveredCountry === iso3}
            onClick={() => handleCountryClick(iso3)}
            onHover={(hovered) => handleCountryHover(iso3, hovered)}
          />
        );
      })}
    </group>
  );
}
