"use client";

import {
  Camera, Clock, CreditCard, Gift, Lock, MapPin, Maximize, MessageCircle,
  Plus, Smartphone, Sparkles, UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatInstagramHref, formatWelcomeMessage, formatWhatsappHref, normalizeExternalUrl,
  stampedLook, stampWord, worldLook, type CardDetails,
} from "@/lib/business-card";
import { cardProgress, nextStepText } from "@/lib/card-progress";
import { triggerStampSensory } from "@/lib/world-fx";
import { buildWorldTheme } from "@/lib/world-theme";
import { BrandCelebration } from "./brand-celebration";
import { LoyaltyCard, type CardArt, type StampPlay } from "./loyalty-card";
import { stampGlyphs } from "./stamp-icons";
import "./world-theme.css";

export type PreviewMode = "card" | "world";

export function CardPreview({ card, logo, background, stampLogo, cover, mode, onModeChange }: {
  card: CardDetails;
  cover: string | null;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
} & CardArt) {
  const [stampCount, setStampCount] = useState<number>();
  const [celebrationRun, setCelebrationRun] = useState(0);
  const { total } = cardProgress(card, 0);
  const stamps = Math.min(stampCount ?? Math.max(0, total - 3), total);
  const { goals, ready } = cardProgress(card, stamps);
  const { animation } = stampedLook(card);
  const world = worldLook(card);
  const theme = buildWorldTheme(card);
  const Icon = stampGlyphs[card.stampIcon];
  const [play, setPlay] = useState<StampPlay>({ stamp: 0, run: 0 });
  const [seenAnimation, setSeenAnimation] = useState(animation);
  // Picking another animation replays it on the latest stamp.
  if (animation !== seenAnimation) {
    setSeenAnimation(animation);
    setPlay({ stamp: stamps, run: play.run + 1 });
  }

  function tryStamp() {
    const next = stamps >= total ? 0 : stamps + 1;
    const hitGoal = goals.some((goal) => goal.stamps === next);
    setStampCount(next);
    setPlay({ stamp: next, run: play.run + 1 });
    if (next > 0) {
      triggerStampSensory({ sound: world.sound, haptics: world.haptics, isPrize: hitGoal });
      if (hitGoal && world.celebratePrize) setCelebrationRun((n) => n + 1);
    }
  }

  function testCelebration() {
    triggerStampSensory({ sound: world.sound, haptics: world.haptics, isPrize: true });
    setCelebrationRun((n) => n + 1);
  }

  const menuHref = normalizeExternalUrl(world.links.menuUrl);
  const mapsHref = normalizeExternalUrl(world.links.mapsUrl);
  const waHref = formatWhatsappHref(world.links.whatsapp);
  const igHref = formatInstagramHref(world.links.instagram);
  const hasLinks = Boolean(menuHref || mapsHref || waHref || igHref || world.links.hours);
  const hasHero = Boolean(cover || world.welcomeMessage || world.tagline);
  const welcome = world.welcomeMessage
    ? formatWelcomeMessage(world.welcomeMessage, "Sandra")
    : card.displayName.trim() || "Tu negocio";

  return (
    <aside className="card-preview" aria-labelledby="preview-title" data-long={total > 30}>
      <div className="preview-header">
        <h2 id="preview-title">Vista previa</h2>
        <div className="preview-switch" role="group" aria-label="Modo de vista previa">
          <button type="button" aria-pressed={mode === "card"} onClick={() => onModeChange("card")}>
            <CreditCard aria-hidden="true" /> Tarjeta
          </button>
          <button type="button" aria-pressed={mode === "world"} onClick={() => onModeChange("world")}>
            <Smartphone aria-hidden="true" /> Mundo
          </button>
        </div>
      </div>

      {mode === "card" ? (
        <div className="preview-stage">
          <LoyaltyCard card={card} art={{ logo, background, stampLogo }} stamps={stamps} member="Sandra" play={play}
            qr={{ value: "MAAT:PREVIEW", caption: "PSL-104 · Ejemplo", title: "QR de ejemplo" }} />
          <BrandCelebration run={celebrationRun} colors={theme.confettiColors} />
        </div>
      ) : (
        <div className="world-phone world-shell" data-mood={world.mood} data-font={world.font} data-pattern={world.pattern}
          style={theme.vars}>
          <div className="world-backdrop" aria-hidden="true" />
          <BrandCelebration run={celebrationRun} colors={theme.confettiColors} />
          <header className="world-phone-bar">
            <span className="world-phone-bar-logo" aria-hidden="true">
              {logo ? <Image src={logo} alt="" width={30} height={30} unoptimized /> : <Icon aria-hidden="true" />}
            </span>
            <div className="world-phone-bar-copy">
              <strong>{card.displayName.trim() || "Tu negocio"}</strong>
              {card.branch.trim() && <span>{card.branch}</span>}
            </div>
          </header>

          <div className="world-phone-scroll">
            {hasHero && (
              <div className="world-cover" data-has-image={Boolean(cover)}>
                {cover && <Image className="world-cover-img" src={cover} alt="" fill sizes="400px" unoptimized />}
                {cover && <div className="world-cover-scrim" aria-hidden="true" />}
                <div className="world-cover-content">
                  <span className="world-welcome-kicker">{card.displayName.trim() || "Tu negocio"}</span>
                  <p className="world-welcome-title">{welcome}</p>
                  {world.tagline && <p className="world-welcome-sub">{world.tagline}</p>}
                </div>
              </div>
            )}

            <LoyaltyCard card={card} art={{ logo, background, stampLogo }} stamps={stamps} member="Sandra" play={play}
              qr={{ value: "MAAT:PREVIEW", caption: "PSL-104 · Ejemplo", title: "QR de ejemplo" }} />

            <button type="button" className="world-phone-cta" onClick={tryStamp}>
              <Maximize aria-hidden="true" /> Mostrar mi QR en caja
            </button>

            <div className="world-panel world-phone-progress">
              <div className="world-phone-progress-top">
                <div>
                  <strong>{stamps}</strong><span>/{total} {stampWord(total, card)}</span>
                </div>
                {ready.length > 0 && (
                  <span className="world-phone-pill-chip">
                    <Gift aria-hidden="true" />{ready.length === 1 ? "Premio listo" : `${ready.length} listos`}
                  </span>
                )}
              </div>
              <div className="world-phone-track" aria-hidden="true">
                <div style={{ transform: `scaleX(${stamps / total})` }} />
              </div>
              <p className="world-welcome-sub">{nextStepText(card, stamps)}</p>
            </div>

            {world.board && (
              <section className="world-board" aria-label="Pizarrón del día">
                <div className="world-board-head">
                  {world.board.badge && (
                    <span className="world-board-badge"><Sparkles aria-hidden="true" />{world.board.badge}</span>
                  )}
                </div>
                <h3 className="world-board-title">{world.board.title}</h3>
                {world.board.body && <p className="world-board-body">{world.board.body}</p>}
              </section>
            )}

            {world.secretMenu.length > 0 && (
              <section className="world-panel" aria-label="Menú secreto">
                <h3 className="world-phone-section-title">Menú secreto</h3>
                <ul className="world-secret-list">
                  {world.secretMenu.map((item) => {
                    const locked = item.minCompletedCards > 0;
                    return (
                      <li key={item.id} className="world-secret-item" data-locked={locked}>
                        <span className="world-secret-icon" aria-hidden="true">
                          {locked ? <Lock /> : <Sparkles />}
                        </span>
                        <div className="world-secret-copy">
                          <strong>{item.title}</strong>
                          {item.description && <p>{item.description}</p>}
                          <span className="world-secret-req">
                            {locked
                              ? `Al completar ${item.minCompletedCards} ${item.minCompletedCards === 1 ? "tarjeta" : "tarjetas"}`
                              : "Disponible para miembros"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {hasLinks && (
              <section className="world-panel" aria-label="Accesos directos">
                <h3 className="world-phone-section-title">El local</h3>
                <div className="world-links">
                  {menuHref && <span className="world-link-pill"><UtensilsCrossed aria-hidden="true" />Menú</span>}
                  {mapsHref && <span className="world-link-pill"><MapPin aria-hidden="true" />Cómo llegar</span>}
                  {waHref && <span className="world-link-pill"><MessageCircle aria-hidden="true" />WhatsApp</span>}
                  {igHref && <span className="world-link-pill"><Camera aria-hidden="true" />Instagram</span>}
                </div>
                {world.links.hours && (
                  <p className="world-hours"><Clock aria-hidden="true" />{world.links.hours}</p>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      <div className="preview-actions">
        <Button className="preview-stamp-button" type="button" variant="outline" size="sm" onClick={tryStamp}>
          <Plus aria-hidden="true" /> Probar sello
        </Button>
        {world.celebratePrize && (
          <Button type="button" variant="ghost" size="sm" onClick={testCelebration}>
            <Sparkles aria-hidden="true" /> Probar celebración
          </Button>
        )}
      </div>
    </aside>
  );
}
