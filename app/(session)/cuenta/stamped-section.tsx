"use client";

import { Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cardImageTypes, stampAnimations, stampedLook, stampFillColor,
  type CardDetails, type StampAnimation,
} from "@/lib/business-card";
import { StampDisc } from "./stamp-disc";
import { StampPicker } from "./stamp-picker";

const animations = Object.keys(stampAnimations) as StampAnimation[];

export function StampedSection({ card, logo, onChange, onChooseLogo, onRemoveLogo }: {
  card: CardDetails;
  logo: string | null;
  onChange: (stamped: NonNullable<CardDetails["stamped"]>) => void;
  onChooseLogo: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}) {
  const logoInput = useRef<HTMLInputElement>(null);
  const [play, setPlay] = useState<{ animation: StampAnimation; run: number }>();
  const look = stampedLook(card);
  const lookStyle = {
    "--card-bg": card.colors.background,
    "--card-accent": card.colors.accent,
    "--card-stamp-fill": stampFillColor(card.colors),
    "--stamped-color": look.color,
    "--stamped-fill": look.fill,
  } as CSSProperties;

  function update(changes: CardDetails["stamped"]) {
    onChange({ ...card.stamped, ...changes });
  }

  function preview(animation: StampAnimation) {
    setPlay((current) => ({ animation, run: (current?.run ?? 0) + 1 }));
  }

  return (
    <section className="studio-section" aria-labelledby="stamped-title">
      <div>
        <h2 id="stamped-title">Sellos ganados</h2>
        <p className="studio-hint">Así se ve y se anima cada sello cuando tu cliente lo gana.</p>
      </div>

      <div className="studio-colors">
        <div className="studio-color">
          <Label htmlFor="stamped-color">Ícono y borde</Label>
          <Input id="stamped-color" type="color" value={look.color} onChange={(event) => update({ color: event.target.value })} />
        </div>
        <div className="studio-color">
          <Label htmlFor="stamped-fill">Relleno</Label>
          <Input id="stamped-fill" type="color" value={look.fill} onChange={(event) => update({ fill: event.target.value })} />
        </div>
        {(card.stamped?.color || card.stamped?.fill) && (
          <Button type="button" variant="ghost" size="sm" className="self-end"
            onClick={() => update({ color: undefined, fill: undefined })}>
            Usar colores de la tarjeta
          </Button>
        )}
      </div>

      <div className="studio-logo-row">
        <div className="studio-stamped-sample" style={lookStyle} aria-hidden="true">
          <StampDisc icon={look.icon} logo={logo} filled animation={look.animation} />
        </div>
        <div className="studio-logo-copy">
          <strong>Marca del sello ganado</strong>
          <span>{logo ? "Tu logo conserva sus colores. Quítalo para usar un ícono." : "Usa un ícono o sube un logo (PNG, JPG o WebP de hasta 10 MB)."}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!logo && <StampPicker value={look.icon} onChange={(icon) => update({ icon })}
            description="Elige el ícono que aparecerá en los sellos ganados." />}
          {!logo && card.stamped?.icon && (
            <Button type="button" variant="ghost" size="sm" onClick={() => update({ icon: undefined })}>
              Usar el mismo ícono
            </Button>
          )}
          <input ref={logoInput} id="card-stamp-logo-file" type="file" accept={cardImageTypes.join(",")} hidden
            onChange={onChooseLogo} />
          <Button type="button" variant="outline" size="sm" onClick={() => logoInput.current?.click()}>
            <Upload aria-hidden="true" /> {logo ? "Cambiar logo" : "Subir logo"}
          </Button>
          {logo && <Button type="button" variant="ghost" size="sm" onClick={onRemoveLogo}>Quitar logo</Button>}
        </div>
      </div>

      <div className="studio-field">
        <span id="stamp-animation-label">Animación al sellar</span>
        <div className="studio-animations" role="group" aria-labelledby="stamp-animation-label" style={lookStyle}>
          {animations.map((animation) => (
            <button key={animation} type="button" className="studio-animation" aria-pressed={animation === look.animation}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") preview(animation); }}
              onClick={() => { update({ animation }); preview(animation); }}>
              <span className="studio-animation-stage" aria-hidden="true">
                <StampDisc icon={look.icon} logo={logo} filled animation={animation}
                  playKey={play?.animation === animation ? play.run : undefined} />
              </span>
              {stampAnimations[animation]}
            </button>
          ))}
        </div>
        <p className="studio-hint">Toca una animación para elegirla y verla.</p>
        <p className="studio-hint studio-motion-note">Tu dispositivo pide menos movimiento, así que verás solo un fundido.</p>
      </div>
    </section>
  );
}
