"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Crosshair, ExternalLink, MapPin, Save } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import {
  defaultProximityCooldownDays, defaultProximityMessage, defaultProximityRadiusMeters,
  formatCoordinates, formatDistance, parseLocationInput, proximityCooldownOptions,
  proximityRadiusOptions, type Coordinates,
} from "@/lib/geo";
import { messageProblem } from "@/lib/reminders";
import { MessageField, NotificationPreview, type Overview } from "./shared";

function cooldownLabel(days: number) {
  return days === 1 ? "Máximo 1 vez al día" : `Cada ${days} días`;
}

export function ProximitySection({ data }: { data: Overview }) {
  const save = useMutation(api.owners.campaigns.saveProximitySettings);
  const labelId = useId();
  const pasteId = useId();
  const radiusId = useId();
  const cooldownId = useId();

  const [coords, setCoords] = useState<Coordinates | null>(
    () => (data.location ? { lat: data.location.lat, lng: data.location.lng } : null),
  );
  const [label, setLabel] = useState(() => data.location?.label ?? "");
  const [pasteInput, setPasteInput] = useState("");
  const [enabled, setEnabled] = useState(() => data.proximityAlert?.enabled ?? false);
  const [radiusMeters, setRadiusMeters] = useState(
    () => data.proximityAlert?.radiusMeters ?? defaultProximityRadiusMeters,
  );
  const [cooldownDays, setCooldownDays] = useState(
    () => data.proximityAlert?.cooldownDays ?? defaultProximityCooldownDays,
  );
  const [message, setMessage] = useState(
    () => data.proximityAlert?.message || defaultProximityMessage,
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus({ text: "Este navegador no permite obtener tu ubicación.", error: true });
      return;
    }
    setLocating(true);
    setStatus(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setCoords(next);
        setPasteInput("");
        setLocating(false);
        setStatus({ text: "Ubicación detectada. Guarda los cambios para aplicarla." });
      },
      (err) => {
        setLocating(false);
        setStatus({
          error: true,
          text: err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Actívalo en tu navegador o pega un enlace de Google Maps."
            : "No pudimos obtener tu ubicación. Intenta de nuevo o pega un enlace de Google Maps.",
        });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  function applyPastedLocation(raw: string) {
    setPasteInput(raw);
    if (!raw.trim()) return;
    const parsed = parseLocationInput(raw);
    if (parsed) {
      setCoords(parsed);
      setStatus({ text: "Coordenadas detectadas. Guarda los cambios para aplicarlas." });
    } else {
      setStatus({
        error: true,
        text: "No reconocimos esas coordenadas. Pega un enlace de Google Maps o un formato como 19.4326, -99.1332.",
      });
    }
  }

  async function handleSave() {
    if (enabled && !coords) {
      setStatus({ text: "Primero define la ubicación de tu negocio para activar el aviso por cercanía.", error: true });
      return;
    }
    const problem = enabled || message.trim() ? messageProblem(message, "nearby") : null;
    if (problem) {
      setStatus({ text: problem, error: true });
      return;
    }
    setSaving(true);
    setStatus(undefined);
    try {
      await save({
        location: coords ? { lat: coords.lat, lng: coords.lng, ...(label.trim() ? { label: label.trim() } : {}) } : null,
        proximityAlert: {
          enabled,
          radiusMeters,
          cooldownDays,
          message: message.trim(),
        },
      });
      setStatus({ text: "Ubicación y aviso por cercanía guardados." });
    } catch (error) {
      setStatus({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos guardar la configuración. Intenta de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  const previewAudience = { type: "nearby" as const, stamps: 0, days: 0, radiusMeters };

  return (
    <section className="campaign-section" aria-labelledby="proximity-title">
      <div className="campaign-section-head">
        <div>
          <h2 id="proximity-title">Ubicación y avisos por cercanía</h2>
          <p>
            Guarda la ubicación de tu negocio para avisar automáticamente a los clientes que pasen cerca mientras usan
            Maat, y para poder enviar campañas a «Clientes cercanos».
          </p>
        </div>
      </div>

      <div className="campaign-location-box">
        <div className="campaign-location-actions">
          <Button type="button" variant="outline" disabled={locating || saving} onClick={useCurrentLocation}>
            <Crosshair aria-hidden="true" />
            {locating ? "Obteniendo ubicación…" : "Usar mi ubicación actual"}
          </Button>
          {coords && (
            <a
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="campaign-map-link"
            >
              <MapPin aria-hidden="true" />
              <span>{formatCoordinates(coords)}</span>
              <ExternalLink aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="campaign-location-inputs">
          <div className="campaign-field">
            <Label htmlFor={pasteId}>O pega un enlace de Google Maps o coordenadas</Label>
            <Input
              id={pasteId}
              type="text"
              value={pasteInput}
              onChange={(event) => applyPastedLocation(event.target.value)}
              placeholder="Ej. 19.4326, -99.1332 o enlace de Google Maps"
            />
          </div>
          <div className="campaign-field">
            <Label htmlFor={labelId}>Referencia o sucursal (opcional)</Label>
            <Input
              id={labelId}
              type="text"
              maxLength={120}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ej. Sucursal Roma Norte"
            />
          </div>
        </div>
      </div>

      <label className="campaign-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
            setStatus(undefined);
          }}
        />
        Activar aviso automático cuando un cliente pase cerca
      </label>

      <div className="campaign-numbers">
        <div className="campaign-field">
          <Label htmlFor={radiusId}>Radio de cercanía</Label>
          <select
            id={radiusId}
            value={radiusMeters}
            onChange={(event) => setRadiusMeters(Number(event.target.value))}
          >
            {proximityRadiusOptions.map((option) => (
              <option key={option} value={option}>{formatDistance(option)}</option>
            ))}
          </select>
        </div>

        <div className="campaign-field">
          <Label htmlFor={cooldownId}>Frecuencia por cliente</Label>
          <select
            id={cooldownId}
            value={cooldownDays}
            onChange={(event) => setCooldownDays(Number(event.target.value))}
          >
            {proximityCooldownOptions.map((option) => (
              <option key={option} value={option}>{cooldownLabel(option)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="campaign-compose">
        <MessageField
          type="nearby"
          value={message}
          onChange={(value) => {
            setMessage(value);
            setStatus(undefined);
          }}
        />
        <NotificationPreview data={data} audience={previewAudience} message={message} />
      </div>

      <p className="campaign-stats">
        <b>{data.locationReach.shared}</b> {data.locationReach.shared === 1 ? "cliente comparte" : "clientes comparten"} su ubicación
        {data.location && (
          <>
            {" · "}<b>{data.locationReach.nearby}</b>{" "}
            {data.locationReach.nearby === 1 ? "está" : "están"} dentro de {formatDistance(data.proximityAlert?.radiusMeters ?? radiusMeters)}
          </>
        )}
        {data.proximityStats.sent > 0 && (
          <>
            {" · "}<b>{data.proximityStats.sent}</b> {data.proximityStats.sent === 1 ? "aviso cercano" : "avisos cercanos"} en 30 días
            {data.proximityStats.returned > 0 && <> (<b>{data.proximityStats.returned}</b> volvieron)</>}
          </>
        )}
      </p>

      <div className="campaign-actions">
        {coords && (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setCoords(null);
              setEnabled(false);
              setPasteInput("");
              setStatus(undefined);
            }}
          >
            Quitar ubicación
          </Button>
        )}
        <Button type="button" disabled={saving} onClick={handleSave}>
          <Save aria-hidden="true" />
          {saving ? "Guardando…" : "Guardar ubicación y aviso"}
        </Button>
      </div>
      <p className="campaign-status" data-error={Boolean(status?.error)} role="status">{status?.text}</p>
    </section>
  );
}
