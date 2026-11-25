"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { rotateAccountInvite } from "./actions";

export function TeamInvite({ inviteCode }: { inviteCode: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setMessage("Código copiado.");
    } catch {
      setMessage("Selecciona el código para copiarlo manualmente.");
    }
  }

  async function rotate() {
    setBusy(true);
    try {
      await rotateAccountInvite();
      setOpen(false);
      setMessage("Código renovado.");
    } catch {
      setOpen(false);
      setMessage("No pudimos renovar el código. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="owner-heading">
        <h1>Equipo</h1>
        <p>Invita al personal a unirse a tu negocio en Maat.</p>
      </div>
      <section className="owner-team-panel" aria-labelledby="invite-title">
        <h2 id="invite-title">Código de invitación del negocio</h2>
        <p>Comparte este código con tu equipo para que pueda registrarse como staff.</p>
        <code className="invite-code">{inviteCode}</code>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={copyCode}><Copy aria-hidden="true" /> Copiar código</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button type="button" variant="outline"><RefreshCw aria-hidden="true" /> Renovar código</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="m-0">Renovar código de invitación</DialogTitle>
                <DialogDescription className="m-0">El código anterior dejará de funcionar. Tu equipo conservará su acceso.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="button" disabled={busy} onClick={rotate}>{busy ? "Renovando…" : "Confirmar renovación"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p role="status">{message}</p>
      </section>
    </>
  );
}
