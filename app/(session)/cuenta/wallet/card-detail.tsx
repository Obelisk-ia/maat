"use client";

import { ArrowLeft, Check, Gift, Lock, Maximize } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { InstallApp } from "@/components/pwa/install-app";
import { cardProgress, missingStamps, nextStepText } from "@/lib/card-progress";
import { formatMemberCode, memberQrValue } from "@/lib/member-code";
import { LoyaltyCard, useStampPlayback } from "../loyalty-card";
import { CardLogo } from "./card-logo";
import { shortDate } from "./dates";
import { motionAllowed, openCardScreen, type Rect } from "./motion";
import { LeaveCard } from "./leave-card";
import { artOf, type WalletCard } from "./types";

/** The screen's tint, as the CSS mixes it, for the phone's status bar. */
function screenTint(color: string) {
  const channels = [[1, 0xf7], [3, 0xf3], [5, 0xea]].map(([start, cream]) =>
    Math.round(cream + (Number.parseInt(color.slice(start, start + 2), 16) - cream) * 0.14).toString(16).padStart(2, "0"));
  return `#${channels.join("")}`;
}

const joinedFormat = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });

export function CardDetail({ card, from, member, onBack, onShowQr, onLeave }: {
  card: WalletCard;
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
  const { colors, displayName, branch } = card.details;
  // The latest stamp replays once the card has finished opening, where it can be seen.
  const [opened, setOpened] = useState(() => !motionAllowed());
  const [openedFrom] = useState(from);

  useLayoutEffect(() => {
    back.current?.focus({ preventScroll: true });
    if (!motionAllowed() || !root.current) return;
    return openCardScreen(root.current, openedFrom, () => setOpened(true));
  }, [openedFrom]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const usual = meta?.getAttribute("content");
    meta?.setAttribute("content", screenTint(colors.background));
    return () => { if (usual) meta?.setAttribute("content", usual); };
  }, [colors.background]);

  // Bring the card into view so the customer sees a new stamp land.
  useEffect(() => {
    if (stamps > seenStamps.current) cardArea.current?.scrollIntoView({ block: "nearest" });
    seenStamps.current = stamps;
  }, [stamps]);

  return (
    <div ref={root} className="wallet-detail" data-membership={card.membershipId} style={{
      "--shop-card": colors.background,
      "--shop-card-ink": colors.text,
    } as CSSProperties}>
      <div className="wallet-detail-backdrop" aria-hidden="true" />
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
          <section ref={cardArea} className="wallet-detail-card" aria-label="Tu tarjeta">
            <LoyaltyCard card={card.details} art={artOf(card)} stamps={stamps} redeemed={card.redeemedPrizes}
              member={member} play={opened ? play : undefined}
              qr={{
                value: memberQrValue(card.code), caption: formatMemberCode(card.code),
                title: `Tu QR de ${displayName}`, onOpen: onShowQr,
              }} />
            <button type="button" className="wallet-btn wallet-enter" data-variant="dark" onClick={onShowQr}>
              <Maximize aria-hidden="true" /> Mostrar mi QR en caja
            </button>
            {/* The open card hides the header, so the install offer comes along. */}
            <InstallApp className="wallet-detail-install wallet-enter" />
          </section>

          <div className="wallet-detail-info">
            <section className="wallet-enter" aria-label="Tu avance">
              <div className="wallet-progress-top">
                <p><strong>{stamps}</strong><span>/{total}</span> sellos</p>
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
              <section className="wallet-enter" aria-labelledby="detail-rewards">
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
                      : state === "ready" ? "Muestra tu QR en caja" : missingStamps(goal.stamps - stamps);
                    return (
                      <li key={goal.id} className="wallet-reward" data-state={state}>
                        <span className="wallet-reward-icon"><Icon aria-hidden="true" /></span>
                        <div>
                          <strong>{goal.name}</strong>
                          <span>A los {goal.stamps} sellos · {meta}</span>
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
