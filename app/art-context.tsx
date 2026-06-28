import { createContext, useContext, useState, useCallback } from "react";

export interface ArtPiece {
  id: string;
  imageUrl: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  authorName: string;
}

interface ArtContextType {
  artworks: ArtPiece[];
  addArtwork: (art: ArtPiece) => void;
  updateArtwork: (id: string, updates: Partial<ArtPiece>) => void;
  removeArtwork: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const ArtContext = createContext<ArtContextType | null>(null);

export function ArtProvider({ children }: { children: React.ReactNode }) {
  const [artworks, setArtworks] = useState<ArtPiece[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addArtwork = useCallback((art: ArtPiece) => {
    setArtworks((prev) => [...prev, art]);
  }, []);

  const updateArtwork = useCallback((id: string, updates: Partial<ArtPiece>) => {
    setArtworks((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const removeArtwork = useCallback((id: string) => {
    setArtworks((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  return (
    <ArtContext.Provider
      value={{ artworks, addArtwork, updateArtwork, removeArtwork, selectedId, setSelectedId }}
    >
      {children}
    </ArtContext.Provider>
  );
}

export function useArt() {
  const ctx = useContext(ArtContext);
  if (!ctx) throw new Error("useArt must be used inside <ArtProvider>");
  return ctx;
}