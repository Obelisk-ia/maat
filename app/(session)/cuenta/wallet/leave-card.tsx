"use client";

import { ConvexError } from "convex/values";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/** "Stop following", with a confirmation that says what happens to the stamps. */
export function LeaveCard({ businessName, stamps, onLeave }: {
  businessName: string;
  stamps: number;
  onLeave: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setPending(true);
    setError("");
    try {
      await onLeave();
    } catch (error) {
      setError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "No pudimos dejar de seguir la tarjeta. Intenta de nuevo.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); setError(""); } }}>
      <DialogTrigger asChild>
        <button type="button" className="wallet-leave">Dejar de seguir esta tarjeta</button>
      </DialogTrigger>
      <DialogContent className="wallet-leave-dialog wallet-sheet">
        <DialogHeader>
          <DialogTitle className="m-0">¿Dejar de seguir a {businessName}?</DialogTitle>
          <DialogDescription className="m-0">
            La tarjeta saldrá de tu colección y el negocio ya no podrá encontrarla ni sellarla.
          </DialogDescription>
        </DialogHeader>
        <p>
          {stamps > 0 ? `Guardamos tus sellos (${stamps}). ` : ""}
          Si vuelves a escanear el QR del negocio, recuperas tu tarjeta como la dejaste.
        </p>
        {error && <p className="wallet-error" role="alert">{error}</p>}
        <DialogFooter>
          <button type="button" className="wallet-leave-keep" disabled={pending} onClick={() => setOpen(false)}>
            Conservar tarjeta
          </button>
          <button type="button" className="wallet-leave-confirm" disabled={pending} onClick={leave}>
            {pending ? "Quitando…" : "Dejar de seguir"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
