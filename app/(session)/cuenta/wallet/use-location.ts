"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { distanceMeters, type Coordinates } from "@/lib/geo";

export type LocationState = "loading" | "unsupported" | "ask" | "on" | "off" | "blocked";

export type CustomerLocation = {
  state: LocationState;
  busy: boolean;
  error: string;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};

const STORAGE_KEY = "maat:location:v1";
const REPORT_INTERVAL_MS = 2 * 60_000;
const MOVE_THRESHOLD_METERS = 50;

function readPref(): "on" | "off" | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

function writePref(value: "on" | "off") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private browsing or full storage.
  }
}

export function useLocation(): CustomerLocation {
  const { isAuthenticated } = useConvexAuth();
  const report = useMutation(api.clients.notifications.reportLocation);
  const clear = useMutation(api.clients.notifications.clearLocation);

  const [state, setState] = useState<LocationState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lastReported = useRef<{ coords: Coordinates; at: number } | null>(null);

  const sendPosition = useCallback(async (coords: Coordinates, force = false) => {
    if (!isAuthenticated) return;
    const now = Date.now();
    const prev = lastReported.current;
    if (
      !force &&
      prev &&
      now - prev.at < REPORT_INTERVAL_MS &&
      distanceMeters(prev.coords, coords) < MOVE_THRESHOLD_METERS
    ) {
      return;
    }
    lastReported.current = { coords, at: now };
    try {
      await report(coords);
    } catch {
      // Network hiccup; next position update or foreground open will retry.
    }
  }, [isAuthenticated, report]);

  // Detect browser geolocation support and existing permission state on mount.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      const pref = readPref();
      if ("permissions" in navigator && typeof navigator.permissions.query === "function") {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          if (cancelled) return;
          if (result.state === "denied") {
            setState("blocked");
            return;
          }
          if (result.state === "granted") {
            setState(pref === "on" ? "on" : pref === "off" ? "off" : "ask");
            return;
          }
          setState(pref === "off" ? "off" : "ask");
          return;
        } catch {
          // Safari/iOS may not support permissions.query for geolocation.
        }
      }
      if (!cancelled) {
        setState(pref === "on" ? "on" : pref === "off" ? "off" : "ask");
      }
    }

    void check();
    return () => { cancelled = true; };
  }, []);

  // While enabled, watch position and re-check when returning to the foreground.
  useEffect(() => {
    if (!isAuthenticated || state !== "on" || typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      void sendPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setState("blocked");
      }
    };

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 15_000,
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 12_000,
      });
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, state, sendPosition]);

  const enable = useCallback(async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setBusy(true);
    setError("");
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          writePref("on");
          setState("on");
          await sendPosition(
            { lat: position.coords.latitude, lng: position.coords.longitude },
            true,
          );
          setBusy(false);
          resolve();
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setState("blocked");
            setError("No diste permiso de ubicación. Actívalo en los ajustes de tu navegador o teléfono.");
          } else {
            setError("No pudimos obtener tu ubicación. Intenta de nuevo.");
          }
          setBusy(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
      );
    });
  }, [sendPosition]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError("");
    writePref("off");
    lastReported.current = null;
    setState("off");
    try {
      await clear({});
    } catch {
      setError("No pudimos borrar tu ubicación guardada. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }, [clear]);

  return { state, busy, error, enable, disable };
}
