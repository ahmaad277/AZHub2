import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { clearCache } from "@/lib/queryClient";

const DATA_ENTRY_TOKEN_KEY = "azfinance-data-entry-token";

interface DataEntryContextType {
  isDataEntryMode: boolean;
  dataEntryToken: string | null;
  setDataEntryMode: (token: string) => void;
  clearDataEntryMode: () => void;
  isInitializing: boolean;
}

const DataEntryContext = createContext<DataEntryContextType | undefined>(undefined);

export function DataEntryProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [dataEntryToken, setDataEntryToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(DATA_ENTRY_TOKEN_KEY);
    const isOnDataEntryPage = location.startsWith("/data-entry/");
    
    if (storedToken && !isOnDataEntryPage) {
      setLocation(`/data-entry/${storedToken}`);
      setDataEntryToken(storedToken);
      setIsInitializing(false);
      return;
    }
    
    if (isOnDataEntryPage) {
      const tokenFromUrlRaw = location.split("/data-entry/")[1];
      const tokenFromUrl = tokenFromUrlRaw ? tokenFromUrlRaw.split("?")[0].split("#")[0] : "";
      if (tokenFromUrl) {
        setDataEntryToken(tokenFromUrl);
        setIsInitializing(false);
        return;
      }
    }
    
    if (storedToken) {
      setDataEntryToken(storedToken);
    }
    
    setIsInitializing(false);
  }, [location, setLocation]);

  const setDataEntryMode = (token: string) => {
    if (dataEntryToken !== token) {
      clearCache();
    }
    localStorage.setItem(DATA_ENTRY_TOKEN_KEY, token);
    setDataEntryToken(token);
  };

  const clearDataEntryMode = () => {
    clearCache();
    localStorage.removeItem(DATA_ENTRY_TOKEN_KEY);
    setDataEntryToken(null);
  };

  return (
    <DataEntryContext.Provider
      value={{
        isDataEntryMode: !!dataEntryToken,
        dataEntryToken,
        setDataEntryMode,
        clearDataEntryMode,
        isInitializing,
      }}
    >
      {children}
    </DataEntryContext.Provider>
  );
}

export function useDataEntry() {
  const context = useContext(DataEntryContext);
  if (context === undefined) {
    throw new Error("useDataEntry must be used within a DataEntryProvider");
  }
  return context;
}
