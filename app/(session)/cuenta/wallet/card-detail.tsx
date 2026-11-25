"use client";

import {
  ArrowLeft, Camera, Check, Clock, Gift, Lock, MapPin, Maximize,
  MessageCircle, Sparkles, UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { InstallApp } from "@/components/pwa/install-app";
import {
  formatInstagramHref, formatWelcomeMessage, formatWhatsappHref, normalizeExternalUrl,
  stampWord, worldLook,
} from "@/lib/business-card";
import { cardProgress, missingStamps, nextStepText } from "@/lib/card-progress";
import { formatMemberCode, memberQrValue } from "@/lib/member-code";
import { triggerStampSensory } from "@/lib/world-fx";
import { buildWorldTheme } from "@/lib/world-theme";
import { BrandCelebration } from "../brand-celebration";
import { LoyaltyCard, useStampPlayback } from "../loyalty-card";
import { CardAlerts } from "./alerts";
import { CardLogo } from "./card-logo";
import { shortDate } from "./dates";
import { LeaveCard } from "./leave-card";
import { motionAllowed, openCardScreen, type Rect } from "./motion";
import { artOf, type WalletCard } from "./types";
import type { Push } from "./use-push";
import "../world-theme.css";

const joinedFormat = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });

export function CardDetail({ card, from, member, push, onBack, onShowQr, onLeave }: {
  card: WalletCard;
  push: Push;
  /** Where the card sat in the list when it was tapped, so it can open from there. */
  from?: Rect;
  member: string;
  onBack: () => void;
  onShowQr: () => void;
  onLeave: () => Promise<void>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const cardArea = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const { total, stamps, goals, ready } = cardProgress(card.details, card.stamps, card.redeemedPrizes);
  const lastPrize = card.history.at(0);
  // Opening a card replays its latest stamp; new ones play as staff add them.
  const play = useStampPlayback(stamps, true);
  const seenStamps = useRef(stamps);
  const { displayName, branch } = card.details;
  const world = worldLook(card.details);
  const theme = buildWorldTheme(card.details);
  // The latest stamp replays once the card has finished opening, where it can be seen.
  const [opened, setOpened] = useState(() => !motionAllowed());
  const [openedFrom] = useState(from);
  const [celebrationRun, setCelebrationRun] = useState(0);

  useLayoutEffect(() => {
    back.current?.focus({ preventScroll: true });
    if (!motionAllowed() || !root.current) return;
    return openCardScreen(root.current, openedFrom, () => setOpened(true));
  }, [openedFrom]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const usual = meta?.getAttribute("content");
    meta?.setAttribute("content", theme.statusBarColor);
    return () => { if (usual) meta?.setAttribute("content", usual); };
  }, [theme.statusBarColor]);

  // Bring the card into view and play sensory/celebration effects when a new stamp arrives live.
  useEffect(() => {
    if (stamps > seenStamps.current) {
      const previous = seenStamps.current;
      const unlockedPrize = goals.some((goal) => !goal.redeemed && goal.stamps > previous && goal.stamps <= stamps);
      cardArea.current?.scrollIntoView({ block: "nearest" });
      triggerStampSensory({ sound: world.sound, haptics: world.haptics, isPrize: unlockedPrize });
      if (unlockedPrize && world.celebratePrize) {
        const frame = requestAnimationFrame(() => setCelebrationRun((n) => n + 1));
        seenStamps.current = stamps;
        return () => cancelAnimationFrame(frame);
      }
    }
    seenStamps.current = stamps;
  }, [stamps, goals, world.sound, world.haptics, world.celebratePrize]);

  const menuHref = normalizeExternalUrl(world.links.menuUrl);
  const mapsHref = normalizeExternalUrl(world.links.mapsUrl);
  const waHref = formatWhatsappHref(world.links.whatsapp);
  const igHref = formatInstagramHref(world.links.instagram);
  const hasLinks = Boolean(menuHref || mapsHref || waHref || igHref || world.links.hours);
  const hasHero = Boolean(card.coverUrl || world.welcomeMessage || world.tagline);
  const greeting = world.welcomeMessage
    ? formatWelcomeMessage(world.welcomeMessage, member)
    : displayName;

  return (
    <div ref={root} className="wallet-detail world-shell" data-membership={card.membershipId}
      data-mood={world.mood} data-font={world.font} data-pattern={world.pattern} data-dark={theme.dark}
      style={theme.vars}>
      <div className="wallet-detail-backdrop world-backdrop" aria-hidden="true" />
      <BrandCelebration run={celebrationRun} colors={theme.confettiColors} />

      <header className="wallet-detail-bar">
        <button ref={back} type="button" className="wallet-icon-btn" onClick={onBack} aria-label="Volver a tus tarjetas">
          <ArrowLeft aria-hidden="true" />
        </button>
        <CardLogo card={card} />
        <div>
          <h1>{displayName}</h1>
          {branch && <span>{branch}</span>}
        </div>
        <button type="button" className="wallet-icon-btn" onClick={onShowQr} aria-label="Ver tu QR en pantalla completa">
          <Maximize aria-hidden="true" />
        </button>
      </header>

      <div className="wallet-detail-scroll">
        <div className="wallet-detail-body">
          {hasHero && (
            <section className="world-cover wallet-detail-hero wallet-enter" data-has-image={Boolean(card.coverUrl)}
              aria-label={`Bienvenida de ${displayName}`}>
              {card.coverUrl && (
                <>
                  <Image className="world-cover-img" src={card.coverUrl} alt="" fill sizes="(max-width: 960px) 100vw, 960px" unoptimized />
                  <div className="world-cover-scrim" aria-hidden="true" />
                </>
              )}
              <div className="world-cover-content">
                <span className="world-welcome-kicker">{branch ? `${displayName} · ${branch}` : displayName}</span>
                <p className="world-welcome-title">{greeting}</p>
                {world.tagline && <p className="world-welcome-sub">{world.tagline}</p>}
              </div>
            </section>
          )}

          <section ref={cardArea} className="wallet-detail-card" aria-label="Tu tarjeta">
            <LoyaltyCard card={card.details} art={artOf(card)} stamps={stamps} redeemed={card.redeemedPrizes}
              member={member} play={opened ? play : undefined}
              qr={{
                value: memberQrValue(card.code), caption: formatMemberCode(card.code),
                title: `Tu QR de ${displayName}`, onOpen: onShowQr,
              }} />
            <button type="button" className="wallet-btn wallet-enter" data-variant="world" onClick={onShowQr}>
              <Maximize aria-hidden="true" /> Mostrar mi QR en caja
            </button>
            {/* The open card hides the header, so the install offer comes along. */}
            <InstallApp className="wallet-detail-install wallet-enter" />
          </section>

          <div className="wallet-detail-info">
            {world.board && (
              <section className="world-board wallet-enter" aria-labelledby="world-board-heading">
                {world.board.badge && (
                  <div className="world-board-head">
                    <span className="world-board-badge"><Sparkles aria-hidden="true" />{world.board.badge}</span>
                  </div>
                )}
                <h2 id="world-board-heading" className="world-board-title">{world.board.title}</h2>
                {world.board.body && <p className="world-board-body">{world.board.body}</p>}
              </section>
            )}

            <section className="world-panel wallet-enter" aria-label="Tu avance">
              <div className="wallet-progress-top">
                <p><strong>{stamps}</strong><span>/{total}</span> {stampWord(total, card.details)}</p>
                {ready.length > 0 && (
                  <span className="wallet-chip" data-tone="shop">
                    <Gift aria-hidden="true" />{ready.length === 1 ? "Premio listo" : `${ready.length} premios listos`}
                  </span>
                )}
              </div>
              <div className="wallet-track" aria-hidden="true">
                <div style={{ transform: `scaleX(${stamps / total})` }} />
              </div>
              <p className="wallet-next">{nextStepText(card.details, stamps, card.redeemedPrizes)}</p>
              {card.completedCards > 0 && (
                <p className="wallet-since">
                  {card.completedCards === 1 ? "Ya completaste 1 tarjeta aquí." : `Ya completaste ${card.completedCards} tarjetas aquí.`}
                </p>
              )}
              {lastPrize && (
                <p className="wallet-since">Último premio canjeado: {lastPrize.prizeName} · {shortDate(lastPrize.at)}</p>
              )}
            </section>

            {goals.length > 0 && (
              <section className="world-panel wallet-enter" aria-labelledby="detail-rewards">
                <h2 id="detail-rewards">Premios</h2>
                <ul>
                  {goals.map((goal) => {
                    const state = goal.redeemed ? "redeemed" : stamps >= goal.stamps ? "ready" : "pending";
                    const Icon = { redeemed: Check, ready: Gift, pending: Lock }[state];
                    // The delivery on this card, for its date.
                    const delivery = goal.redeemed ? card.history.find(
                      (entry) => entry.prizeId === goal.id && entry.round === card.completedCards + 1,
                    ) : undefined;
                    const meta = state === "redeemed" ? delivery ? `Canjeado el ${shortDate(delivery.at)}` : "Ya lo canjeaste"
                      : state === "ready" ? "Muestra tu QR en caja" : missingStamps(goal.stamps - stamps, card.details);
                    return (
                      <li key={goal.id} className="wallet-reward" data-state={state}>
                        <span className="wallet-reward-icon"><Icon aria-hidden="true" /></span>
                        <div>
                          <strong>{goal.name}</strong>
                          <span>Con {goal.stamps} {stampWord(goal.stamps, card.details)} · {meta}</span>
                        </div>
                        <span className="wallet-chip" data-tone={state === "ready" ? "shop" : "muted"}>
                          {{ redeemed: "Canjeado", ready: "Listo", pending: "Pendiente" }[state]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {world.secretMenu.length > 0 && (
              <section className="world-panel wallet-enter" aria-labelledby="detail-secret-menu">
                <h2 id="detail-secret-menu">Menú secreto</h2>
                <ul className="world-secret-list">
                  {world.secretMenu.map((item) => {
                    const locked = item.minCompletedCards > card.completedCards;
                    const remainingCards = item.minCompletedCards - card.completedCards;
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
                              ? `Completa ${remainingCards} ${remainingCards === 1 ? "tarjeta más" : "tarjetas más"} para desbloquearlo`
                              : "Exclusivo para miembros · Pídelo en mostrador"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {hasLinks && (
              <section className="world-panel wallet-enter" aria-labelledby="detail-place">
                <h2 id="detail-place">El local</h2>
                <div className="world-links">
                  {menuHref && (
                    <a className="world-link-pill" href={menuHref} target="_blank" rel="noopener noreferrer">
                      <UtensilsCrossed aria-hidden="true" /> Ver menú
                    </a>
                  )}
                  {mapsHref && (
                    <a className="world-link-pill" href={mapsHref} target="_blank" rel="noopener noreferrer">
                      <MapPin aria-hidden="true" /> Cómo llegar
                    </a>
                  )}
                  {waHref && (
                    <a className="world-link-pill" href={waHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden="true" /> WhatsApp
                    </a>
                  )}
                  {igHref && (
                    <a className="world-link-pill" href={igHref} target="_blank" rel="noopener noreferrer">
                      <Camera aria-hidden="true" /> Instagram
                    </a>
                  )}
                </div>
                {world.links.hours && (
                  <p className="world-hours"><Clock aria-hidden="true" />{world.links.hours}</p>
                )}
              </section>
            )}

            <CardAlerts push={push} card={card} />

            <div className="wallet-membership wallet-enter">
              <p className="wallet-since">Miembro desde {joinedFormat.format(card.joinedAt)}</p>
              <LeaveCard businessName={displayName} stamps={stamps} onLeave={onLeave} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
