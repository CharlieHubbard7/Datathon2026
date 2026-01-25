'use client';

import { Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Starfield } from './Starfield';
import { Earth } from './Earth';
import { Countries } from './Countries';
import { useStore } from '@/store/useStore';

// Camera controller for smooth animations to selected countries
function CameraController() {
  const { camera } = useThree();
  const { selectedCountry, countries } = useStore();
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 6));
  const isAnimating = useRef(false);

  // Country positions for camera targeting
  const COUNTRY_POSITIONS: Record<string, { lat: number; lon: number }> = {
    AFG: { lat: 33.9391, lon: 67.7100 },
    YEM: { lat: 15.5527, lon: 48.5164 },
    SSD: { lat: 6.8770, lon: 31.3070 },
    SDN: { lat: 15.5007, lon: 32.5599 },
    SOM: { lat: 5.1521, lon: 46.1996 },
    UKR: { lat: 48.3794, lon: 31.1656 },
    HTI: { lat: 18.9712, lon: -72.2852 },
    COD: { lat: -4.0383, lon: 21.7587 },
    ETH: { lat: 9.1450, lon: 40.4897 },
    NGA: { lat: 9.0820, lon: 8.6753 },
    SYR: { lat: 34.8021, lon: 38.9968 },
    MMR: { lat: 21.9162, lon: 95.9560 },
  };

  const latLonToVector3 = useCallback((lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, []);

  useEffect(() => {
    if (selectedCountry && COUNTRY_POSITIONS[selectedCountry]) {
      const pos = COUNTRY_POSITIONS[selectedCountry];
      const target = latLonToVector3(pos.lat, pos.lon, 5);
      targetRef.current = target;
      isAnimating.current = true;
    }
  }, [selectedCountry, latLonToVector3]);

  useFrame(() => {
    if (isAnimating.current) {
      camera.position.lerp(targetRef.current, 0.02);
      camera.lookAt(0, 0, 0);

      if (camera.position.distanceTo(targetRef.current) < 0.1) {
        isAnimating.current = false;
      }
    }
  });

  return null;
}

// Auto-rotate controller
function AutoRotate() {
  const controlsRef = useRef<any>(null);
  const { selectedCountry, hoveredCountry } = useStore();
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const isIdle = useRef(true);

  useEffect(() => {
    // Reset idle timer on interaction
    const resetIdle = () => {
      isIdle.current = false;
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      idleTimer.current = setTimeout(() => {
        isIdle.current = true;
      }, 5000); // 5 seconds of inactivity
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('touchstart', resetIdle);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    };
  }, []);

  // Disable auto-rotate when country is selected or hovered
  const shouldRotate = isIdle.current && !selectedCountry && !hoveredCountry;

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={3}
      maxDistance={15}
      autoRotate={shouldRotate}
      autoRotateSpeed={0.3}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
}

function Scene() {
  const { heatmapEnabled } = useStore();

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
      <CameraController />
      <AutoRotate />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />

      {/* Scene elements */}
      <Starfield />
      <Earth autoRotate={false} />
      <Countries visible={heatmapEnabled} />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#1a3a5c" wireframe />
    </mesh>
  );
}

export function Globe() {
  return (
    <div className="globe-canvas">
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
