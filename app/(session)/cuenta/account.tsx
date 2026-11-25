"use client";

import type { FunctionReturnType } from "convex/server";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/app/brand";
import { InstallApp } from "@/components/pwa/install-app";
import { Button } from "@/components/ui/button";
import type { api } from "@/convex/_generated/api";
import { joinPath } from "@/lib/join-link";
import { AuthShell } from "../auth-shell";
import { signOutAccount } from "./sign-out";
import { StampStation } from "./stamp-station";
import "./staff-kiosk.css";

type AccountUser = NonNullable<FunctionReturnType<typeof api.users.viewer>>;

function useSignOut(path: string) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function endSession() {
    setBusy(true);
    try {
      await signOutAccount(path);
    } catch {
      setStatus("No pudimos cerrar tu sesión. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return { busy, status, endSession };
}

/** The whole staff app: staff only register visits. */
export function StaffKiosk({ user }: { user: Extract<AccountUser, { role: "staff" }> }) {
  const { busy, status, endSession } = useSignOut("/auth?tab=login&role=staff");

  return (
    <div className="kiosk">
      <div className="kiosk-relief" aria-hidden="true">
        <Image src="/maat/thoth.jpg" alt="" width={1536} height={1024} sizes="(max-width: 876px) 130vw, 1140px" loading="eager" />
      </div>
      <header className="kiosk-bar">
        <div className="kiosk-brand"><Brand /></div>
        <div className="kiosk-who">
          <strong>{user.businessName}</strong>
          <span>{user.name} · Staff</span>
        </div>
        <InstallApp />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={endSession}>
          <LogOut aria-hidden="true" /> <span>Cerrar sesión</span>
        </Button>
      </header>
      <main className="kiosk-main">
        <div className="owner-heading">
          <h1>Kiosco</h1>
          <p>Escanea la tarjeta de tu cliente, o búscala por su celular o código, para agregar su sello o entregar su premio.</p>
        </div>
        {status && <p className="station-error" role="alert">{status}</p>}
        <StampStation />
      </main>
    </div>
  );
}

/** Shown when an owner or staff account scans a business's QR: only customers collect cards. */
export function BusinessAccountNotice({ role, businessId }: { role: "owner" | "staff"; businessId: string }) {
  const { busy, status, endSession } = useSignOut(`${joinPath(businessId)}&tab=login`);

  return (
    <AuthShell role={role}>
      <h1 className="auth-title">Esta es una cuenta de negocio</h1>
      <section className="dashboard-section">
        <p>Las tarjetas de lealtad se guardan en cuentas de cliente. Cierra esta sesión y entra o regístrate como cliente.</p>
      </section>
      <p className="auth-status" role="status">{status}</p>
      <button type="button" className="btn-submit" disabled={busy} onClick={endSession}>Cerrar sesión y continuar</button>
      <div className="quick-links"><Link href="/cuenta">Volver a mi cuenta</Link></div>
    </AuthShell>
  );
}
