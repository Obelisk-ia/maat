"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSubscription, currentSubscription, PushStepError, pushStep, pushSupport,
  setSwitchedOff, subscriptionDetails, switchedOff, type PushSupport,
} from "@/components/pwa/push-device";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type PushState =
  | "loading"
  /** The server has no keys, so notifications aren't offered at all. */
  | "unavailable"
  | "needs-install"
  | "unsupported"
  /** The customer said no to the phone; only its settings can change that. */
  | "blocked"
  /** Wanted, as by default, but the phone hasn't been asked or hasn't answered. */
  | "ask"
  | "off"
  | "on";

type Device = { support: PushSupport; permission: NotificationPermission; endpoint?: string };

async function readDevice(): Promise<Device> {
  const support = pushSupport();
  if (support !== "ready") return { support, permission: "default" };
  const permission = Notification.permission;
  // A phone that doesn't answer is shown as not connected, not as unable.
  const subscription = await pushStep("consulta", 6000, currentSubscription()).catch(() => null);
  return { support, permission, endpoint: subscription?.endpoint };
}

function problem(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof PushStepError) {
    if (error.step === "permiso") return "Tu teléfono no respondió al pedir permiso.";
    if (error.step === "suscripcion") return "No pudimos conectar con el servicio de avisos de tu navegador.";
  }
  return `${fallback} Intenta de nuevo.`;
}

/** Failures that have steps the customer can follow. */
function troubleFrom(error: unknown) {
  if (!(error instanceof PushStepError)) return undefined;
  return error.step === "permiso" ? "no-answer" as const : error.step === "suscripcion" ? "service" as const : undefined;
}

/** This phone's notifications for the signed-in customer. They're on unless switched off. */
export function usePush() {
  const { isAuthenticated } = useConvexAuth();
  const config = useQuery(api.notifications.config);
  const [device, setDevice] = useState<Device>();
  const latest = useQuery(api.clients.notifications.status,
    isAuthenticated && device ? { endpoint: device.endpoint } : "skip");
  // The last answer stays on screen while a new one loads.
  const [kept, setKept] = useState(latest);
  if (latest && latest !== kept) setKept(latest);
  const status = latest ?? kept;
  const subscribe = useMutation(api.clients.notifications.subscribe);
  const unsubscribe = useMutation(api.clients.notifications.unsubscribe);
  const markSignedOut = useMutation(api.clients.notifications.markSignedOut);
  const setCardMuted = useMutation(api.clients.notifications.setCardMuted);
  const requestTest = useMutation(api.clients.notifications.sendTest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<"no-answer" | "service">();
  const permissionSeen = useRef<NotificationPermission>(undefined);
  const [off, setOff] = useState<boolean>();
  const [tested, setTested] = useState<{ membershipId?: string; skipped?: "off" | "muted" }>();
  const working = useRef(false);
  const connectedAlone = useRef(false);

  const account = status?.userKey;
  if (account && off === undefined) setOff(switchedOff(account));
  const publicKey = config?.publicKey;

  const refresh = useCallback(async () => {
    setDevice(await readDevice());
  }, []);

  useEffect(() => {
    void readDevice().then(setDevice);
    // The customer may change permission in the phone's settings and come back.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Newly allowed there: connect by itself again, even after an earlier failure.
      if ("Notification" in window && Notification.permission === "granted" &&
          permissionSeen.current !== "granted" && !working.current) {
        connectedAlone.current = false;
        setError("");
        setFailure(undefined);
      }
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    permissionSeen.current = device?.permission;
  }, [device]);

  /** One change at a time: two at once would undo each other's subscription. */
  const run = useCallback(async (action: () => Promise<void>, fallback: string) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    setFailure(undefined);
    try {
      await action();
    } catch (error) {
      setError(problem(error, fallback));
      setFailure(troubleFrom(error));
    } finally {
      await refresh();
      working.current = false;
      setBusy(false);
    }
  }, [refresh]);

  /** Asks the phone if needed, then registers it. Call it straight from a tap when it may ask. */
  const connect = useCallback((because: "button" | "allowed") => run(async () => {
    if (!publicKey || !account) return;
    // After any attempt, nothing starts another by itself: a failure must stay on screen.
    connectedAlone.current = true;
    if (Notification.permission === "default") {
      // This must be the first step after the tap: iPhone refuses to ask otherwise.
      const answer = Notification.requestPermission();
      try {
        await pushStep("permiso", 20_000, answer);
      } catch (error) {
        // An answer that comes late still counts.
        void answer.then(() => { connectedAlone.current = false; return refresh(); });
        throw error;
      }
      console.info(`[maat avisos] respuesta: ${Notification.permission} (por ${because})`);
    }
    if (Notification.permission !== "granted") return;
    const subscription = await pushStep("suscripcion", 20_000, createSubscription(publicKey));
    try {
      await pushStep("servidor", 20_000, subscribe(subscriptionDetails(subscription)));
    } catch (error) {
      await subscription.unsubscribe().catch(() => {});
      throw error;
    }
  }, "No pudimos activar los avisos."), [run, publicKey, account, subscribe, refresh]);

  const ready = Boolean(publicKey && device?.support === "ready" && latest && off === false);
  const disconnected = ready && latest !== undefined && !latest.subscribed;

  // Already allowed: connect without asking anything. This also covers a browser that changed its
  // address, and a shared phone where someone else was signed in.
  useEffect(() => {
    if (!disconnected || device?.permission !== "granted" || connectedAlone.current) return;
    connectedAlone.current = true;
    queueMicrotask(() => void connect("allowed"));
  }, [disconnected, device, connect]);

  // Switched off, yet the browser still holds a subscription (someone else's): end it.
  useEffect(() => {
    if (off !== true || !device?.endpoint || !latest || latest.subscribed) return;
    void currentSubscription().then((subscription) => subscription?.unsubscribe()).then(refresh).catch(() => {});
  }, [off, device, latest, refresh]);

  let state: PushState = "loading";
  if (config && !config.publicKey) state = "unavailable";
  else if (config && device && status && off !== undefined) {
    state = device.support !== "ready" ? device.support
      : device.permission === "denied" ? "blocked"
      : off ? "off"
      : device.endpoint && status.subscribed ? "on" : "ask";
  }

  async function disconnect() {
    const subscription = await pushStep("consulta", 6000, currentSubscription());
    if (!subscription) return;
    try {
      await pushStep("servidor", 10_000, unsubscribe({ endpoint: subscription.endpoint }));
    } finally {
      await subscription.unsubscribe();
    }
  }

  return {
    state,
    busy: busy || (latest === undefined && kept !== undefined),
    error,
    account,
    /** What's in the way, if the customer can do something about it. */
    trouble: state === "blocked" ? "blocked" as const : state === "unsupported" ? "unsupported" as const
      : state === "ask" ? failure : undefined,
    /** After the customer changed a setting. Call it straight from a tap. */
    recheck: () => {
      if ("Notification" in window && Notification.permission === "granted") return connect("button");
      setError("Todavía no están permitidos.");
      return refresh();
    },
    permission: device?.permission,
    mutedCards: status?.mutedCards ?? [],
    /** The latest test asked for: why it wasn't sent, or how the push service answered. */
    test: tested ? { ...tested, result: status?.lastResult ?? null } : null,

    enable: (membershipId?: Id<"memberships">) => {
      setTested(undefined);
      if (account) setSwitchedOff(account, false);
      setOff(false);
      // Turning a card's switch on means wanting that card's notifications too.
      if (membershipId && status?.mutedCards.includes(membershipId)) {
        void setCardMuted({ membershipId, muted: false }).catch(() => {});
      }
      return connect("button");
    },

    disable: () => {
      setTested(undefined);
      // Remembered first, so nothing turns them back on while this runs.
      if (account) setSwitchedOff(account, true);
      setOff(true);
      return run(disconnect, "No pudimos apagar los avisos. Intenta de nuevo.");
    },

    setMuted: (membershipId: Id<"memberships">, muted: boolean) => {
      setTested(undefined);
      return run(async () => {
        await setCardMuted({ membershipId, muted });
      }, "No pudimos guardar el cambio. Intenta de nuevo.");
    },

    sendTest: (membershipId?: Id<"memberships">) => {
      setTested(undefined);
      return run(async () => {
        const answer = await requestTest({ endpoint: off ? undefined : device?.endpoint, membershipId });
        setTested({ membershipId, skipped: answer.sent ? undefined : answer.reason });
      }, "No pudimos enviar el aviso de prueba. Intenta de nuevo.");
    },

    /** Before signing out: pauses normal alerts while keeping the trusted device reachable for password reset OTP. */
    forgetDevice: async () => {
      // Not a choice to switch them off: signing in again turns them back on.
      connectedAlone.current = true;
      if (!device?.endpoint) return;
      // Signing out never waits long for a phone that doesn't answer.
      await Promise.race([
        markSignedOut({ endpoint: device.endpoint }).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    },
  };
}

export type Push = ReturnType<typeof usePush>;
