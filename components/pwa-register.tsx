"use client";

import * as React from "react";

export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // SW intentionally disabled for performance; clean up existing registrations.
    const cleanup = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (reg) => {
            if (reg.active?.scriptURL?.includes("/sw.js")) {
              await reg.unregister();
            }
          }),
        );
      } catch (err) {
        console.warn("SW cleanup failed", err);
      }
    };

    cleanup();
  }, []);

  return null;
}
