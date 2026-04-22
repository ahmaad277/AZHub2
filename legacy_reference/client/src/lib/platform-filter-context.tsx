import { createContext, useContext, useState, ReactNode } from "react";

interface PlatformFilterContextType {
  selectedPlatform: string;
  setSelectedPlatform: (platform: string) => void;
}

const PlatformFilterContext = createContext<PlatformFilterContextType | undefined>(undefined);

export function PlatformFilterProvider({ children }: { children: ReactNode }) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  return (
    <PlatformFilterContext.Provider value={{ selectedPlatform, setSelectedPlatform }}>
      {children}
    </PlatformFilterContext.Provider>
  );
}

export function usePlatformFilter() {
  const context = useContext(PlatformFilterContext);
  if (context === undefined) {
    throw new Error("usePlatformFilter must be used within a PlatformFilterProvider");
  }
  return context;
}
