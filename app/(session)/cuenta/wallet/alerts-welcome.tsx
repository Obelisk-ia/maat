"use client";

import { Bell, BellRing, Check, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { installState } from "@/components/pwa/install-store";
import { countWelcome, timesWelcomed, welcomeLimit } from "@/components/pwa/push-device";
import { PushHelp } from "@/components/pwa/push-help";
import type { CustomerLocation } from "./use-location";
import type { Push } from "./use-push";

// Long enough for the screen, or the card just added, to settle first.
const settleMs = 900;
const doneMs = 1600;

/**
 * Notifications are on by default, but every phone insists on asking, and only after a tap. This
 * puts that tap in front of the customer as soon as Maat opens. A phone that already allowed
 * them never sees it.
 */
export function AlertsWelcome({ push, quiet }: {
  push: Push;
  /** Another window is open, so this one waits. */
  quiet: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const shown = useRef(false);
  const { account, state, busy } = push;
  // Some browsers start their installed app with notifications blocked, without ever asking, so
  // there it explains the way out. In a browser tab, blocked means the customer said no.
  const due = (state === "ask" || state === "blocked") && !busy && !quiet && account !== undefined;

  useEffect(() => {
    // Once per visit. While an allowed phone connects by itself it's busy, so nothing appears.
    if (!due || shown.current || (state === "blocked" && installState() !== "app")) return;
    const timer = setTimeout(() => {
      if (shown.current || timesWelcomed(account) >= welcomeLimit) return;
      shown.current = true;
      countWelcome(account);
      setOpen(true);
    }, settleMs);
    return () => clearTimeout(timer);
  }, [due, state, account]);

  useEffect(() => {
    if (!open || state !== "on") return;
    const timer = setTimeout(() => setOpen(false), doneMs);
    return () => clearTimeout(timer);
  }, [open, state]);

  const done = state === "on";
  const blocked = state === "blocked";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="wallet-welcome wallet-sheet">
        <DialogHeader className="items-center">
          <span className="wallet-welcome-icon" data-done={done} aria-hidden="true">
            {done ? <Check /> : <BellRing />}
          </span>
          <DialogTitle className="m-0 text-center">
            {done ? "Avisos activados" : blocked ? "Avisos bloqueados" : "Activa tus avisos"}
          </DialogTitle>
          <DialogDescription className="m-0 text-center">
            {done ? "Puedes apagarlos cuando quieras, en cada tarjeta o en Cuenta."
              : blocked ? "Tu teléfono no está dejando que Maat te avise. Así se activan:"
              : "Maat te avisa cuando un premio esté cerca o te esté esperando. Tu teléfono te pedirá permiso."}
          </DialogDescription>
        </DialogHeader>
        {push.error && <p className="wallet-error" role="alert">{push.error}</p>}
        {!done && push.trouble && (
          <PushHelp trouble={push.trouble} busy={busy} onRecheck={() => void push.recheck()} />
        )}
        {tried && !busy && !push.error && state === "ask" && (
          <p className="wallet-welcome-note" role="status">No se activaron. Toca el botón otra vez y elige «Permitir».</p>
        )}
        {!done && !blocked && (
          <button type="button" className="wallet-welcome-allow" disabled={busy}
            onClick={() => { setTried(true); void push.enable(); }}>
            <Bell aria-hidden="true" /> {busy ? "Activando…" : "Activar avisos"}
          </button>
        )}
        {!done && (
          <button type="button" className="wallet-welcome-later" onClick={() => setOpen(false)}>
            {blocked ? "Entendido" : "Ahora no"}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

const LOCATION_PROMPT_KEY = "maat:location-welcome:v1";

function locationPromptSeen() {
  try {
    return window.localStorage.getItem(LOCATION_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

function markLocationPromptSeen() {
  try {
    window.localStorage.setItem(LOCATION_PROMPT_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
}

/** Asks the customer to enable location for nearby business alerts once push alerts have settled. */
export function LocationWelcome({ location, push, quiet }: {
  location: CustomerLocation;
  push: Push;
  quiet: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shown = useRef(false);
  const due = location.state === "ask" && push.state !== "ask" && push.state !== "loading" && !location.busy && !quiet;

  useEffect(() => {
    if (!due || shown.current || locationPromptSeen()) return;
    const timer = setTimeout(() => {
      if (shown.current || locationPromptSeen()) return;
      shown.current = true;
      markLocationPromptSeen();
      setOpen(true);
    }, settleMs + 300);
    return () => clearTimeout(timer);
  }, [due]);

  useEffect(() => {
    if (!open || location.state !== "on") return;
    const timer = setTimeout(() => setOpen(false), doneMs);
    return () => clearTimeout(timer);
  }, [open, location.state]);

  const done = location.state === "on";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="wallet-welcome wallet-sheet">
        <DialogHeader className="items-center">
          <span className="wallet-welcome-icon" data-done={done} aria-hidden="true">
            {done ? <Check /> : <MapPin />}
          </span>
          <DialogTitle className="m-0 text-center">
            {done ? "Ubicación activada" : "Avisos cuando estés cerca"}
          </DialogTitle>
          <DialogDescription className="m-0 text-center">
            {done
              ? "Puedes cambiarlo cuando quieras en Cuenta."
              : "Activa tu ubicación para recibir mensajes especiales de tus negocios favoritos cuando pases cerca."}
          </DialogDescription>
        </DialogHeader>
        {location.error && <p className="wallet-error" role="alert">{location.error}</p>}
        {!done && (
          <button type="button" className="wallet-welcome-allow" disabled={location.busy}
            onClick={() => void location.enable()}>
            <MapPin aria-hidden="true" /> {location.busy ? "Activando…" : "Permitir ubicación"}
          </button>
        )}
        {!done && (
          <button type="button" className="wallet-welcome-later" onClick={() => setOpen(false)}>
            Ahora no
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
