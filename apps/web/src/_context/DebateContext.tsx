// src/context/DebateContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";

type DebateData = {
  roomId: string;
  topic: string;
  name: string;
  position: "for" | "against";
  duration: number | null;
};

type DebateContextType = {
  debate: DebateData | null;
  setDebate: (data: DebateData) => void;
};

const DebateContext = createContext<DebateContextType | undefined>(undefined);

export function DebateProvider({ children }: { children: ReactNode }) {
  const [debate, setDebate] = useState<DebateData | null>(null);

  return (
    <DebateContext.Provider value={{ debate, setDebate }}>
      {children}
    </DebateContext.Provider>
  );
}

export function useDebate() {
  const context = useContext(DebateContext);
  if (!context) {
    throw new Error("useDebate must be used within a DebateProvider");
  }
  return context;
}
