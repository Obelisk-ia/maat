"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  shape: "rect" | "circle";
  life: number;
  maxLife: number;
};

/** Full-container brand-colored confetti burst when a stamp unlocks a prize. */
export function BrandCelebration({ run, colors }: { run: number; colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (run <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (!width || !height) return;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const palette = colors.length > 0 ? colors : ["#f4c27f", "#7d4420", "#ffffff"];
    const count = Math.min(84, Math.max(46, Math.round(width / 8)));
    const originY = Math.min(height * 0.36, 280);
    const particles: Particle[] = Array.from({ length: count }, (_, index) => {
      const fromLeft = index % 2 === 0;
      const spread = (Math.random() - 0.5) * 1.1;
      const baseAngle = fromLeft ? -Math.PI * 0.34 : -Math.PI * 0.66;
      const angle = baseAngle + spread * 0.45;
      const speed = 5 + Math.random() * 8.5;
      return {
        x: fromLeft ? width * 0.16 : width * 0.84,
        y: originY + (Math.random() - 0.5) * 32,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 5 + Math.random() * 6,
        color: palette[index % palette.length],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.24,
        shape: index % 3 === 0 ? "circle" : "rect",
        life: 0,
        maxLife: 88 + Math.random() * 44,
      };
    });

    let rafId = 0;
    const frame = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = 0;
      for (const p of particles) {
        p.life += 1;
        if (p.life >= p.maxLife) continue;
        alive += 1;
        p.vy += 0.22;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        const alpha = p.life > p.maxLife * 0.7
          ? Math.max(0, 1 - (p.life - p.maxLife * 0.7) / (p.maxLife * 0.3))
          : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size * 0.32, p.size, p.size * 0.64);
        }
        ctx.restore();
      }
      if (alive > 0) rafId = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, width, height);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [run, colors]);

  return <canvas ref={canvasRef} className="world-celebration" aria-hidden="true" />;
}
