import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  MeshDistortMaterial,
  GradientTexture,
  Float,
  PerspectiveCamera,
  Environment,
} from '@react-three/drei';
import * as THREE from 'three';

const ObsidianStone = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      Math.cos(t / 2) / 4,
      0.1
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      Math.sin(t / 4) / 4,
      0.1
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={2.5}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshDistortMaterial
          color="#1a0a2e"
          speed={2}
          distort={0.4}
          roughness={0.25}
          metalness={0.9}
          emissive="#2d1b4e"
          emissiveIntensity={0.4}
        >
          <GradientTexture
            stops={[0, 0.5, 1]}
            colors={['#000000', '#4a1d96', '#ff4d00']}
            size={1024}
          />
        </MeshDistortMaterial>
      </mesh>
    </Float>
  );
};

const TELEGRAM_BLUE = '#0088cc';
const TELEGRAM_BLUE_DARK = '#006699';

export const ObsidianBackground = () => {
  return (
    <div style={{ width: '100%', height: '33.33vh', minHeight: 200, background: TELEGRAM_BLUE }}>
      <Canvas gl={{ alpha: false }}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <color attach="background" args={[TELEGRAM_BLUE]} />
        <Environment preset="night" intensity={0.4} />
        <ambientLight intensity={0.5} />
        {/* Key: front-right, warm — lights the main visible faces */}
        <pointLight position={[4, 2, 6]} color="#ff4d00" intensity={2} distance={12} />
        {/* Fill: front-left, purple */}
        <pointLight position={[-3, 2, 6]} color="#7c3aed" intensity={1.5} distance={12} />
        {/* Rim: behind and below so edges separate from background */}
        <pointLight position={[-2, -1, -3]} color="#7c3aed" intensity={0.8} distance={10} />
        <ObsidianStone />
        <mesh scale={10}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial side={THREE.BackSide} color={TELEGRAM_BLUE_DARK} />
        </mesh>
      </Canvas>
    </div>
  );
};
