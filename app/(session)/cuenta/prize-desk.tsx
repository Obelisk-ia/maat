"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Gift, RotateCcw, ScanLine } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { stampWord, type CardDetails } from "@/lib/business-card";
import type { cardProgress } from "@/lib/card-progress";

type Found = Extract<FunctionReturnType<typeof api.staff.stamps.find>, { valid: true }>;
type Match = Found["matches"][number];

/** A confirmation for actions that can't be undone. */
function Confirm({ title, description, action, busyAction, open, onOpenChange, onConfirm, children }: {
  title: string;
  description: string;
  action: string;
  busyAction: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  children?: ReactNode;
}) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    await onConfirm();
    setPending(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="station-confirm">
        <DialogHeader>
          <DialogTitle className="m-0">{title}</DialogTitle>
          <DialogDescription className="m-0">{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={pending} onClick={confirm}>{pending ? busyAction : action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The prize side of a customer's card at the kiosk: the next prize to hand over, or a new card
 * when a full one has nothing left.
 */
export function PrizeDesk({ card, match, progress, onScan, onDone, onError }: {
  card: CardDetails;
  match: Match;
  progress: ReturnType<typeof cardProgress>;
  onScan: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const deliver = useMutation(api.staff.prizes.deliver);
  const startNewCard = useMutation(api.staff.prizes.startNewCard);
  const [confirming, setConfirming] = useState<"prize" | "card">();
  const { ready, stamps, total } = progress;
  const prize = ready[0];

  async function attempt(action: () => Promise<string>) {
    onError("");
    try {
      onDone(await action());
    } catch (error) {
      onError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "No pudimos guardar el cambio. Intenta de nuevo.");
    }
  }

  if (prize) {
    const { code } = match;
    const restarts = match.nextPrizeRestartsCard;
    return (
      <div className="station-prize">
        <Gift aria-hidden="true" />
        <div>
          <span>Premio listo · Con {prize.stamps} {stampWord(prize.stamps, card)}</span>
          <strong>{prize.name}</strong>
          {ready.length > 1 && (
            <span>{ready.length === 2 ? "Después queda 1 premio más." : `Después quedan ${ready.length - 1} premios más.`}</span>
          )}
        </div>
        {code ? (
          <>
            <Button type="button" size="lg" onClick={() => setConfirming("prize")}>
              <Gift aria-hidden="true" /> Entregar premio
            </Button>
            <Confirm open={confirming === "prize"} onOpenChange={(open) => setConfirming(open ? "prize" : undefined)}
              title={`¿Entregar ${prize.name}?`} description={`Para ${match.customerName}. No se puede deshacer.`}
              action="Sí, entregar" busyAction="Entregando…"
              onConfirm={() => attempt(async () => {
                const { restartedCard } = await deliver({ membershipId: match.membershipId, prizeId: prize.id, cardCode: code });
                return `Entregaste ${prize.name}. ${restartedCard ? "Empezó una tarjeta nueva." : "Quedó registrado a tu nombre."}`;
              })}>
              <p>
                {restarts
                  ? `Es el último premio: la tarjeta del cliente vuelve a 0 ${stampWord(0, card)}.`
                  : `El cliente conserva sus ${stamps} ${stampWord(stamps, card)}.`}
              </p>
            </Confirm>
          </>
        ) : (
          <>
            <p>Para entregarlo, escanea el QR de su tarjeta o escribe su código. Con el celular solo se registran visitas.</p>
            <Button type="button" size="lg" variant="outline" onClick={onScan}>
              <ScanLine aria-hidden="true" /> Escanear su QR
            </Button>
          </>
        )}
      </div>
    );
  }

  if (stamps < total) return null;
  return (
    <div className="station-prize">
      <RotateCcw aria-hidden="true" />
      <div>
        <span>Tarjeta completa</span>
        <strong>No quedan premios por entregar</strong>
      </div>
      <Button type="button" size="lg" onClick={() => setConfirming("card")}>Empezar tarjeta nueva</Button>
      <Confirm open={confirming === "card"} onOpenChange={(open) => setConfirming(open ? "card" : undefined)}
        title="¿Empezar una tarjeta nueva?"
        description={`La tarjeta de ${match.customerName} vuelve a 0 ${stampWord(0, card)}. No se puede deshacer.`}
        action="Sí, empezar" busyAction="Guardando…"
        onConfirm={() => attempt(async () => {
          await startNewCard({ membershipId: match.membershipId });
          return "Empezó una tarjeta nueva.";
        })} />
    </div>
  );
}
