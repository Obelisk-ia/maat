import { ChevronRight, Gift, Plus, ScanLine } from "lucide-react";
import type { CSSProperties } from "react";
import { cardProgress, nextStepText } from "@/lib/card-progress";
import { LoyaltyCard, useStampPlayback } from "../loyalty-card";
import { artOf, type WalletCard } from "./types";

function CardItem({ card, member, index, onOpen }: {
  card: WalletCard;
  member: string;
  index: number;
  onOpen: () => void;
}) {
  const { stamps, ready } = cardProgress(card.details, card.stamps, card.redeemedPrizes);
  const play = useStampPlayback(stamps);

  return (
    <li className="wallet-item" style={{ "--index": index } as CSSProperties}>
      <LoyaltyCard compact card={card.details} art={artOf(card)} stamps={stamps} redeemed={card.redeemedPrizes}
        member={member} play={play} />
      <div className="wallet-item-meta">
        <div>
          <strong>{card.details.displayName}</strong>
          <span>{nextStepText(card.details, stamps, card.redeemedPrizes)}</span>
        </div>
        {ready.length
          ? <span className="wallet-chip"><Gift aria-hidden="true" />{ready.length === 1 ? "Premio listo" : `${ready.length} premios`}</span>
          : <ChevronRight aria-hidden="true" />}
      </div>
      {/* Covers the whole item; the card itself holds block content a button can't contain. */}
      <button type="button" className="wallet-item-open" data-card={card.membershipId} onClick={onOpen}>
        <span className="sr-only">Abrir tarjeta de {card.details.displayName}</span>
      </button>
    </li>
  );
}

export function CardList({ cards, name, onOpen, onAdd }: {
  cards: WalletCard[];
  name: string;
  onOpen: (membershipId: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="wallet-list">
      <header className="wallet-head">
        <div>
          <p>Hola, {name.split(" ")[0]}</p>
          <h1>Tus tarjetas</h1>
        </div>
        <button type="button" className="wallet-btn" data-variant="secondary" onClick={onAdd}>
          <Plus aria-hidden="true" /> Agregar
        </button>
      </header>
      {cards.length === 0 ? (
        <div className="wallet-empty">
          <h2>Aún no tienes tarjetas</h2>
          <p>Escanea el QR del mostrador de tu negocio favorito y su tarjeta aparecerá aquí al instante.</p>
          <button type="button" className="wallet-btn" onClick={onAdd}>
            <ScanLine aria-hidden="true" /> Agregar mi primera tarjeta
          </button>
        </div>
      ) : (
        <ul className="wallet-grid">
          {cards.map((card, index) => (
            <CardItem key={card.membershipId} card={card} member={name} index={index} onOpen={() => onOpen(card.membershipId)} />
          ))}
        </ul>
      )}
    </div>
  );
}
