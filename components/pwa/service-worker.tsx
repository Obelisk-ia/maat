"use client";

import { useEffect } from "react";

/** Registers the service worker, which shows notifications and our "no connection" page. */
export function ServiceWorker() {
  useEffect(() => {
    // Browsers offer service workers only over HTTPS or on localhost.
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});

    // A tapped notification, passed on by the service worker to a window already open.
    const onMessage = (event: MessageEvent) => {
      const url: unknown = event.data?.type === "maat:open" ? event.data.url : null;
      if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return;
      // A page that can show it cancels the event; otherwise the window goes there.
      if (window.dispatchEvent(new CustomEvent("maat:open", { detail: url, cancelable: true }))) {
        window.location.assign(url);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return null;
}
