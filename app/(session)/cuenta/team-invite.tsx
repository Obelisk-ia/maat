"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { rotateAccountInvite } from "./actions";

export function TeamInvite({ inviteCode }: { inviteCode: string }) {
  const staff = useQuery(api.owners.settings.listTeamStaff);
  const issueStaffCode = useMutation(api.owners.settings.issueStaffResetCode);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [issuingId, setIssuingId] = useState<Id<"users"> | null>(null);
  const [issued, setIssued] = useState<{ code: string; name: string; email: string } | null>(null);
  const [staffStatus, setStaffStatus] = useState<{ text: string; error?: boolean }>();

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

  async function generateStaffReset(staffId: Id<"users">) {
    setIssuingId(staffId);
    setStaffStatus(undefined);
    try {
      const result = await issueStaffCode({ staffId });
      setIssued({ code: result.code, name: result.name, email: result.email });
    } catch (error) {
      setStaffStatus({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos generar el código de recuperación.",
      });
    } finally {
      setIssuingId(null);
    }
  }

  async function copyIssuedCode() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setStaffStatus({ text: `Código copiado para ${issued.name}.` });
    } catch {
      setStaffStatus({ error: true, text: "Copia el código manualmente." });
    }
  }

  return (
    <>
      <div className="owner-heading">
        <h1>Equipo</h1>
        <p>Invita al personal a unirse a tu negocio y ayúdales a recuperar su contraseña si la olvidan.</p>
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

      <section className="owner-team-panel mt-5" aria-labelledby="staff-list-title">
        <h2 id="staff-list-title">Personal registrado</h2>
        <p>Si alguien de tu staff olvida su contraseña, puedes generarle un código temporal de 6 dígitos (válido por 15 minutos).</p>
        {staff === undefined ? (
          <p role="status">Cargando tu equipo…</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay cuentas de staff registradas en tu negocio.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {staff.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{member.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={issuingId === member.id}
                  onClick={() => generateStaffReset(member.id)}
                >
                  <KeyRound aria-hidden="true" />
                  {issuingId === member.id ? "Generando…" : "Código de recuperación"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {issued && (
          <div className="mt-3 grid gap-2 rounded-xl border border-primary/30 bg-secondary p-4">
            <div className="text-sm font-bold">
              Código temporal para {issued.name} ({issued.email})
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-background px-3 py-1.5 font-mono text-xl font-extrabold tracking-widest">
                {issued.code}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={copyIssuedCode}>
                <Copy aria-hidden="true" /> Copiar
              </Button>
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              Vence en 15 minutos y solo sirve una vez. Debe usarlo en «¿Olvidaste tu contraseña?».
            </p>
          </div>
        )}
        {staffStatus && (
          <p
            role={staffStatus.error ? "alert" : "status"}
            className={staffStatus.error ? "m-0 text-sm font-semibold text-destructive" : "m-0 text-sm font-semibold text-[#1f6b4e]"}
          >
            {staffStatus.text}
          </p>
        )}
      </section>
    </>
  );
}
