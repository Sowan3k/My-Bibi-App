"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (production only). */
export default function RegisterSW() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA is progressive — the app works fine without it
    });
  }, []);

  return null;
}
