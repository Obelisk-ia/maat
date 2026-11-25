"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import "./reward-settings.css";

export function RewardSettings() {
  const { isAuthenticated } = useConvexAuth();
  const settings = useQuery(api.owners.settings.rewardSettings, isAuthenticated ? {} : "skip");
  const save = useMutation(api.owners.settings.setRestartAfterFinalPrize);
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
    </>
  );
}
