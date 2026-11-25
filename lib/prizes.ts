// Prizes keep an ID of their own, so a redeemed one stays redeemed when the owner renames or moves it.

type Reward = { id?: string; stamps: number; name: string };

/** Prizes saved before they had IDs are known by the stamp they were on. */
export function prizeId(reward: Reward) {
  return reward.id ?? `s${reward.stamps}`;
}

export function randomPrizeId() {
  // getRandomValues also works on plain-HTTP pages, where randomUUID doesn't exist.
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const isPrizeId = (id: string) => /^[a-z0-9]{1,32}$/i.test(id);

/** Gives every prize its ID, so the card editor keeps it through renames and moves. */
export function withPrizeIds<Card extends { rewards: Reward[] }>(card: Card): Card {
  return { ...card, rewards: card.rewards.map((reward) => ({ ...reward, id: prizeId(reward) })) };
}

/**
 * IDs for a card being saved. A prize that arrives without one (from a page opened before prizes
 * had IDs) takes the ID the saved card had on that stamp.
 */
export function assignPrizeIds(rewards: Reward[], saved: Reward[]) {
  const used = new Set<string>();
  const sent = new Set(rewards.map((reward) => reward.id));
  return rewards.map((reward) => {
    let id = reward.id;
    if (id === undefined) {
      const earlier = saved.find((other) => other.stamps === reward.stamps);
      if (earlier && !sent.has(prizeId(earlier))) id = prizeId(earlier);
    }
    if (id === undefined || !isPrizeId(id) || used.has(id)) id = randomPrizeId();
    used.add(id);
    return { ...reward, id };
  });
}
