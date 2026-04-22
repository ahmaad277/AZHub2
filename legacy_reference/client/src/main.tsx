import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const APP_VERSION = '1.0.3';
const DEV_SW_RESET_KEY = "azfinance-dev-sw-reset";

if (!import.meta.env.PROD && "serviceWorker" in navigator) {
  // In dev, stale SW/caches can mix old/new chunks and break React hooks runtime.
  void (async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    const hasController = Boolean(navigator.serviceWorker.controller);
    const resetDone = sessionStorage.getItem(DEV_SW_RESET_KEY) === "1";
    if (hasController && !resetDone) {
      sessionStorage.setItem(DEV_SW_RESET_KEY, "1");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(DEV_SW_RESET_KEY);
  })();
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New version available, updating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] New service worker activated, reloading...');
        window.location.reload();
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.update();
      
      console.log(`[App] Version ${APP_VERSION} loaded`);
    } catch (error) {
      console.log('[App] SW registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
