import { maxCardStamps, stampWord, type CardDetails } from "./business-card";
import { prizeId } from "./prizes";

/**
 * Where a customer stands on a card. The owner may change the card after stamps were earned.
 * `redeemed` lists the prizes already delivered on the customer's current card.
 */
export function cardProgress(card: CardDetails, earned: number, redeemed: readonly string[] = []) {
  const total = Math.max(1, Math.min(maxCardStamps, Math.trunc(card.totalStamps) || 1));
  const stamps = Math.max(0, Math.min(earned, total));
  const goals = card.rewards.filter(({ stamps, name }) => stamps >= 1 && stamps <= total && name.trim())
    .sort((a, b) => a.stamps - b.stamps)
    .map((goal) => ({ ...goal, id: prizeId(goal), redeemed: redeemed.includes(prizeId(goal)) }));
  // Lowest first: prizes are delivered in this order.
  const ready = goals.filter((goal) => !goal.redeemed && stamps >= goal.stamps);
  const next = goals.find((goal) => !goal.redeemed && goal.stamps > stamps);
  return { total, stamps, goals, ready, next, remaining: next ? next.stamps - stamps : null };
}

/** Whether delivering this prize starts a new card, given the owner's setting. */
export function restartsCard(goals: { id: string }[], deliveredId: string, restartAfterFinalPrize: boolean) {
  return restartAfterFinalPrize && goals.at(-1)?.id === deliveredId;
}

export function missingStamps(count: number, card?: Pick<CardDetails, "world">) {
  const unit = stampWord(count, card);
  return count === 1 ? `Te falta 1 ${unit}` : `Te faltan ${count} ${unit}`;
}

/** What comes next, said to the customer or, at the kiosk, about them. */
export function nextStepText(
  card: CardDetails, earned: number, redeemed: readonly string[] = [], audience: "customer" | "staff" = "customer",
) {
  const { total, stamps, ready, next } = cardProgress(card, earned, redeemed);
  const forStaff = audience === "staff";
  const missing = (count: number) => forStaff ? missingStamps(count, card).replace(/^Te/, "Le") : missingStamps(count, card);
  if (next) return `${missing(next.stamps - stamps)} para ${next.name}`;
  if (stamps >= total) return forStaff ? "Completó su tarjeta" : "Completaste tu tarjeta";
  if (ready.length) return forStaff ? "Tiene un premio listo" : "Tienes un premio listo";
  return `${missing(total - stamps)} para completar ${forStaff ? "su" : "tu"} tarjeta`;
}
