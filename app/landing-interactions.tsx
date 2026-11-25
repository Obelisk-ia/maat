"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";

export function LandingMotion({ children }: { children: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = page.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const motion = gsap.matchMedia(root);
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".gsap-hero", {
        y: 22, opacity: 0, duration: 0.72, stagger: 0.08,
        ease: "power3.out", clearProps: "transform,opacity",
      });
      gsap.from(".gsap-hero-card", {
        y: 28, opacity: 0, duration: 0.85, delay: 0.18,
        ease: "power3.out", clearProps: "transform,opacity",
      });
      for (const el of root.querySelectorAll(".gsap-reveal")) {
        gsap.from(el, {
          y: 24, opacity: 0, duration: 0.65,
          ease: "power2.out", clearProps: "transform,opacity",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        });
      }
      for (const { target, trigger, y, duration, stagger } of [
        { target: ".gsap-step", trigger: ".steps-grid", y: 22, duration: 0.6, stagger: 0.1 },
        { target: ".gsap-milestone", trigger: ".milestone-rail", y: 24, duration: 0.62, stagger: 0.1 },
        { target: ".gsap-role", trigger: ".role-split", y: 24, duration: 0.65, stagger: 0.12 },
      ]) {
        gsap.from(target, {
          y, opacity: 0, duration, stagger, ease: "power2.out", clearProps: "transform,opacity",
          scrollTrigger: { trigger, start: "top 84%", once: true },
        });
      }
      gsap.fromTo(".client-band-img", { scale: 1.08 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: ".client-band", start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.fromTo(".frieze img", { yPercent: -6, scale: 1.12 }, {
        yPercent: 6, scale: 1.12, ease: "none",
        scrollTrigger: { trigger: ".frieze", start: "top bottom", end: "bottom top", scrub: true },
      });
    });
    return () => motion.revert();
  }, []);

  return <div ref={page} className="landing-page">{children}</div>;
}
