"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { stampedLook, type CardDetails } from "@/lib/business-card";
import { cardProgress } from "@/lib/card-progress";
import { LoyaltyCard, type CardArt, type StampPlay } from "./loyalty-card";

export function CardPreview({ card, logo, background, stampLogo }: { card: CardDetails } & CardArt) {
  const [stampCount, setStampCount] = useState<number>();
  const { total } = cardProgress(card, 0);
  const stamps = Math.min(stampCount ?? Math.max(0, total - 3), total);
  const { animation } = stampedLook(card);
  const [play, setPlay] = useState<StampPlay>({ stamp: 0, run: 0 });
  const [seenAnimation, setSeenAnimation] = useState(animation);
  // Picking another animation replays it on the latest stamp.
  if (animation !== seenAnimation) {
    setSeenAnimation(animation);
    setPlay({ stamp: stamps, run: play.run + 1 });
  }

  function tryStamp() {
    const next = stamps >= total ? 0 : stamps + 1;
    setStampCount(next);
    setPlay({ stamp: next, run: play.run + 1 });
  }

  return (
    <aside className="card-preview" aria-labelledby="preview-title" data-long={total > 30}>
      <h2 id="preview-title">Vista previa</h2>
      <LoyaltyCard card={card} art={{ logo, background, stampLogo }} stamps={stamps} member="Sandra" play={play}
        qr={{ value: "MAAT:PREVIEW", caption: "PSL-104 · Ejemplo", title: "QR de ejemplo" }} />
      <Button className="preview-stamp-button" type="button" variant="outline" size="sm" onClick={tryStamp}>
        <Plus aria-hidden="true" /> Probar sello
      </Button>
    </aside>
  );
}
