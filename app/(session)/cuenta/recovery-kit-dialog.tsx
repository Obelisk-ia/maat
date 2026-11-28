"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Copy, Download, RefreshCw, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { downloadRecoveryKitPdf } from "@/lib/recovery-pdf";

type GeneratedKit = {
  codes: string[];
  name: string;
  email: string;
  role: "client" | "staff" | "owner" | "admin";
  generatedAt: number;
};

export function RecoveryKitDialog({
  label = "Kit de recuperación (PDF)",
  variant = "outline",
  size = "default",
  walletStyle = false,
}: {
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  walletStyle?: boolean;
}) {
  const statusQuery = useQuery(api.account.recoveryCodeStatus);
  const generateCodes = useMutation(api.account.generateRecoveryCodes);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [kit, setKit] = useState<GeneratedKit | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();

  async function handleGenerate() {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await generateCodes({});
      setKit(result);
      setMessage({ text: "Nuevos códigos generados. Descarga el PDF y guárdalo en un lugar seguro." });
    } catch (error) {
      setMessage({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos generar los códigos. Intenta de nuevo.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!kit) return;
    setDownloading(true);
    try {
      await downloadRecoveryKitPdf(kit);
      setMessage({ text: "PDF descargado: maat-kit-recuperacion.pdf" });
    } catch {
      setMessage({ error: true, text: "No pudimos descargar el PDF. Puedes copiar los códigos manualmente." });
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    if (!kit) return;
    try {
      await navigator.clipboard.writeText(kit.codes.join("\n"));
      setMessage({ text: "Códigos copiados al portapapeles." });
    } catch {
      setMessage({ error: true, text: "No pudimos copiar los códigos. Descarga el PDF." });
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (busy || downloading) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setKit(null);
      setMessage(undefined);
    }
  }

  return (
    <>
      {walletStyle ? (
        <button
          type="button"
          className="wallet-btn"
          data-variant="secondary"
          onClick={() => setOpen(true)}
        >
          <Shield aria-hidden="true" /> {label}
        </button>
      ) : (
        <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
          <Shield aria-hidden="true" /> <span>{label}</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={walletStyle ? "wallet-sheet" : undefined}>
          <DialogHeader>
            <DialogTitle>Kit de recuperación (PDF)</DialogTitle>
            <DialogDescription>
              Genera 6 códigos de respaldo de un solo uso y descárgalos en un PDF junto con todas las formas de recuperar tu cuenta si olvidas tu contraseña.
            </DialogDescription>
          </DialogHeader>

          {!kit ? (
            <div className="grid gap-4">
              <p className="m-0 text-sm text-muted-foreground">
                {statusQuery && statusQuery.total > 0
                  ? `Actualmente tienes ${statusQuery.remaining} de ${statusQuery.total} códigos de respaldo disponibles.`
                  : "Aún no has generado códigos de respaldo para esta cuenta."}
              </p>
              {statusQuery && statusQuery.total > 0 && (
                <p className="m-0 text-xs text-muted-foreground">
                  Al generar nuevos códigos, los anteriores quedarán desactivados automáticamente.
                </p>
              )}
              {message && (
                <p role={message.error ? "alert" : "status"} className={message.error ? "m-0 text-sm font-semibold text-destructive" : "m-0 text-sm font-semibold text-[#1f6b4e]"}>
                  {message.text}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => handleOpenChange(false)}>
                  Cerrar
                </Button>
                <Button type="button" disabled={busy} onClick={handleGenerate}>
                  <RefreshCw aria-hidden="true" />
                  {busy ? "Generando…" : statusQuery && statusQuery.total > 0 ? "Generar nuevos códigos" : "Generar 6 códigos"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2">
                {kit.codes.map((code) => (
                  <code
                    key={code}
                    className="rounded-lg border bg-secondary px-3 py-2 text-center font-mono text-sm font-bold tracking-wider"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <p className="m-0 text-xs text-muted-foreground">
                Por seguridad, estos códigos solo se muestran una vez. Descarga el PDF ahora y guárdalo en un lugar seguro.
              </p>
              {message && (
                <p role={message.error ? "alert" : "status"} className={message.error ? "m-0 text-sm font-semibold text-destructive" : "m-0 text-sm font-semibold text-[#1f6b4e]"}>
                  {message.text}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={downloading} onClick={handleCopy}>
                  <Copy aria-hidden="true" /> Copiar
                </Button>
                <Button type="button" disabled={downloading} onClick={handleDownloadPdf}>
                  <Download aria-hidden="true" /> {downloading ? "Descargando…" : "Descargar PDF"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
