"use client";

import { Bell, BellRing, MapPin } from "lucide-react";
import Link from "next/link";
import { PushHelp } from "@/components/pwa/push-help";
import { CardLogo } from "./card-logo";
import type { WalletCard } from "./types";
import type { CustomerLocation } from "./use-location";
import type { Push } from "./use-push";

function Switch({ label, checked, disabled, onChange }: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" role="switch" className="wallet-switch" aria-label={label} aria-checked={checked}
      disabled={disabled} onClick={() => onChange(!checked)}>
      <i aria-hidden="true" />
    </button>
  );
}

const Trouble = ({ push }: { push: Push }) => push.trouble
  ? <PushHelp trouble={push.trouble} busy={push.busy} onRecheck={() => void push.recheck()} />
  : null;

/** Why notifications can't be turned on here, if they can't. */
function Obstacle({ state }: { state: Push["state"] }) {
  if (state === "needs-install") {
    return (
      <p className="wallet-help">
        Para recibir avisos en iPhone o iPad, primero agrega Maat a tu pantalla de inicio y ábrela desde ahí.
        Necesitas iOS 16.4 o posterior.
      </p>
    );
  }
  if (state === "blocked") {
    return <p className="wallet-help">Los avisos de Maat están bloqueados en este teléfono.</p>;
  }
  if (state === "unsupported") {
    return <p className="wallet-help">Este navegador no puede recibir avisos.</p>;
  }
  return null;
}

/** Notifications come on by default; this finishes the job when the phone hasn't allowed them yet. */
function Allow({ push }: { push: Push }) {
  return (
    <>
      <p className="wallet-help">Tus avisos vienen activados. Solo falta que tu teléfono los permita.</p>
      <div>
        <button type="button" className="wallet-btn" disabled={push.busy} onClick={() => void push.enable()}>
          <Bell aria-hidden="true" /> {push.busy ? "Activando…" : "Permitir avisos"}
        </button>
      </div>
    </>
  );
}

/** Works with notifications off too, to show that nothing is sent then. */
function TestAlert({ push, membershipId }: { push: Push; membershipId?: WalletCard["membershipId"] }) {
  const test = push.test && push.test.membershipId === membershipId ? push.test : null;
  const text = !test ? ""
    : test.skipped === "off" ? "No se envió: los avisos están apagados en este teléfono."
    : test.skipped === "muted" ? "No se envió: los avisos de esta tarjeta están apagados."
    : !test.result ? "Llegará en unos segundos. Puedes cerrar Maat para comprobarlo."
    : test.result.ok ? "El aviso salió. Si no aparece, revisa que tu teléfono permita los avisos de Maat."
    : "No se pudo enviar el aviso. Apaga los avisos, actívalos de nuevo y vuelve a probar.";
  return (
    <>
      <div>
        <button type="button" className="wallet-btn" data-variant="secondary" disabled={push.busy}
          onClick={() => void push.sendTest(membershipId)}>
          <BellRing aria-hidden="true" /> Enviar aviso de prueba
        </button>
      </div>
      <p className="wallet-since" role="status">{text}</p>
    </>
  );
}

const Problem = ({ push }: { push: Push }) =>
  push.error ? <p className="wallet-error" role="alert">{push.error}</p> : null;

const visible = (state: Push["state"]) => state !== "loading" && state !== "unavailable";

/** On a card: this business's switch, on unless turned off. */
export function CardAlerts({ push, card }: { push: Push; card: WalletCard }) {
  if (!visible(push.state)) return null;
  const muted = push.mutedCards.includes(card.membershipId);
  const on = push.state === "on" && !muted;
  const name = card.details.displayName;
  return (
    <section className="wallet-alerts wallet-enter" aria-labelledby="card-alerts">
      <h2 id="card-alerts">Avisos</h2>
      <Obstacle state={push.state} />
      {push.state === "ask" && <Allow push={push} />}
      {(push.state === "on" || push.state === "off") && (
        <>
          <div className="wallet-switch-row">
            <div>
              <strong>Avisos de {name}</strong>
              <span>
                {on ? "Activados" : push.state === "off" ? "Apagados en este teléfono" : "Apagados para esta tarjeta"}
              </span>
            </div>
            <Switch label={`Avisos de ${name}`} checked={on} disabled={push.busy}
              onChange={(checked) => void (push.state === "off"
                ? push.enable(card.membershipId) : push.setMuted(card.membershipId, !checked))} />
          </div>
          <TestAlert push={push} membershipId={card.membershipId} />
        </>
      )}
      <Problem push={push} />
      <Trouble push={push} />
    </section>
  );
}

/** On the account page: this phone's switch, and one for each business. */
export function AlertSettings({ push, cards }: { push: Push; cards: WalletCard[] }) {
  if (!visible(push.state)) return null;
  const on = push.state === "on";
  return (
    <section aria-labelledby="account-alerts">
      <h2 id="account-alerts">Avisos</h2>
      <Obstacle state={push.state} />
      {push.state === "ask" && <Allow push={push} />}
      {(on || push.state === "off") && (
        <>
          <div className="wallet-switch-row">
            <div>
              <strong>Avisos en este teléfono</strong>
              <span>{on ? "Activados" : "Apagados"}</span>
            </div>
            <Switch label="Avisos en este teléfono" checked={on} disabled={push.busy}
              onChange={(checked) => void (checked ? push.enable() : push.disable())} />
          </div>
          {on && cards.length > 0 && (
            <ul>
              {cards.map((card) => {
                const muted = push.mutedCards.includes(card.membershipId);
                return (
                  <li key={card.membershipId} className="wallet-switch-row">
                    <CardLogo card={card} />
                    <div>
                      <strong>{card.details.displayName}</strong>
                      <span>{muted ? "Avisos apagados" : "Recibes sus avisos"}</span>
                    </div>
                    <Switch label={`Avisos de ${card.details.displayName}`} checked={!muted} disabled={push.busy}
                      onChange={(checked) => void push.setMuted(card.membershipId, !checked)} />
                  </li>
                );
              })}
            </ul>
          )}
          <TestAlert push={push} />
        </>
      )}
      <Problem push={push} />
      <Trouble push={push} />
      {!push.trouble && <Link href="/diagnostico" className="wallet-check-link">Revisar este teléfono</Link>}
    </section>
  );
}

/** On the account page: opt-in location sharing for nearby business notifications. */
export function LocationSettings({ location }: { location: CustomerLocation }) {
  if (location.state === "loading") return null;
  const on = location.state === "on";
  return (
    <section aria-labelledby="account-location">
      <h2 id="account-location">Avisos por cercanía</h2>
      {location.state === "unsupported" && (
        <p className="wallet-help">Este navegador no puede compartir tu ubicación.</p>
      )}
      {location.state === "blocked" && (
        <p className="wallet-help">
          El permiso de ubicación está bloqueado para Maat en este teléfono. Actívalo en los ajustes de tu navegador
          si quieres recibir avisos cuando estés cerca de tus negocios.
        </p>
      )}
      {location.state === "ask" && (
        <>
          <p className="wallet-help">
            Comparte tu ubicación para recibir avisos especiales cuando pases cerca de los negocios que sigues.
          </p>
          <div>
            <button type="button" className="wallet-btn" disabled={location.busy} onClick={() => void location.enable()}>
              <MapPin aria-hidden="true" /> {location.busy ? "Activando…" : "Permitir ubicación"}
            </button>
          </div>
        </>
      )}
      {(on || location.state === "off") && (
        <>
          <div className="wallet-switch-row">
            <div>
              <strong>Ubicación en este teléfono</strong>
              <span>{on ? "Activada para avisos cercanos" : "Apagada"}</span>
            </div>
            <Switch
              label="Ubicación para avisos cercanos"
              checked={on}
              disabled={location.busy}
              onChange={(checked) => void (checked ? location.enable() : location.disable())}
            />
          </div>
          <p className="wallet-help">
            Solo se usa mientras abres Maat para avisarte si estás cerca de un negocio que sigues.
          </p>
        </>
      )}
      {location.error && <p className="wallet-error" role="alert">{location.error}</p>}
    </section>
  );
}
