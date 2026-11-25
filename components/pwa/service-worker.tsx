"use client";

import { useEffect } from "react";

/** Registers the service worker, which shows a page of ours when there's no connection. */
export function ServiceWorker() {
  useEffect(() => {
    // Browsers offer service workers only over HTTPS or on localhost.
    navigator.serviceWorker?.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
