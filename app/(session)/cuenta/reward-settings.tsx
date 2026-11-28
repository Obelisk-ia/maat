"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { InstallApp, useInstallState } from "@/components/pwa/install-app";
import { api } from "@/convex/_generated/api";
import { ChangePasswordDialog } from "./change-password-dialog";
import { RecoveryKitDialog } from "./recovery-kit-dialog";
import "./reward-settings.css";

export function RewardSettings() {
  const { isAuthenticated } = useConvexAuth();
  const settings = useQuery(api.owners.settings.rewardSettings, isAuthenticated ? {} : "skip");
  const save = useMutation(api.owners.settings.setRestartAfterFinalPrize);
  const install = useInstallState();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const on = settings?.restartAfterFinalPrize;

  async function toggle() {
    setSaving(true);
    setStatus(undefined);
    try {
      await save({ restartAfterFinalPrize: !on });
      setStatus({ text: "Ajuste guardado." });
    } catch (error) {
      setStatus({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos guardar el ajuste. Intenta de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="owner-heading">
        <h1>Ajustes</h1>
        <p>Cómo funcionan los premios de tu tarjeta.</p>
      </div>
      <section className="settings-panel" aria-labelledby="rewards-settings-title">
        <h2 id="rewards-settings-title">Premios</h2>
        {on === undefined ? <p role="status">Cargando tus ajustes…</p> : (
          <>
            <div className="settings-row">
              <div>
                <strong id="restart-label">Reiniciar la tarjeta al entregar el último premio</strong>
                <span id="restart-help">
                  {on
                    ? "Al entregar el último premio, el cliente empieza una tarjeta nueva en 0 sellos."
                    : "La tarjeta sigue hasta llenarse. Cuando esté completa y sin premios pendientes, tú o tu equipo tocan «Empezar tarjeta nueva» en el kiosco."}
                </span>
              </div>
              <button type="button" role="switch" className="settings-switch" aria-checked={on}
                aria-labelledby="restart-label" aria-describedby="restart-help" disabled={saving} onClick={toggle}>
                <i aria-hidden="true" />
              </button>
            </div>
            <ul className="settings-rules">
              <li>Los premios anteriores al último conservan los sellos.</li>
              <li>Se entregan de uno en uno, empezando por el de menos sellos.</li>
              <li>Para entregarlos se necesita el QR del cliente o el código de su tarjeta.</li>
            </ul>
          </>
        )}
        <p className="settings-status" data-error={Boolean(status?.error)} role="status">{status?.text}</p>
      </section>

      <section className="settings-panel mt-5" aria-labelledby="owner-security-title">
        <h2 id="owner-security-title">Seguridad</h2>
        <div className="settings-row">
          <div>
            <strong>Contraseña de tu cuenta</strong>
            <span>Al cambiarla, se cerrarán tus otras sesiones activas.</span>
          </div>
          <ChangePasswordDialog variant="outline" size="sm" />
        </div>
        <div className="settings-row">
          <div>
            <strong>Kit de recuperación (PDF)</strong>
            <span>Genera 6 códigos de respaldo de un solo uso y descárgalos en PDF por si olvidas tu contraseña.</span>
          </div>
          <RecoveryKitDialog variant="outline" size="sm" />
        </div>
      </section>

      {install !== "none" && (
        <section className="settings-panel mt-5" aria-labelledby="owner-app-title">
          <h2 id="owner-app-title">App Maat</h2>
          <div className="settings-row">
            <div>
              <strong>{install === "app" ? "App instalada" : "Instala Maat en este dispositivo"}</strong>
              <span>
                {install === "app"
                  ? "Estás usando Maat como aplicación instalada."
                  : "Ábrela directo desde tu pantalla de inicio, tablet o computadora."}
              </span>
            </div>
            {install !== "app" && <InstallApp label="Instalar app" />}
          </div>
        </section>
      )}
    </>
  );
}
