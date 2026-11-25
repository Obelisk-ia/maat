// The wallet's movement, following the customer demo: a tapped card opens into its business's
// screen, and folds back into its place in the list.
import { gsap } from "gsap";

export type Rect = { left: number; top: number; width: number; height: number };

export const motionAllowed = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

/** Where an element is on screen, or undefined when it's hidden or scrolled out of sight. */
export function visibleRect(element: Element | null | undefined): Rect | undefined {
  if (!element) return undefined;
  const { left, top, width, height, bottom } = element.getBoundingClientRect();
  return width && bottom > 0 && top < window.innerHeight ? { left, top, width, height } : undefined;
}

const rounded = (hidden: number) => `inset(0px 0px ${hidden}px 0px round 16px)`;

/**
 * Opens a card's screen. With `from`, where the card sat in the list, the business's color grows
 * out of that spot while the card travels to its place and unfolds to show its prizes and QR.
 * Without it (a card just added), the screen's parts rise into place and the stamps pop in.
 */
export function openCardScreen(screen: HTMLElement, from: Rect | undefined, onOpened: () => void) {
  const card = screen.querySelector<HTMLElement>(".wallet-detail-card .business-card");
  const backdrop = screen.querySelector(".wallet-detail-backdrop");
  const bar = screen.querySelector(".wallet-detail-bar");
  const rest = screen.querySelectorAll(".wallet-enter");
  const fill = screen.querySelector<HTMLElement>(".wallet-track div");
  // Its CSS transition, used for live stamps, would fight the animation.
  const settle = () => { if (fill) fill.style.transition = ""; };

  const context = gsap.context(() => {
    const timeline = gsap.timeline({ onComplete: () => { settle(); onOpened(); } });
    let fillStart = 0.14;

    if (from && card && backdrop) {
      const to = card.getBoundingClientRect();
      const pane = screen.getBoundingClientRect();
      const scale = from.width / to.width;
      timeline.fromTo(backdrop, {
        x: from.left - pane.left, y: from.top - pane.top,
        scaleX: from.width / pane.width, scaleY: from.height / pane.height, transformOrigin: "0 0", borderRadius: 22,
      }, {
        x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 0, duration: 0.46, ease: "power3.inOut",
        clearProps: "transform,transformOrigin,borderRadius",
      }, 0);
      timeline.fromTo(card,
        { x: from.left - to.left, y: from.top - to.top, scale, transformOrigin: "0 0" },
        { x: 0, y: 0, scale: 1, duration: 0.46, ease: "power3.inOut", clearProps: "transform,transformOrigin" }, 0);
      // The list shows only the top of the card; the rest unfolds from under it.
      timeline.fromTo(card, { clipPath: rounded(Math.max(0, to.height - from.height / scale)) },
        { clipPath: rounded(0), duration: 0.48, ease: "power2.inOut", clearProps: "clipPath" }, 0.12);
      // The clip hid the shadow, so it eases in afterwards.
      timeline.from(card, { boxShadow: "0 12px 24px rgba(38, 24, 15, 0)", duration: 0.2, clearProps: "boxShadow" }, 0.6);
      timeline.fromTo([bar, ...rest], { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out", clearProps: "transform,opacity" }, 0.34);
      fillStart = 0.44;
    } else {
      timeline.fromTo(bar, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out", clearProps: "opacity" }, 0);
      timeline.fromTo([card, ...rest], { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.34, stagger: 0.04, ease: "power2.out", clearProps: "transform,opacity" }, 0.02);
      const earned = card?.querySelectorAll('.business-card-stamp[data-filled="true"]');
      if (earned?.length) {
        timeline.fromTo(earned, { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.24, stagger: 0.03, ease: "back.out(2.2)", clearProps: "transform,opacity" }, 0.12);
      }
    }

    if (fill) {
      const share = gsap.getProperty(fill, "scaleX") as number;
      fill.style.transition = "none";
      // Left in place afterwards: the width belongs to the page's own style.
      timeline.fromTo(fill, { scaleX: 0 }, { scaleX: share, duration: 0.4, ease: "power2.out" }, fillStart);
    }
  }, screen);

  return () => {
    context.revert();
    settle();
  };
}

/** Back in the list, the card travels from where it was on its screen, folding up as it lands. */
export function foldCardIntoList(list: HTMLElement, membershipId: string, from: Rect) {
  const item = list.querySelector(`[data-card="${membershipId}"]`)?.closest<HTMLElement>(".wallet-item");
  const card = item?.querySelector<HTMLElement>(".business-card");
  if (!item || !card) return;
  const to = card.getBoundingClientRect();
  if (!to.width) return;
  const scale = from.width / to.width;
  const extra = Math.max(0, from.height / scale - to.height);
  // The hover lift's CSS transition would fight the animation.
  const settle = () => { card.style.transition = ""; };
  card.style.transition = "none";

  const context = gsap.context(() => {
    gsap.set(item, { zIndex: 5 });
    gsap.fromTo(card,
      // The negative margin keeps the rest of the list still while the card is tall.
      { x: from.left - to.left, y: from.top - to.top, scale, transformOrigin: "0 0", height: to.height + extra, marginBottom: -extra },
      {
        x: 0, y: 0, scale: 1, height: to.height, marginBottom: 0, duration: 0.42, ease: "power3.out",
        clearProps: "transform,transformOrigin,height,marginBottom",
        onComplete: () => { settle(); gsap.set(item, { clearProps: "zIndex" }); },
      });
    const others = [...list.querySelectorAll(".wallet-head, .wallet-item")].filter((element) => element !== item);
    gsap.fromTo([...others, item.querySelector(".wallet-item-meta")], { opacity: 0 },
      { opacity: 1, duration: 0.26, delay: 0.14, ease: "power1.out", clearProps: "opacity" });
  }, list);

  return () => {
    context.revert();
    settle();
  };
}

/** A section fades up when the customer switches to it. */
export function enterSection(section: Element) {
  const context = gsap.context(() => {
    gsap.fromTo(section, { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.24, ease: "power2.out", clearProps: "transform,opacity" });
  });
  return () => context.revert();
}
