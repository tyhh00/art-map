import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera, Text, Html } from "@react-three/drei";
import { useArt, type ArtPiece } from "../art-context";
import * as THREE from "three";
import { Upload, Trash2, RotateCw, ZoomIn, ZoomOut, Move, Info, ChevronDown, X, Heart } from "lucide-react";

// --- 3D Art Piece Component ---
function ArtPiece3D({
  piece,
  isSelected,
  onSelect,
  onDrag,
}: {
  piece: ArtPiece;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (id: string, x: number, z: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersection = useRef(new THREE.Vector3());

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    gl.domElement.style.cursor = "grabbing";
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    gl.domElement.style.cursor = hovered ? "grab" : "auto";
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging || !meshRef.current) return;
    e.stopPropagation();
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera({ x, y }, camera);
    if (raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
      onDrag(piece.id, intersection.current.x, intersection.current.z);
    }
  };

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, piece.id]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      isDragging ? piece.rotationY + 0.3 : piece.rotationY,
      delta * 8
    );
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      0.3 + Math.sin(Date.now() * 0.001) * 0.05,
      delta * 4
    );
  });

  return (
    <group position={[piece.x, piece.y, piece.z]}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerOver={() => { setHovered(true); if (!isDragging) gl.domElement.style.cursor = "grab"; }}
        onPointerOut={() => { setHovered(false); if (!isDragging) gl.domElement.style.cursor = "auto"; }}
        scale={piece.scale}
      >
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial
          map={undefined}
          color={hovered || isSelected ? "#f0e6d3" : "#fff8ee"}
          side={THREE.DoubleSide}
          emissive={isSelected ? "#ff8c00" : hovered ? "#ff6b00" : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : hovered ? 0.08 : 0}
        />
        <Html
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <img
            src={piece.imageUrl}
            alt={piece.name}
            style={{
              width: "128px",
              height: "128px",
              objectFit: "cover",
              borderRadius: "4px",
              display: "block",
              border: isSelected ? "2px solid #ff8c00" : "2px solid transparent",
              boxShadow: isSelected ? "0 0 16px rgba(255,140,0,0.5)" : "0 4px 12px rgba(0,0,0,0.3)",
              transition: "all 0.2s",
            }}
          />
        </Html>
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.2, 32]} />
          <meshBasicMaterial color="#ff8c00" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Author label */}
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.18}
        color="#f5e6d3"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.ttf"
        maxWidth={2}
      >
        {piece.authorName}
      </Text>
    </group>
  );
}

// --- Terrain / Map ---
function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      const originalY = positions.getY.bind(positions);
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const y =
          Math.sin(x * 0.3 + clock.getElapsedTime() * 0.1) * 0.3 +
          Math.cos(z * 0.25) * 0.3 +
          Math.sin((x + z) * 0.15) * 0.4;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40, 80, 80]} />
      <meshStandardMaterial
        color="#1a0a05"
        wireframe={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

// --- Grid overlay ---
function Grid() {
  return (
    <gridHelper
      args={[40, 40, "#3d1a0a", "#2a0f05"]}
      position={[0, 0.01, 0]}
    />
  );
}

// --- Floating particles ---
function Particles() {
  const count = 200;
  const positions = useRef(new Float32Array(count * 3));
  for (let i = 0; i < count; i++) {
    positions.current[i * 3] = (Math.random() - 0.5) * 30;
    positions.current[i * 3 + 1] = Math.random() * 8 + 1;
    positions.current[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#ff8c42" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// --- Scene ---
function Scene({ onDeselect }: { onDeselect: () => void }) {
  const { artworks, updateArtwork, selectedId, setSelectedId } = useArt();

  const handleDrag = useCallback((id: string, x: number, z: number) => {
    updateArtwork(id, { x: Math.max(-18, Math.min(18, x)), z: Math.max(-18, Math.min(18, z)) });
  }, [updateArtwork]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 12, 18]} fov={55} />
      <OrbitControls
        enablePan
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={35}
        target={[0, 0, 0]}
      />

      <ambientLight intensity={0.3} color="#4a2c1a" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        color="#ffb347"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[-8, 5, -8]} intensity={0.8} color="#ff6b00" />
      <pointLight position={[8, 3, 8]} intensity={0.5} color="#ff8c42" />

      <fog attach="fog" args={["#0d0500", 20, 55]} />

      <Terrain />
      <Grid />
      <Particles />

      <ContactShadows
        position={[0, -0.05, 0]}
        opacity={0.6}
        scale={40}
        blur={2}
        far={10}
        color="#1a0a00"
      />

      {artworks.map((piece) => (
        <ArtPiece3D
          key={piece.id}
          piece={piece}
          isSelected={selectedId === piece.id}
          onSelect={() => setSelectedId(piece.id)}
          onDrag={handleDrag}
        />
      ))}

      <Environment preset="sunset" background={false} />

      {/* Click on ground to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        onPointerDown={(e) => { e.stopPropagation(); onDeselect(); }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

// --- Upload Modal ---
function UploadModal({ onClose }: { onClose: () => void }) {
  const { addArtwork } = useArt();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setImage(url);
    setPreview(url);
    if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleSubmit = () => {
    if (!image || !name.trim() || !author.trim()) return;
    const id = crypto.randomUUID();
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 6;
    addArtwork({
      id,
      imageUrl: image,
      name: name.trim(),
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
      rotationY: Math.random() * Math.PI * 2,
      scale: 1,
      authorName: author.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#1a0a05] border border-[#3d1a0a] rounded-2xl shadow-2xl shadow-orange-900/40 overflow-hidden">
        <div className="bg-gradient-to-r from-[#2a1005] to-[#1a0a05] px-6 py-4 flex items-center justify-between border-b border-[#3d1a0a]">
          <h2 className="text-lg font-bold text-[#f5e6d3] flex items-center gap-2">
            <Upload size={18} className="text-orange-400" />
            Upload Your Artwork
          </h2>
          <button onClick={onClose} className="text-[#8b5a2b] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              preview
                ? "border-orange-500 bg-orange-900/10"
                : "border-[#3d1a0a] hover:border-orange-600 bg-[#0d0500]/50"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg shadow-lg" />
                <div className="mt-3 text-sm text-orange-400">Click or drop to change image</div>
              </div>
            ) : (
              <>
                <Upload size={40} className="mx-auto mb-3 text-[#5a3010]" />
                <p className="text-[#a0714a] text-sm font-medium">Drag & drop your drawing here</p>
                <p className="text-[#5a3010] text-xs mt-1">or click to browse · PNG, JPG, WEBP</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a0714a] uppercase tracking-wider mb-1.5">Artwork Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset Valley"
              className="w-full bg-[#0d0500] border border-[#3d1a0a] rounded-lg px-3 py-2.5 text-[#f5e6d3] placeholder-[#5a3010] text-sm focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a0714a] uppercase tracking-wider mb-1.5">Your Name</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. ArtistJane"
              className="w-full bg-[#0d0500] border border-[#3d1a0a] rounded-lg px-3 py-2.5 text-[#f5e6d3] placeholder-[#5a3010] text-sm focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition-colors"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!image || !name.trim() || !author.trim()}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-orange-900/40 disabled:shadow-none disabled:cursor-not-allowed text-sm tracking-wide"
          >
            Place on Map
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Control Panel ---
function ControlPanel() {
  const { selectedId, artworks, updateArtwork, removeArtwork, setSelectedId } = useArt();
  const selected = artworks.find((a) => a.id === selectedId);
  const [showInfo, setShowInfo] = useState(false);

  if (!selected) return null;

  return (
    <div className="absolute bottom-6 right-6 w-72 bg-[#1a0a05]/95 backdrop-blur-md border border-[#3d1a0a] rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#2a1005] to-[#1a0a05] px-4 py-3 flex items-center justify-between border-b border-[#3d1a0a]">
        <span className="text-sm font-bold text-[#f5e6d3] truncate">{selected.name}</span>
        <button onClick={() => setSelectedId(null)} className="text-[#8b5a2b] hover:text-white ml-2 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xs text-[#8b5a2b] mb-2">
          by <span className="text-orange-400 font-medium">{selected.authorName}</span>
        </div>

        <div>
          <div className="flex justify-between text-xs text-[#8b5a2b] mb-1">
            <span>Rotation</span>
            <span className="text-[#f5e6d3]">{Math.round(selected.rotationY * 180 / Math.PI)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={selected.rotationY * 180 / Math.PI}
            onChange={(e) => updateArtwork(selected.id, { rotationY: (Number(e.target.value)) * Math.PI / 180 })}
            className="w-full accent-orange-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-[#8b5a2b] mb-1">
            <span>Size</span>
            <span className="text-[#f5e6d3]">{Math.round(selected.scale * 100)}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={200}
            value={selected.scale * 100}
            onChange={(e) => updateArtwork(selected.id, { scale: Number(e.target.value) / 100 })}
            className="w-full accent-orange-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#2a1005] hover:bg-[#3d1a0a] text-[#f5e6d3] text-xs font-medium transition-colors border border-[#3d1a0a]"
          >
            <Info size={12} /> Details
          </button>
          <button
            onClick={() => removeArtwork(selected.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-medium transition-colors border border-red-900/30"
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>

        {showInfo && (
          <div className="mt-3 p-3 bg-[#0d0500] rounded-lg text-xs text-[#8b5a2b] space-y-1 border border-[#2a0f05]">
            <div className="flex justify-between"><span>Position X</span><span className="text-[#f5e6d3]">{selected.x.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Position Z</span><span className="text-[#f5e6d3]">{selected.z.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>ID</span><span className="text-[#f5e6d3] font-mono text-[10px]">{selected.id.slice(0, 8)}…</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Home Page ---
export default function Home() {
  const { artworks } = useArt();
  const [showUpload, setShowUpload] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="w-full h-screen bg-[#0d0500] overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0d0500] via-[#0d0500]/80 to-transparent">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-600 tracking-tight">
            Art Map
          </h1>
          <p className="text-xs text-[#8b5a2b] mt-0.5">
            {artworks.length} {artworks.length === 1 ? "artwork" : "artworks"} on the canvas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a0a05] border border-[#3d1a0a] text-[#a0714a] hover:text-[#f5e6d3] hover:border-orange-700 text-xs transition-all"
          >
            <Info size={14} /> How to
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-900/50 transition-all duration-200 active:scale-95"
          >
            <Upload size={16} />
            Upload Art
          </button>
        </div>
      </div>

      {/* Instructions panel */}
      {showInstructions && (
        <div className="absolute top-20 left-6 z-20 w-64 bg-[#1a0a05]/95 backdrop-blur-md border border-[#3d1a0a] rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#2a1005] to-[#1a0a05] px-4 py-3 flex items-center justify-between border-b border-[#3d1a0a]">
            <span className="text-sm font-bold text-[#f5e6d3]">How to Use</span>
            <button onClick={() => setShowInstructions(false)} className="text-[#8b5a2b] hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-3 text-xs text-[#a0714a]">
            {[
              { icon: "1", text: "Click Upload Art to add your drawing" },
              { icon: "2", text: "Your art appears on the 3D map" },
              { icon: "3", text: "Click & drag art to reposition it" },
              { icon: "4", text: "Click art to adjust rotation & size" },
              { icon: "5", text: "Scroll to zoom, drag background to orbit" },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-600/30 border border-orange-600/50 flex items-center justify-center text-orange-400 font-bold text-[10px] flex-shrink-0 mt-0.5">
                  {icon}
                </div>
                <span className="leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: "linear-gradient(to bottom, #0d0500 0%, #1a0805 50%, #2a1005 100%)" }}
        onPointerMissed={() => {
          const { setSelectedId } = useArt();
          setSelectedId(null);
        }}
      >
        <Scene onDeselect={() => useArt().setSelectedId(null)} />
      </Canvas>

      {/* Control panel */}
      <ControlPanel />

      {/* Upload modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {/* Empty state hint */}
      {artworks.length === 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
          <div className="bg-[#1a0a05]/90 backdrop-blur-sm border border-[#3d1a0a] rounded-2xl px-6 py-4 shadow-2xl">
            <p className="text-[#a0714a] text-sm font-medium">Your canvas is empty</p>
            <p className="text-[#5a3010] text-xs mt-1">Upload your first artwork to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}