"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useState, type CSSProperties } from "react";
import { defaultBackgroundTint, stampedLook, stampFillColor, type CardDetails } from "@/lib/business-card";
import { cardProgress } from "@/lib/card-progress";
import { StampDisc } from "./stamp-disc";
import { stampGlyphs } from "./stamp-icons";
import "./loyalty-card.css";

export type CardArt = { logo: string | null; background: string | null; stampLogo: string | null };

/** Which stamp is animating. A new run number plays it again. */
export type StampPlay = { stamp: number; run: number };

/** Plays the owner's animation whenever the count goes up. */
export function useStampPlayback(stamps: number, playLatestOnMount = false) {
  const [play, setPlay] = useState<StampPlay>({ stamp: playLatestOnMount ? stamps : 0, run: 0 });
  const [seen, setSeen] = useState(stamps);
  if (stamps !== seen) {
    setSeen(stamps);
    if (stamps > seen) setPlay({ stamp: stamps, run: play.run + 1 });
  }
  return play;
}

function balancedStampRows(total: number) {
  const rowCount = Math.ceil(total / (total > 24 ? 8 : 6));
  const stampsPerRow = Math.floor(total / rowCount);
  const extra = total % rowCount;
  const lengths = Array<number>(rowCount).fill(stampsPerRow);
  const hasSingleExtra = extra % 2 === 1;
  if (hasSingleExtra) lengths[Math.floor((rowCount - 1) / 2)]++;

  // Add matching stamps on either side of the middle whenever the total allows.
  const pairStart = Math.floor(rowCount / 2) - 1 - Number(hasSingleExtra && rowCount % 2 === 0);
  for (let pair = 0; pair < Math.floor(extra / 2); pair++) {
    const upper = pairStart - pair;
    lengths[upper]++;
    lengths[rowCount - upper - 1]++;
  }

  let stamp = 1;
  return lengths.map((length) => Array.from({ length }, () => stamp++));
}

export function LoyaltyCard({ card, art, stamps: earned, redeemed, member, qr, play, compact = false }: {
  card: CardDetails;
  art: CardArt;
  stamps: number;
  /** Prizes already delivered on this card. */
  redeemed?: readonly string[];
  member: string;
  qr?: { value: string; caption: string; title: string; onOpen?: () => void };
  play?: StampPlay;
  /** Leaves out the prizes, summary and QR, for lists. */
  compact?: boolean;
}) {
  const { total, stamps, goals, ready, next, remaining } = cardProgress(card, earned, redeemed);
  // With nothing further to earn, a prize still waiting is the one to name.
  const waiting = next ? undefined : ready[0];
  const Icon = stampGlyphs[card.stampIcon];
  const stamped = stampedLook(card);
  const goalsByStamp = new Set(goals.map((goal) => goal.stamps));
  const rows = balancedStampRows(total);
  const code = qr && <QRCodeSVG value={qr.value} size={86} marginSize={2} title={qr.title} />;

  return (
    <div className="business-card" data-image={Boolean(art.background)} style={{
      "--card-bg": card.colors.background,
      "--card-accent": card.colors.accent,
      "--card-ink": card.colors.text,
      "--card-stamp-fill": stampFillColor(card.colors),
      "--stamped-color": stamped.color,
      "--stamped-fill": stamped.fill,
      "--card-tint": (card.backgroundTint ?? defaultBackgroundTint) / 100,
      "--stamp-columns": Math.max(...rows.map((row) => row.length)),
    } as CSSProperties}>
      {art.background && <Image className="business-card-image" src={art.background} alt=""
        fill sizes="(max-width: 465px) 100vw, 420px" unoptimized />}
      <div className="business-card-content">
        <div className="business-card-header">
          <div className="business-card-identity">
            <div className="business-card-logo">
              {art.logo ? <Image src={art.logo} alt="" width={36} height={36} unoptimized /> : <Icon aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <strong>{card.displayName.trim() || "Tu negocio"}</strong>
              {card.branch.trim() && <span>{card.branch}</span>}
            </div>
          </div>
          <div className="business-card-count" aria-live="polite">
            <span>Sellos</span>
            <strong>{stamps}/{total}</strong>
          </div>
        </div>

        <div className="business-card-stamps" aria-hidden="true">
          {rows.map((row) => (
            <div className="business-card-stamp-row" key={row[0]}>
              {row.map((stamp) => {
                const filled = stamp <= stamps;
                return (
                  <StampDisc key={stamp} filled={filled}
                    icon={filled ? stamped.icon : card.stampIcon} logo={art.stampLogo}
                    goalStamp={goalsByStamp.has(stamp) ? stamp : undefined}
                    animation={stamped.animation} playKey={play?.stamp === stamp ? play.run : undefined} />
                );
              })}
            </div>
          ))}
        </div>

        {!compact && goals.length > 0 && (
          <ul className="business-card-prize-list" aria-label="Metas de premios">
            {goals.map((goal) => (
              <li key={goal.id} data-state={goal.redeemed ? "redeemed" : stamps >= goal.stamps ? "ready" : "pending"}>
                <span>{goal.redeemed ? <Check aria-hidden="true" /> : <>{goal.stamps}<Icon aria-hidden="true" /></>}</span>
                <span>{goal.name}</span>
                {goal.redeemed && <span className="sr-only">. Premio canjeado.</span>}
                {!goal.redeemed && stamps >= goal.stamps && <span className="sr-only">. Premio listo.</span>}
              </li>
            ))}
          </ul>
        )}

        {!compact && (
          <dl className="business-card-summary" aria-live="polite">
            <div><dt>Siguiente premio</dt><dd>{next?.name ?? waiting?.name ?? (goals.length ? "Metas completas" : "—")}</dd></div>
            <div><dt>Te faltan</dt><dd>
              {remaining !== null ? `${remaining} ${remaining === 1 ? "sello" : "sellos"}` : waiting ? "¡Listo!" : "—"}
            </dd></div>
            <div><dt>Miembro</dt><dd>{member}</dd></div>
          </dl>
        )}

        {!compact && qr && (
          <figure className="business-card-qr">
            {qr.onOpen ? <button type="button" onClick={qr.onOpen} aria-label="Ver tu QR en pantalla completa">{code}</button> : code}
            <figcaption>{qr.caption}</figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}
