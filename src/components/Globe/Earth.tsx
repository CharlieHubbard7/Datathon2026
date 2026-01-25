'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface EarthProps {
  radius?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export function Earth({
  radius = 1.98,
  autoRotate = true,
  autoRotateSpeed = 0.1,
}: EarthProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Create procedural earth texture (fallback if no texture loaded)
  const earthMaterial = useMemo(() => {
    // Create canvas for procedural texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Ocean base
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#000033');
    oceanGradient.addColorStop(0.5, '#000033');
    oceanGradient.addColorStop(1, '#000033');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some noise for depth
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return new THREE.MeshPhongMaterial({
      map: texture,
      bumpScale: 0.05,
      specular: new THREE.Color('#333333'),
      shininess: 5,
    });
  }, []);

  // Atmosphere glow
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
  }, []);

  useFrame((state, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * autoRotateSpeed;
    }
    if (autoRotate && cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * autoRotateSpeed * 1.1;
    }
  });

  return (
    <group>
      {/* Main Earth sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.1, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.01, 64, 64]} />
        <meshPhongMaterial
          transparent
          opacity={0.15}
          color="#ffffff"
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
