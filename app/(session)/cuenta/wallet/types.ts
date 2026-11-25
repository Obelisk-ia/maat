import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type WalletCard = FunctionReturnType<typeof api.memberships.mine>[number];

export type Customer = { name: string; email: string; phone: string };

export function artOf(card: WalletCard) {
  return { logo: card.logoUrl, background: card.backgroundUrl, stampLogo: card.stampLogoUrl };
}
