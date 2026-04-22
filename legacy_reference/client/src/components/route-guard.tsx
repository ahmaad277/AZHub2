import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDataEntry } from "@/lib/data-entry-context";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const [location, setLocation] = useLocation();
  const { isDataEntryMode, dataEntryToken } = useDataEntry();

  useEffect(() => {
    if (isDataEntryMode && dataEntryToken) {
      const allowedPath = `/data-entry/${dataEntryToken}`;
      
      if (location !== allowedPath) {
        setLocation(allowedPath);
      }
    }
  }, [location, isDataEntryMode, dataEntryToken, setLocation]);

  return <>{children}</>;
}
