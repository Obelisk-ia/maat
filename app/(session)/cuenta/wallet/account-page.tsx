"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { InstallApp, useInstallState } from "@/components/pwa/install-app";
import { formatPhone } from "@/lib/registration";
import { signOutAccount } from "../sign-out";
import { AlertSettings } from "./alerts";
import type { Customer, WalletCard } from "./types";
import type { Push } from "./use-push";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

export function AccountPage({ customer, cards, push }: { customer: Customer; cards: WalletCard[]; push: Push }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const install = useInstallState();

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
        <p className="wallet-phone">{formatPhone(customer.phone)}</p>
        <p className="wallet-help">Si no traes tu QR, dile este número al equipo del negocio para registrar tu visita. Para canjear un premio necesitas tu QR o el código de tu tarjeta.</p>
      </section>
      <AlertSettings push={push} cards={cards} />
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
