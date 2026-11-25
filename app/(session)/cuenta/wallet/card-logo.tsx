import Image from "next/image";
import { stampGlyphs } from "../stamp-icons";
import type { WalletCard } from "./types";

/** The business's mark: its logo, or its stamp icon in its card colors. */
export function CardLogo({ card }: { card: WalletCard }) {
  const Icon = stampGlyphs[card.details.stampIcon];
  return (
    <span className="wallet-logo" data-image={Boolean(card.logoUrl)} aria-hidden="true"
      style={{ backgroundColor: card.logoUrl ? "#fff" : card.details.colors.background, color: card.details.colors.accent }}>
      {card.logoUrl ? <Image src={card.logoUrl} alt="" width={48} height={48} unoptimized /> : <Icon />}
    </span>
  );
}
