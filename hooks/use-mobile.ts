"use client";

import { useSyncExternalStore } from "react";

const mobileQuery = "(width < 768px)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(mobileQuery).matches, () => false);
}
