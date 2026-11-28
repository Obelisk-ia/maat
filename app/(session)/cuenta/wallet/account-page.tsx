"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { LogOut, Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { InstallApp, useInstallState } from "@/components/pwa/install-app";
import { api } from "@/convex/_generated/api";
import { formatPhone, normalizePhone } from "@/lib/registration";
import { ChangePasswordDialog } from "../change-password-dialog";
import { RecoveryKitDialog } from "../recovery-kit-dialog";
import { signOutAccount } from "../sign-out";
import { AlertSettings, LocationSettings } from "./alerts";
import type { Customer, WalletCard } from "./types";
import type { CustomerLocation } from "./use-location";
import type { Push } from "./use-push";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

export function AccountPage({ customer, cards, push, location }: {
  customer: Customer;
  cards: WalletCard[];
  push: Push;
  location: CustomerLocation;
}) {
  const updatePhone = useMutation(api.account.updateClientPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(customer.phone);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<{ text: string; error?: boolean }>();
  const install = useInstallState();

  async function savePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPhone) return;
    if (!normalizePhone(phoneDraft)) {
      setPhoneStatus({ error: true, text: "Escribe un número válido de 10 dígitos o incluye el prefijo internacional." });
      return;
    }
    setSavingPhone(true);
    setPhoneStatus(undefined);
    try {
      await updatePhone({ phone: phoneDraft });
      setEditingPhone(false);
      setPhoneStatus({ text: "Número de celular actualizado." });
    } catch (err) {
      setPhoneStatus({
        error: true,
        text: err instanceof ConvexError && typeof err.data === "string"
          ? err.data : "No pudimos actualizar tu número. Intenta de nuevo.",
      });
    } finally {
      setSavingPhone(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      // Whoever uses this phone next mustn't get this account's notifications.
      await push.forgetDevice();
      await signOutAccount("/clientes?tab=login");
    } catch {
      setError("No pudimos cerrar tu sesión. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <div className="wallet-page">
      <header className="wallet-account-head">
        <span className="wallet-avatar" aria-hidden="true">{initials(customer.name)}</span>
        <div>
          <h1>{customer.name}</h1>
          <span>{customer.email}</span>
        </div>
      </header>
      <section aria-labelledby="account-phone">
        <h2 id="account-phone">Tu celular</h2>
        {!editingPhone ? (
          <>
            <p className="wallet-phone">{formatPhone(customer.phone)}</p>
            <p className="wallet-help">Si no traes tu QR, dile este número al equipo del negocio para registrar tu visita. Para canjear un premio necesitas tu QR o el código de tu tarjeta.</p>
            <div>
              <button
                type="button"
                className="wallet-btn"
                data-variant="secondary"
                onClick={() => { setPhoneDraft(customer.phone); setPhoneStatus(undefined); setEditingPhone(true); }}
              >
                <Pencil aria-hidden="true" /> Cambiar número
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={savePhone} className="grid gap-3">
            <PhoneInput
              id="account-phone-input"
              name="phone"
              required
              autoComplete="tel"
              value={phoneDraft}
              onValueChange={(value) => { setPhoneDraft(value); setPhoneStatus(undefined); }}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="wallet-btn" disabled={savingPhone}>
                {savingPhone ? "Guardando…" : "Guardar número"}
              </button>
              <button
                type="button"
                className="wallet-btn"
                data-variant="secondary"
                disabled={savingPhone}
                onClick={() => { setEditingPhone(false); setPhoneStatus(undefined); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
        {phoneStatus && (
          <p className={phoneStatus.error ? "wallet-error" : "wallet-since"} role={phoneStatus.error ? "alert" : "status"}>
            {phoneStatus.text}
          </p>
        )}
      </section>
      <AlertSettings push={push} cards={cards} />
      <LocationSettings location={location} />
      <section aria-labelledby="account-security">
        <h2 id="account-security">Seguridad</h2>
        <p className="wallet-help">Cambia tu contraseña o descarga tu kit de recuperación en PDF para recuperar tu cuenta sin correo.</p>
        <div className="flex flex-wrap gap-2">
          <ChangePasswordDialog walletStyle />
          <RecoveryKitDialog walletStyle />
        </div>
      </section>
      {install !== "none" && (
        <section aria-labelledby="account-app">
          <h2 id="account-app">App Maat</h2>
          {install === "app" ? <p className="wallet-help">Estás usando la app instalada.</p> : (
            <>
              <p className="wallet-help">Ten tus tarjetas y tu QR a un toque, desde tu pantalla de inicio.</p>
              <div><InstallApp label="Agregar a inicio" /></div>
            </>
          )}
        </section>
      )}
      <section aria-label="Sesión">
        <div>
          <button type="button" className="wallet-btn" data-variant="secondary" disabled={busy} onClick={logout}>
            <LogOut aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
        {error && <p className="wallet-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
