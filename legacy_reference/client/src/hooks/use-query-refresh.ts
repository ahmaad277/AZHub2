import { useEffect, useMemo, useState } from "react";

interface QueryRefreshOptionsParams {
  isEditing: boolean;
  intervalMs?: number;
}

export interface QueryRefreshOptions {
  refetchInterval: number | false;
  refetchOnWindowFocus: boolean;
}

function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
}

export function useEditingFlow(...flags: boolean[]): boolean {
  return flags.some((flag) => flag);
}

export function useQueryRefreshOptions({
  isEditing,
  intervalMs = 90000,
}: QueryRefreshOptionsParams): QueryRefreshOptions {
  const isVisible = useDocumentVisibility();
  const shouldPause = isEditing || !isVisible;

  return useMemo<QueryRefreshOptions>(
    () => ({
      refetchInterval: shouldPause ? false : intervalMs,
      refetchOnWindowFocus: !shouldPause,
    }),
    [shouldPause, intervalMs]
  );
}
