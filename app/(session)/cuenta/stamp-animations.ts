import { gsap } from "gsap";
import type { StampAnimation } from "@/lib/business-card";

// Parts of a StampDisc. The face holds the filled body and its mark; the rest are effects.
type Parts = {
  face: Element;
  body: Element;
  mark: Element;
  shine: Element;
  rings: Element[];
  sparks: Element[];
  drops: Element[];
};

const timelines: Record<StampAnimation, (timeline: gsap.core.Timeline, parts: Parts) => void> = {
  // A rubber stamp slams down, the disc squashes and a shock ring escapes.
  press(timeline, { face, body, mark, rings }) {
    timeline
      .set(body, { opacity: 0 })
      .fromTo(mark, { scale: 2.6, rotation: -24, yPercent: -22, opacity: 0 },
        { scale: 1, rotation: 0, yPercent: 0, opacity: 1, duration: 0.34, ease: "power4.in" })
      .set(body, { opacity: 1 })
      .fromTo(face, { scale: 0.78 },
        { scale: 1, duration: 0.6, ease: "elastic.out(1.1, 0.45)", immediateRender: false }, "<")
      .fromTo(rings[0], { attr: { r: 48 }, opacity: 0.9 },
        { attr: { r: 82 }, opacity: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, "<");
  },
  // The fill grows from the center while two waves travel outward.
  ripple(timeline, { body, mark, rings }) {
    timeline
      .fromTo(body, { scale: 0 }, { scale: 1, duration: 0.55, ease: "power3.out" }, 0)
      .fromTo(rings, { attr: { r: 8 }, opacity: 1 },
        { attr: { r: 84 }, opacity: 0, duration: 0.85, stagger: 0.18, ease: "power2.out", immediateRender: false }, 0)
      .fromTo(mark, { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2.4)" }, 0.22);
  },
  // The stamp pops in, light sweeps across it and sparkles twinkle around.
  glint(timeline, { face, shine, sparks }) {
    timeline
      .fromTo(face, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, 0)
      .fromTo(shine, { xPercent: -160, skewX: -20, opacity: 1 },
        { xPercent: 320, skewX: -20, opacity: 1, duration: 0.65, ease: "power2.inOut", immediateRender: false }, 0.22)
      .set(shine, { opacity: 0 })
      .fromTo(sparks, { scale: 0, rotation: -90, opacity: 1, transformOrigin: "50% 50%" },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.3, stagger: 0.12, ease: "back.out(3)", immediateRender: false }, 0.35)
      .to(sparks, { scale: 0, rotation: 60, opacity: 0, duration: 0.28, stagger: 0.12, ease: "power2.in" }, 0.75);
  },
  // The stamp spins in the air like a coin and bounces into its slot.
  flip(timeline, { face }) {
    timeline
      .fromTo(face, { rotationY: -540, transformPerspective: 400 },
        { rotationY: 0, transformPerspective: 400, duration: 0.95, ease: "power2.out" }, 0)
      .fromTo(face, { yPercent: 0, scale: 0.7 }, { yPercent: -38, scale: 1.22, duration: 0.4, ease: "power2.out" }, 0)
      .to(face, { yPercent: 0, scale: 1, duration: 0.55, ease: "bounce.out" }, 0.4);
  },
  // An uneven ink blot lands, throws droplets and settles while the mark soaks in.
  ink(timeline, { body, mark, drops }) {
    timeline
      .fromTo(body, { scale: 0.15, borderRadius: "34% 66% 58% 42% / 55% 38% 62% 45%" },
        { scale: 1, borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%", duration: 0.8, ease: "elastic.out(1, 0.55)" }, 0)
      .fromTo(mark, { opacity: 0, scale: 1.35, filter: "blur(4px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "power2.out" }, 0.18);
    drops.forEach((drop, index) => {
      const angle = (index / drops.length) * Math.PI * 2 + 0.4;
      const reach = index % 2 ? 66 : 82;
      const radius = index % 2 ? 8 : 12;
      // Droplets fly out first and only then dry up, so they stay visible past the blot.
      timeline
        .fromTo(drop, { attr: { cx: 50, cy: 50, r: radius }, opacity: 1 }, {
          attr: { cx: 50 + Math.cos(angle) * reach, cy: 50 + Math.sin(angle) * reach },
          opacity: 1, duration: 0.42, ease: "power3.out", immediateRender: false,
        }, 0.08)
        .to(drop, { attr: { r: 0 }, duration: 0.35, ease: "power2.in" }, 0.45);
    });
  },
};

/** Plays an animation on one StampDisc and returns a function that restores its resting styles. */
export function playStampAnimation(root: HTMLElement, animation: StampAnimation) {
  const context = gsap.context(() => {
    const one = (part: string) => root.querySelector(`[data-part="${part}"]`)!;
    const all = (part: string) => Array.from(root.querySelectorAll(`[data-part="${part}"]`));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(one("face"), { opacity: 0 }, { opacity: 1, duration: 0.25 });
      return;
    }

    timelines[animation](gsap.timeline(), {
      face: one("face"), body: one("body"), mark: one("mark"), shine: one("shine"),
      rings: all("ring"), sparks: all("spark"), drops: all("drop"),
    });
  }, root);
  return () => context.revert();
}
