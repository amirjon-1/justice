/// <reference types="@react-three/fiber" />

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";

interface GlobeHeroProps {
  onCitySelect?: (city: string) => void;
}

const CITIES = [
  { name: "New York City", lat: 40.7128,  lon: -74.006,   delay: 0 },
  { name: "Chicago",       lat: 41.8781,  lon: -87.6298,  delay: 0.6 },
  { name: "Los Angeles",   lat: 34.0522,  lon: -118.2437, delay: 1.2 },
];

const GLOBE_RADIUS = 2;
const MARKER_RADIUS = 2.08;

function toXYZ(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── Sprite label factory ─────────────────────────────────────────────────── */

function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;

  // Background pill
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 192, 40, 20);
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(4, 4, 192, 40, 20);
  ctx.stroke();

  // Text
  ctx.fillStyle = "white";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 100, 24);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.7, 0.17, 1);
  return sprite;
}

/* ── Globe mesh with real Earth texture ───────────────────────────────────── */

function GlobeMesh() {
  const texture = useLoader(
    TextureLoader,
    "https://unpkg.com/three-globe/example/img/earth-day.jpg"
  );
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/* ── Atmosphere rim ───────────────────────────────────────────────────────── */

function Atmosphere() {
  return (
    <mesh scale={1.04}>
      <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
      <meshBasicMaterial
        color="#87CEEB"
        side={THREE.BackSide}
        transparent
        opacity={0.08}
      />
    </mesh>
  );
}

/* ── City marker ──────────────────────────────────────────────────────────── */

interface MarkerProps {
  city: typeof CITIES[number];
  onClick: () => void;
}

function CityMarker({ city, onClick }: MarkerProps) {
  const ringRef  = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  const pos = toXYZ(city.lat, city.lon, MARKER_RADIUS);
  const dir = pos.clone().normalize();

  // Rotate cone so Y-up aligns with outward surface normal
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir
  );

  // Cone base sits on the surface, tip points inward
  const coneOffset = dir.clone().multiplyScalar(0.075);

  // Label: 0.35 units beyond the surface, relative to the group (group is at pos = dir*2)
  const labelOffset = dir.clone().multiplyScalar(0.35);

  const sprite = useMemo(() => createTextSprite(city.name), [city.name]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + city.delay;
    if (ringRef.current) {
      const cycle = (t % 2) / 2;
      const s = 1 + 0.6 * Math.sin(cycle * Math.PI);
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        1 - 0.8 * Math.sin(cycle * Math.PI);
    }
    if (groupRef.current) {
      const target = hovered ? 1.3 : 1.0;
      const cur = groupRef.current.scale.x;
      const next = cur + (target - cur) * 0.12;
      groupRef.current.scale.setScalar(next);
    }
  });

  return (
    <group
      ref={groupRef}
      position={pos}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Cone pin — tip points toward globe center */}
      <mesh position={coneOffset} quaternion={quaternion}>
        <coneGeometry args={[0.04, 0.15, 8]} />
        <meshStandardMaterial
          color="#F59E0B"
          emissive="#F59E0B"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={ringRef} quaternion={quaternion}>
        <torusGeometry args={[0.06, 0.008, 8, 32]} />
        <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
      </mesh>

      {/* Sprite label — always faces camera, no DOM overflow */}
      <primitive
        object={sprite}
        position={[labelOffset.x, labelOffset.y, labelOffset.z]}
      />
    </group>
  );
}

/* ── Scene ────────────────────────────────────────────────────────────────── */

function GlobeScene({ onCitySelect }: GlobeHeroProps) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="white" />
      <pointLight position={[0, 0, 5]} intensity={0.3} color="white" />
      <group rotation={[-0.3, Math.PI * 1.85, 0]}>
        <GlobeMesh />
        <Atmosphere />
        {CITIES.map((city) => (
          <CityMarker
            key={city.name}
            city={city}
            onClick={() => onCitySelect?.(city.name)}
          />
        ))}
      </group>
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.5}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.35}
        maxPolarAngle={Math.PI * 0.65}
      />
    </>
  );
}

/* ── Export ───────────────────────────────────────────────────────────────── */

const GlobeHero: React.FC<GlobeHeroProps> = ({ onCitySelect }) => (
  <div
    style={{
      width: 500,
      height: 500,
      position: "relative",
      filter: "drop-shadow(0 20px 60px rgba(26,86,219,0.15))",
    }}
  >
    <Canvas
      camera={{ position: [0, 0.8, 5.2], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <GlobeScene onCitySelect={onCitySelect} />
    </Canvas>
  </div>
);

export default GlobeHero;
