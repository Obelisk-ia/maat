import { Check, QrCode } from "lucide-react";
import { stampWord } from "@/lib/business-card";
import { cardProgress, missingStamps } from "@/lib/card-progress";
import { CardLogo } from "./card-logo";
import { shortDate } from "./dates";
import type { WalletCard } from "./types";

export function RewardsPage({ cards, onShowQr }: { cards: WalletCard[]; onShowQr: (membershipId: string) => void }) {
  const progress = cards.map((card) => ({ card, ...cardProgress(card.details, card.stamps, card.redeemedPrizes) }));
  const ready = progress.flatMap(({ card, ready }) => ready.map((goal) => ({ card, goal })));
  const upcoming = progress.filter(({ next }) => next);
  const redeemed = cards.flatMap((card) => card.history.map((entry) => ({ card, entry })))
    .sort((a, b) => b.entry.at - a.entry.at);

  return (
    <div className="wallet-page">
      <header className="wallet-head">
        <div>
          <h1>Premios</h1>
          <p>Muestra tu QR en caja para canjear.</p>
        </div>
      </header>
      <section aria-labelledby="rewards-ready">
        <h2 id="rewards-ready">Listos {ready.length > 0 && <span className="wallet-badge">{ready.length}</span>}</h2>
        {ready.length === 0 ? <p className="wallet-help">Todavía no tienes premios listos.</p> : (
          <ul>
            {ready.map(({ card, goal }) => (
              <li key={`${card.membershipId}-${goal.id}`} className="wallet-row">
                <CardLogo card={card} />
                <div>
                  <strong>{goal.name}</strong>
                  <span>{card.details.displayName} · Con {goal.stamps} {stampWord(goal.stamps, card.details)}</span>
                </div>
                <button type="button" className="wallet-btn" onClick={() => onShowQr(card.membershipId)}
                  aria-label={`Mostrar QR para canjear ${goal.name} en ${card.details.displayName}`}>
                  <QrCode aria-hidden="true" /> Mostrar QR
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="rewards-next">
        <h2 id="rewards-next">Próximos</h2>
        {upcoming.length === 0 ? <p className="wallet-help">No tienes premios pendientes.</p> : (
          <ul>
            {upcoming.map(({ card, next, stamps }) => (
              <li key={card.membershipId} className="wallet-row">
                <CardLogo card={card} />
                <div>
                  <strong>{next!.name}</strong>
                  <span>{card.details.displayName} · {missingStamps(next!.stamps - stamps, card.details)}</span>
                </div>
                <span className="wallet-mini-bar" aria-hidden="true">
                  <i style={{ transform: `scaleX(${stamps / next!.stamps})`, background: card.details.colors.background }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="rewards-done">
        <h2 id="rewards-done">Canjeados</h2>
        {redeemed.length === 0 ? <p className="wallet-help">Aún no canjeas ningún premio.</p> : (
          <ul>
            {redeemed.map(({ card, entry }) => (
              <li key={entry.id} className="wallet-row">
                <CardLogo card={card} />
                <div>
                  <strong>{entry.prizeName}</strong>
                  <span>{card.details.displayName} · {shortDate(entry.at)} · Te atendió {entry.deliveredBy}</span>
                </div>
                <span className="wallet-reward-done"><Check aria-hidden="true" /><span className="sr-only">Canjeado</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
