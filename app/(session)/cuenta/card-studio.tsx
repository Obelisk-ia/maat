"use client";

import { Check, CreditCard, ImagePlus, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cardImageSlots, cardImageTypes, cardValidationError, defaultBackgroundTint, defaultStampAnimation,
  maxCardStamps, palettes, sanitizeWorldForSave, sourceImageLimit, stampFillColor,
  type CardDetails, type CardImageSlot,
} from "@/lib/business-card";
import { randomPrizeId } from "@/lib/prizes";
import { saveAccountCard } from "./actions";
import { CardPreview, type PreviewMode } from "./card-preview";
import { stampGlyphs } from "./stamp-icons";
import { StampPicker } from "./stamp-picker";
import { StampedSection } from "./stamped-section";
import { WorldModulesSection } from "./world-modules-section";
import { WorldStudioSection } from "./world-studio-section";

const colorLabels = { background: "Fondo", accent: "Acento", text: "Texto", stampFill: "Fondo de sellos" } as const;
type ImageDraft = { file: File; url: string } | null;
type StudioTab = "card" | "world";

function sameCard(left: CardDetails, right: CardDetails) {
  return left.displayName === right.displayName && left.branch === right.branch &&
    left.totalStamps === right.totalStamps && left.stampIcon === right.stampIcon &&
    (left.backgroundTint ?? defaultBackgroundTint) === (right.backgroundTint ?? defaultBackgroundTint) &&
    left.colors.background === right.colors.background && left.colors.accent === right.colors.accent &&
    left.colors.text === right.colors.text && left.colors.stampFill === right.colors.stampFill &&
    left.stamped?.color === right.stamped?.color && left.stamped?.fill === right.stamped?.fill &&
    left.stamped?.icon === right.stamped?.icon &&
    (left.stamped?.animation ?? defaultStampAnimation) === (right.stamped?.animation ?? defaultStampAnimation) &&
    left.rewards.length === right.rewards.length &&
    left.rewards.every(({ name, stamps }, i) => name === right.rewards[i].name && stamps === right.rewards[i].stamps) &&
    JSON.stringify(sanitizeWorldForSave(left.world) ?? null) === JSON.stringify(sanitizeWorldForSave(right.world) ?? null);
}

export function CardStudio({ initial, logoUrl, backgroundUrl, stampLogoUrl, coverUrl, hasSavedCard }: {
  initial: CardDetails;
  logoUrl: string | null;
  backgroundUrl: string | null;
  stampLogoUrl: string | null;
  coverUrl: string | null;
  hasSavedCard: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const [images, setImages] = useState<Partial<Record<CardImageSlot, ImageDraft>>>({});
  const [tab, setTab] = useState<StudioTab>("card");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("card");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean }>();
  const logoInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const localLogo = images.logo?.url;
  const localBackground = images.background?.url;
  const localStampLogo = images.stampLogo?.url;
  const localCover = images.cover?.url;

  useEffect(() => {
    if (!localLogo) return;
    return () => URL.revokeObjectURL(localLogo);
  }, [localLogo]);
  useEffect(() => {
    if (!localBackground) return;
    return () => URL.revokeObjectURL(localBackground);
  }, [localBackground]);
  useEffect(() => {
    if (!localStampLogo) return;
    return () => URL.revokeObjectURL(localStampLogo);
  }, [localStampLogo]);
  useEffect(() => {
    if (!localCover) return;
    return () => URL.revokeObjectURL(localCover);
  }, [localCover]);

  const previewLogo = images.logo === null ? null : localLogo ?? logoUrl;
  const previewBackground = images.background === null ? null : localBackground ?? backgroundUrl;
  const previewStampLogo = images.stampLogo === null ? null : localStampLogo ?? stampLogoUrl;
  const previewCover = images.cover === null ? null : localCover ?? coverUrl;
  const validTotal = Number.isInteger(draft.totalStamps) && draft.totalStamps >= 1 && draft.totalStamps <= maxCardStamps;
  const dirty = !hasSavedCard || cardImageSlots.some((slot) => images[slot] !== undefined) || !sameCard(draft, initial);
  const Glyph = stampGlyphs[draft.stampIcon];

  function update<K extends keyof CardDetails>(key: K, value: CardDetails[K]) {
    setDraft((card) => ({ ...card, [key]: value }));
    setStatus(undefined);
  }

  function switchTab(next: StudioTab) {
    setTab(next);
    setPreviewMode(next);
  }

  function chooseImage(slot: CardImageSlot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!cardImageTypes.includes(file.type) || !file.size || file.size > sourceImageLimit) {
      setStatus({ text: "Elige una imagen PNG, JPG o WebP de hasta 10 MB.", error: true });
      return;
    }
    const url = URL.createObjectURL(file);
    setImages((current) => ({ ...current, [slot]: { file, url } }));
    setStatus(undefined);
  }

  function removeImage(slot: CardImageSlot) {
    const saved = { logo: logoUrl, background: backgroundUrl, stampLogo: stampLogoUrl, cover: coverUrl }[slot];
    setImages((current) => ({ ...current, [slot]: saved ? null : undefined }));
    setStatus(undefined);
  }

  function addReward() {
    if (!validTotal) return;
    const taken = new Set(draft.rewards.map((reward) => reward.stamps));
    const available = Array.from({ length: draft.totalStamps }, (_, index) => draft.totalStamps - index)
      .find((stamps) => !taken.has(stamps));
    if (available === undefined) return;
    update("rewards", [...draft.rewards, { id: randomPrizeId(), stamps: available, name: "" }]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const error = cardValidationError(draft);
    if (error) {
      setStatus({ text: error, error: true });
      return;
    }
    setSaving(true);
    setStatus(undefined);
    const files = new FormData();
    for (const slot of cardImageSlots) {
      const image = images[slot];
      if (image === null) files.set(slot, "remove");
      if (image) files.set(slot, image.file);
    }
    try {
      const cleanedWorld = sanitizeWorldForSave(draft.world);
      const { world: _ignored, ...rest } = draft;
      void _ignored;
      const payload: CardDetails = {
        ...rest,
        ...(cleanedWorld ? { world: cleanedWorld } : {}),
      };
      const result = await saveAccountCard(payload, files);
      if (result) {
        setStatus({ text: result, error: true });
        return;
      }
      setDraft((card) => {
        const cleaned = sanitizeWorldForSave(card.world);
        const { world: _drop, ...cardRest } = card;
        void _drop;
        return {
          ...cardRest,
          displayName: card.displayName.trim(),
          branch: card.branch.trim(),
          rewards: card.rewards.map((reward) => ({ ...reward, name: reward.name.trim() }))
            .sort((a, b) => a.stamps - b.stamps),
          ...(cleaned ? { world: cleaned } : {}),
        };
      });
      setImages({});
      setStatus({ text: "Tarjeta y mundo guardados.", error: false });
    } catch {
      setStatus({ text: "No pudimos guardar la tarjeta. Intenta de nuevo.", error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="owner-heading studio-heading">
        <div>
          <h1>Tu marca, en vivo</h1>
          <p>Diseña tu tarjeta de lealtad y el ambiente completo que ven tus clientes al abrirla.</p>
        </div>
        <Button type="submit" disabled={!dirty || saving}>
          <Check aria-hidden="true" /> {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
      {status && <p className="studio-status" data-error={status.error} role={status.error ? "alert" : "status"}>{status.text}</p>}

      <div className="studio-tabs" role="tablist" aria-label="Secciones del estudio">
        <button type="button" role="tab" aria-selected={tab === "card"} onClick={() => switchTab("card")}>
          <CreditCard aria-hidden="true" /> Tarjeta y premios
        </button>
        <button type="button" role="tab" aria-selected={tab === "world"} onClick={() => switchTab("world")}>
          <Sparkles aria-hidden="true" /> Mundo del cliente
        </button>
      </div>

      <div className="studio-layout">
        <fieldset disabled={saving} className="studio-controls">
          <div hidden={tab !== "card"}>
            <section className="studio-section" aria-labelledby="identity-title">
              <h2 id="identity-title">Identidad y logotipo</h2>
              <div className="studio-logo-row">
                <div className="studio-logo-square" style={{ backgroundColor: previewLogo ? "#fff" : draft.colors.background, color: draft.colors.accent }}>
                  {previewLogo ? <Image src={previewLogo} alt="" width={40} height={40} unoptimized /> : <Glyph aria-hidden="true" />}
                </div>
                <div className="studio-logo-copy">
                  <strong>Logo del negocio</strong>
                  <span>PNG, JPG o WebP de hasta 10 MB</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={logoInput} id="card-logo-file" type="file" accept={cardImageTypes.join(",")} hidden
                    onChange={(event) => chooseImage("logo", event)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInput.current?.click()}>
                    <Upload aria-hidden="true" /> {previewLogo ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  {previewLogo && <Button type="button" variant="ghost" size="sm" onClick={() => removeImage("logo")}>Quitar logo</Button>}
                </div>
              </div>
              <div className="studio-two">
                <div className="studio-field">
                  <Label htmlFor="card-name">Nombre en la tarjeta</Label>
                  <Input id="card-name" value={draft.displayName} maxLength={100} required onChange={(e) => update("displayName", e.target.value)} />
                </div>
                <div className="studio-field">
                  <Label htmlFor="card-branch">Sucursal mostrada</Label>
                  <Input id="card-branch" value={draft.branch} maxLength={100} placeholder="Ej. Roma Norte" onChange={(e) => update("branch", e.target.value)} />
                </div>
              </div>
            </section>

            <section className="studio-section" aria-labelledby="rewards-title">
              <h2 id="rewards-title">Metas de premios por sellos</h2>
              <div className="studio-stamp-settings">
                <Label htmlFor="card-stamp-total">Total de sellos</Label>
                <Input id="card-stamp-total" type="number" min={1} max={maxCardStamps} step={1} required
                  value={draft.totalStamps || ""} onChange={(event) => update("totalStamps", Number(event.target.value))} />
              </div>
              {draft.rewards.length === 0 && <p className="studio-hint">Agrega un premio y elige cuántos sellos necesita el cliente para ganarlo.</p>}
              {draft.rewards.map((reward, index) => (
                <div className="studio-reward-row" key={index}>
                  <div className="studio-field">
                    <Label htmlFor={`reward-stamps-${index}`}>Sellos<span className="sr-only"> del premio {index + 1}</span></Label>
                    <Input id={`reward-stamps-${index}`} type="number" min={1} max={draft.totalStamps} required
                      value={reward.stamps || ""} onChange={(e) => update("rewards", draft.rewards.map((goal, i) => i === index ? { ...goal, stamps: Number(e.target.value) } : goal))} />
                  </div>
                  <div className="studio-field">
                    <Label htmlFor={`reward-name-${index}`}>Premio<span className="sr-only"> {index + 1}</span></Label>
                    <Input id={`reward-name-${index}`} value={reward.name} maxLength={100} required placeholder="Ej. Café americano gratis"
                      onChange={(e) => update("rewards", draft.rewards.map((goal, i) => i === index ? { ...goal, name: e.target.value } : goal))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Quitar premio ${index + 1}`}
                    onClick={() => update("rewards", draft.rewards.filter((_, i) => i !== index))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addReward} disabled={!validTotal || draft.rewards.length >= draft.totalStamps}>
                <Plus aria-hidden="true" /> Agregar premio
              </Button>
            </section>

            <section className="studio-section" aria-labelledby="style-title">
              <h2 id="style-title">Estilo de la tarjeta</h2>
              <div className="studio-palettes" role="group" aria-label="Paletas de colores">
                {palettes.map(({ name, ...colors }) => {
                  const active = (Object.keys(colors) as (keyof typeof colors)[]).every(
                    (color) => draft.colors[color].toLowerCase() === colors[color],
                  ) && stampFillColor(draft.colors).toLowerCase() === stampFillColor(colors);
                  return (
                    <Button key={name} type="button" variant="outline" size="sm" aria-pressed={active}
                      className="studio-palette" onClick={() => {
                        update("colors", colors);
                        // A palette recolors the whole card, earned stamps included.
                        if (draft.stamped) update("stamped", { ...draft.stamped, color: undefined, fill: undefined });
                      }}>
                      <span aria-hidden="true" style={{ backgroundColor: colors.background }} />{name}
                    </Button>
                  );
                })}
              </div>
              <div className="studio-colors">
                {(Object.entries(colorLabels) as [keyof CardDetails["colors"], string][]).map(([key, label]) => (
                  <div key={key} className="studio-color">
                    <Label htmlFor={`card-color-${key}`}>{label}</Label>
                    <Input id={`card-color-${key}`} type="color"
                      value={key === "stampFill" ? stampFillColor(draft.colors) : draft.colors[key]}
                      onChange={(e) => update("colors", { ...draft.colors, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="studio-field">
                <span>Ícono del sello</span>
                <div><StampPicker value={draft.stampIcon} onChange={(icon) => update("stampIcon", icon)} /></div>
              </div>
              <div className="studio-logo-row studio-background-row">
                <div className="studio-logo-square studio-background-thumbnail">
                  {previewBackground ? <Image src={previewBackground} alt="" width={44} height={44} unoptimized /> : <ImagePlus aria-hidden="true" />}
                </div>
                <div className="studio-logo-copy">
                  <strong>Imagen de fondo</strong>
                  <span>Se recorta para cubrir la tarjeta.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={backgroundInput} id="card-background-file" type="file" accept={cardImageTypes.join(",")} hidden
                    onChange={(event) => chooseImage("background", event)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => backgroundInput.current?.click()}>
                    <Upload aria-hidden="true" /> {previewBackground ? "Cambiar fondo" : "Subir fondo"}
                  </Button>
                  {previewBackground && <Button type="button" variant="ghost" size="sm" onClick={() => removeImage("background")}>Quitar fondo</Button>}
                </div>
              </div>
              {previewBackground && (
                <div className="studio-field studio-tint">
                  <Label htmlFor="card-background-tint">Tinte de fondo · {draft.backgroundTint ?? defaultBackgroundTint}%</Label>
                  <input id="card-background-tint" type="range" min={0} max={100}
                    value={draft.backgroundTint ?? defaultBackgroundTint}
                    onChange={(event) => update("backgroundTint", Number(event.target.value))} />
                </div>
              )}
            </section>

            <StampedSection card={draft} logo={previewStampLogo}
              onChange={(stamped) => update("stamped", stamped)}
              onChooseLogo={(event) => chooseImage("stampLogo", event)}
              onRemoveLogo={() => removeImage("stampLogo")} />
          </div>

          <div hidden={tab !== "world"}>
            <WorldStudioSection card={draft} cover={previewCover}
              onChange={(world) => update("world", world)}
              onChooseCover={(event) => chooseImage("cover", event)}
              onRemoveCover={() => removeImage("cover")} />
            <WorldModulesSection card={draft} onChange={(world) => update("world", world)} />
          </div>
        </fieldset>

        <CardPreview card={draft} logo={previewLogo} background={previewBackground} stampLogo={previewStampLogo}
          cover={previewCover} mode={previewMode} onModeChange={setPreviewMode} />
      </div>
    </form>
  );
}
