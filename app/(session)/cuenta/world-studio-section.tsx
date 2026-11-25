"use client";

import { ImagePlus, Sparkles, Upload, Volume2 } from "lucide-react";
import Image from "next/image";
import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cardImageTypes, stampSounds, stampUnitPresets, worldFonts, worldLook, worldMoods, worldPatterns,
  type CardDetails, type CardWorld, type StampSound, type WorldFont, type WorldMood, type WorldPattern,
} from "@/lib/business-card";
import { triggerStampSensory } from "@/lib/world-fx";
import { buildWorldTheme } from "@/lib/world-theme";

const moodKeys = Object.keys(worldMoods) as WorldMood[];
const fontKeys = Object.keys(worldFonts) as WorldFont[];
const patternKeys = Object.keys(worldPatterns) as WorldPattern[];
const soundKeys = Object.keys(stampSounds) as StampSound[];

export function WorldStudioSection({ card, cover, onChange, onChooseCover, onRemoveCover }: {
  card: CardDetails;
  cover: string | null;
  onChange: (world: CardWorld) => void;
  onChooseCover: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
}) {
  const coverInput = useRef<HTMLInputElement>(null);
  const resolved = worldLook(card);

  function update(changes: Partial<CardWorld>) {
    onChange({ ...card.world, ...changes });
  }

  return (
    <>
      <section className="studio-section" aria-labelledby="world-mood-title">
        <div>
          <h2 id="world-mood-title">Atmósfera de tu mundo</h2>
          <p className="studio-hint">Cuando un cliente abre tu tarjeta, toda la pantalla adopta el ambiente de tu negocio.</p>
        </div>

        <div className="world-mood-grid" role="group" aria-label="Atmósfera visual">
          {moodKeys.map((mood) => {
            const sample = buildWorldTheme({ ...card, world: { ...card.world, mood } });
            const vars = sample.vars as Record<string, string>;
            const active = resolved.mood === mood;
            return (
              <button key={mood} type="button" className="world-mood-option" aria-pressed={active}
                onClick={() => update({ mood })}>
                <span className="world-mood-swatch" aria-hidden="true" style={{ background: vars["--world-bg"], borderColor: vars["--world-border"] }}>
                  <i style={{ background: card.colors.background }} />
                  <i style={{ background: vars["--world-cta-bg"] }} />
                </span>
                <strong>{worldMoods[mood].label}</strong>
                <span>{worldMoods[mood].description}</span>
              </button>
            );
          })}
        </div>

        <div className="studio-field">
          <span id="world-font-label">Tipografía del mundo</span>
          <div className="world-font-grid" role="group" aria-labelledby="world-font-label">
            {fontKeys.map((font) => (
              <button key={font} type="button" className="world-font-option" data-font={font}
                aria-pressed={resolved.font === font} onClick={() => update({ font })}>
                <span className="world-font-sample" aria-hidden="true">Aa</span>
                <strong>{worldFonts[font].label}</strong>
                <small>{worldFonts[font].description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="studio-field">
          <span id="world-pattern-label">Textura de fondo</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="world-pattern-label">
            {patternKeys.map((pattern) => (
              <Button key={pattern} type="button" variant="outline" size="sm" className="studio-palette"
                aria-pressed={resolved.pattern === pattern} onClick={() => update({ pattern })}>
                {worldPatterns[pattern]}
              </Button>
            ))}
          </div>
        </div>

        <div className="studio-logo-row studio-background-row">
          <div className="studio-logo-square studio-background-thumbnail">
            {cover ? <Image src={cover} alt="" width={44} height={44} unoptimized /> : <ImagePlus aria-hidden="true" />}
          </div>
          <div className="studio-logo-copy">
            <strong>Foto de portada / ambiente</strong>
            <span>Una foto de tu barra, local o platillo para recibir al cliente al entrar.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={coverInput} id="card-cover-file" type="file" accept={cardImageTypes.join(",")} hidden
              onChange={onChooseCover} />
            <Button type="button" variant="outline" size="sm" onClick={() => coverInput.current?.click()}>
              <Upload aria-hidden="true" /> {cover ? "Cambiar portada" : "Subir portada"}
            </Button>
            {cover && <Button type="button" variant="ghost" size="sm" onClick={onRemoveCover}>Quitar portada</Button>}
          </div>
        </div>
      </section>

      <section className="studio-section" aria-labelledby="world-voice-title">
        <div>
          <h2 id="world-voice-title">Voz y sensaciones</h2>
          <p className="studio-hint">Personaliza cómo hablas con tus clientes y cómo se siente ganar un sello.</p>
        </div>

        <div className="studio-field">
          <span>¿Cómo llamas a tus sellos?</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Nombre de sellos">
            {stampUnitPresets.map((preset) => {
              const active = resolved.stampUnit.singular.toLowerCase() === preset.singular &&
                resolved.stampUnit.plural.toLowerCase() === preset.plural;
              return (
                <Button key={preset.label} type="button" variant="outline" size="sm" className="studio-palette"
                  aria-pressed={active} onClick={() => update({ stampUnit: { singular: preset.singular, plural: preset.plural } })}>
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <div className="studio-two">
            <div className="studio-field">
              <Label htmlFor="world-unit-singular">Singular</Label>
              <Input id="world-unit-singular" maxLength={24} placeholder="sello"
                value={card.world?.stampUnit?.singular ?? ""}
                onChange={(event) => update({
                  stampUnit: {
                    singular: event.target.value,
                    plural: card.world?.stampUnit?.plural ?? (event.target.value ? `${event.target.value}s` : ""),
                  },
                })} />
            </div>
            <div className="studio-field">
              <Label htmlFor="world-unit-plural">Plural</Label>
              <Input id="world-unit-plural" maxLength={24} placeholder="sellos"
                value={card.world?.stampUnit?.plural ?? ""}
                onChange={(event) => update({
                  stampUnit: {
                    singular: card.world?.stampUnit?.singular ?? "",
                    plural: event.target.value,
                  },
                })} />
            </div>
          </div>
        </div>

        <div className="studio-field">
          <Label htmlFor="world-tagline">Frase corta del negocio</Label>
          <Input id="world-tagline" maxLength={100} placeholder="Ej. Café de especialidad y pan recién horneado"
            value={card.world?.tagline ?? ""}
            onChange={(event) => update({ tagline: event.target.value })} />
        </div>

        <div className="studio-field">
          <Label htmlFor="world-welcome">Mensaje de bienvenida</Label>
          <Input id="world-welcome" maxLength={140} placeholder="Ej. ¡Qué gusto verte por aquí, {nombre}!"
            value={card.world?.welcomeMessage ?? ""}
            onChange={(event) => update({ welcomeMessage: event.target.value })} />
          <p className="studio-hint">Usa <code>{"{nombre}"}</code> para saludar a cada cliente por su nombre.</p>
        </div>

        <div className="studio-field">
          <span id="world-sound-label">Sonido al sellar</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="world-sound-label">
            {soundKeys.map((sound) => (
              <Button key={sound} type="button" variant="outline" size="sm" className="studio-palette"
                aria-pressed={resolved.sound === sound}
                onClick={() => {
                  update({ sound });
                  triggerStampSensory({ sound, haptics: resolved.haptics });
                }}>
                {sound !== "none" && <Volume2 aria-hidden="true" />}
                {stampSounds[sound]}
              </Button>
            ))}
          </div>
        </div>

        <div className="world-toggles">
          <label className="world-toggle-row">
            <span>
              <strong>Vibración háptica al sellar</strong>
              <small>Un pulso suave en teléfonos compatibles al sumar un sello.</small>
            </span>
            <input type="checkbox" checked={resolved.haptics}
              onChange={(event) => update({ haptics: event.target.checked })} />
          </label>
          <label className="world-toggle-row">
            <span>
              <strong><Sparkles aria-hidden="true" /> Celebración al desbloquear premio</strong>
              <small>Lanza confeti con los colores de tu marca cuando el cliente llega a una meta.</small>
            </span>
            <input type="checkbox" checked={resolved.celebratePrize}
              onChange={(event) => update({ celebratePrize: event.target.checked })} />
          </label>
        </div>
      </section>
    </>
  );
}
