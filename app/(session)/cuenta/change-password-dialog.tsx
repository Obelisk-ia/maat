"use client";

import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { KeyRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { maximumPasswordLength, minimumPasswordLength } from "@/lib/registration";

function passwordError(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error) {
    const match = error.message.match(/Uncaught ConvexError: ([^\n]+)/);
    if (match) return match[1];
  }
  return "No pudimos cambiar tu contraseña. Intenta de nuevo.";
}

export function ChangePasswordDialog({
  label = "Cambiar contraseña",
  triggerClassName,
  variant = "outline",
  size = "default",
  walletStyle = false,
}: {
  label?: string;
  triggerClassName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  walletStyle?: boolean;
}) {
  const changePassword = useAction(api.account.changePassword);
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();

  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus(undefined);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (saving) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (newPassword.length < minimumPasswordLength || newPassword.length > maximumPasswordLength) {
      setStatus({
        error: true,
        text: `Usa entre ${minimumPasswordLength} y ${maximumPasswordLength} caracteres para la nueva contraseña.`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ error: true, text: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (newPassword === currentPassword) {
      setStatus({ error: true, text: "La nueva contraseña debe ser diferente a la actual." });
      return;
    }

    setSaving(true);
    setStatus(undefined);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ text: "Contraseña actualizada. Se cerraron tus otras sesiones activas." });
    } catch (error) {
      setStatus({ error: true, text: passwordError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {walletStyle ? (
        <button
          type="button"
          className={triggerClassName ?? "wallet-btn"}
          data-variant="secondary"
          onClick={() => setOpen(true)}
        >
          <KeyRound aria-hidden="true" /> {label}
        </button>
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={triggerClassName}
          onClick={() => setOpen(true)}
        >
          <KeyRound aria-hidden="true" /> <span>{label}</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={walletStyle ? "wallet-sheet" : undefined}>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Escribe tu contraseña actual y elige una nueva de al menos {minimumPasswordLength} caracteres.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={currentId}>Contraseña actual</Label>
              <Input
                id={currentId}
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => { setCurrentPassword(event.target.value); setStatus(undefined); }}
                placeholder="••••••••"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={nextId}>Nueva contraseña</Label>
              <Input
                id={nextId}
                type="password"
                autoComplete="new-password"
                required
                minLength={minimumPasswordLength}
                maxLength={maximumPasswordLength}
                value={newPassword}
                onChange={(event) => { setNewPassword(event.target.value); setStatus(undefined); }}
                placeholder={`Mínimo ${minimumPasswordLength} caracteres`}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={confirmId}>Confirmar nueva contraseña</Label>
              <Input
                id={confirmId}
                type="password"
                autoComplete="new-password"
                required
                minLength={minimumPasswordLength}
                maxLength={maximumPasswordLength}
                value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); setStatus(undefined); }}
                placeholder="Repite tu nueva contraseña"
              />
            </div>

            {status && (
              <p
                role={status.error ? "alert" : "status"}
                className={status.error ? "m-0 text-sm font-semibold text-destructive" : "m-0 text-sm font-semibold text-[#1f6b4e]"}
              >
                {status.text}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
