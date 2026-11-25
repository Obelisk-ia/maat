"use client";

import { Check, Gift } from "lucide-react";
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import type { StampAnimation } from "@/lib/business-card";
import type { StampIcon } from "@/lib/stamp-catalog";
import { playStampAnimation } from "./stamp-animations";
import { stampGlyphs } from "./stamp-icons";

const sparkPath = "M0-15Q2.5-2.5 15 0Q2.5 2.5 0 15Q-2.5 2.5-15 0Q-2.5-2.5 0-15Z";
const sparkSpots = ["translate(88 10)", "translate(6 38) scale(0.7)", "translate(80 92) scale(0.8)"];

/**
 * One stamp slot. Colors come from the --card-* and --stamped-* custom properties of an ancestor.
 * Change `playKey` to replay the animation; leave it undefined for a resting stamp.
 */
export function StampDisc({ icon, logo = null, filled, goalStamp, animation, playKey }: {
  icon: StampIcon;
  logo?: string | null;
  filled: boolean;
  /** The stamp number, when this slot is also a reward goal. */
  goalStamp?: number;
  animation: StampAnimation;
  playKey?: number;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const playing = filled && playKey !== undefined;
  const goal = goalStamp !== undefined;
  const Icon = goal ? (filled ? Check : Gift) : stampGlyphs[icon];

  useLayoutEffect(() => {
    if (!playing || !root.current) return;
    return playStampAnimation(root.current, animation);
  }, [playing, playKey, animation]);

  return (
    <span ref={root} className="business-card-stamp" data-filled={filled} data-goal={goal} data-playing={playing}>
      <span className="stamp-face" data-part="face">
        <span className="stamp-body" data-part="body">
          {playing && <span className="stamp-shine" data-part="shine" />}
        </span>
        <span className="stamp-mark" data-part="mark">
          {filled && logo && !goal ? <Image src={logo} alt="" width={72} height={72} unoptimized /> : <Icon />}
        </span>
      </span>
      {playing && (
        <svg className="stamp-fx" viewBox="0 0 100 100" aria-hidden="true">
          <circle data-part="ring" className="stamp-ring" cx="50" cy="50" r="48" />
          <circle data-part="ring" className="stamp-ring" cx="50" cy="50" r="48" />
          {Array.from({ length: 8 }, (_, index) => (
            <circle key={index} data-part="drop" className="stamp-drop" cx="50" cy="50" r="8" />
          ))}
          {sparkSpots.map((spot) => (
            <g key={spot} transform={spot}><path data-part="spark" className="stamp-spark" d={sparkPath} /></g>
          ))}
        </svg>
      )}
      {goal && <small>{goalStamp}</small>}
    </span>
  );
}
