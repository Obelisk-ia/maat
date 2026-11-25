"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maxSecretMenuItems, type CardDetails, type CardWorld, type WorldLinks, type WorldSecretItem } from "@/lib/business-card";
import { randomPrizeId } from "@/lib/prizes";

const boardBadges = ["Hoy", "Nuevo", "Promo", "Temporada", "Especial"] as const;

export function WorldModulesSection({ card, onChange }: {
  card: CardDetails;
  onChange: (world: CardWorld) => void;
}) {
  const board = card.world?.board;
  const secretMenu = card.world?.secretMenu ?? [];
  const links = card.world?.links ?? {};

  function update(changes: Partial<CardWorld>) {
    onChange({ ...card.world, ...changes });
  }

  function updateBoard(changes: Partial<NonNullable<CardWorld["board"]>>) {
    const next = { title: board?.title ?? "", body: board?.body ?? "", badge: board?.badge ?? "", ...changes };
    if (!next.title && !next.body && !next.badge) update({ board: undefined });
    else update({ board: next });
  }

  function addSecretItem() {
    if (secretMenu.length >= maxSecretMenuItems) return;
    const item: WorldSecretItem = { id: randomPrizeId(), title: "", description: "", minCompletedCards: 0 };
    update({ secretMenu: [...secretMenu, item] });
  }

  function updateSecretItem(index: number, changes: Partial<WorldSecretItem>) {
    update({
      secretMenu: secretMenu.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    });
  }

  function updateLinks(changes: Partial<WorldLinks>) {
    update({ links: { ...links, ...changes } });
  }

  return (
    <>
      <section className="studio-section" aria-labelledby="world-board-title">
        <div className="world-section-head">
          <div>
            <h2 id="world-board-title">Pizarrón del día</h2>
            <p className="studio-hint">Destaca una novedad, platillo de temporada o promoción dentro de tu tarjeta.</p>
          </div>
          {(board?.title || board?.body || board?.badge) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => update({ board: undefined })}>
              Quitar aviso
            </Button>
          )}
        </div>

        <div className="studio-field">
          <span>Etiqueta rápida</span>
          <div className="flex flex-wrap gap-2">
            {boardBadges.map((badge) => (
              <Button key={badge} type="button" variant="outline" size="sm" className="studio-palette"
                aria-pressed={board?.badge === badge}
                onClick={() => updateBoard({ badge: board?.badge === badge ? "" : badge })}>
                {badge}
              </Button>
            ))}
          </div>
        </div>

        <div className="studio-field">
          <Label htmlFor="world-board-heading">Título del pizarrón</Label>
          <Input id="world-board-heading" maxLength={80} placeholder="Ej. Pan de muerto recién horneado"
            value={board?.title ?? ""} onChange={(event) => updateBoard({ title: event.target.value })} />
        </div>

        <div className="studio-field">
          <Label htmlFor="world-board-body">Detalle (opcional)</Label>
          <textarea id="world-board-body" className="world-textarea" rows={2} maxLength={220}
            placeholder="Ej. Pide tu espresso con pan de muerto de 4 a 7 pm · Edición de esta semana."
            value={board?.body ?? ""} onChange={(event) => updateBoard({ body: event.target.value })} />
        </div>
      </section>

      <section className="studio-section" aria-labelledby="world-secret-title">
        <div>
          <h2 id="world-secret-title">Menú secreto y exclusivos</h2>
          <p className="studio-hint">Ítems fuera de carta o beneficios exclusivos solo visibles para quienes tienen tu tarjeta.</p>
        </div>

        {secretMenu.length === 0 && (
          <p className="studio-hint">Agrega hasta {maxSecretMenuItems} exclusivos (pueden abrirse para todos o al completar 1 o más tarjetas).</p>
        )}

        {secretMenu.map((item, index) => (
          <div className="world-secret-editor" key={item.id}>
            <div className="world-secret-editor-top">
              <div className="studio-field">
                <Label htmlFor={`secret-title-${index}`}>Exclusivo {index + 1}</Label>
                <Input id={`secret-title-${index}`} maxLength={80} required
                  placeholder="Ej. Cold brew con cardamomo"
                  value={item.title} onChange={(event) => updateSecretItem(index, { title: event.target.value })} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar exclusivo ${index + 1}`}
                onClick={() => update({ secretMenu: secretMenu.filter((_, i) => i !== index) })}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <div className="studio-field">
              <Label htmlFor={`secret-desc-${index}`}>Descripción (opcional)</Label>
              <Input id={`secret-desc-${index}`} maxLength={160}
                placeholder="Ej. Pídelo en barra mostrando tu tarjeta."
                value={item.description ?? ""} onChange={(event) => updateSecretItem(index, { description: event.target.value })} />
            </div>
            <div className="world-secret-gate">
              <Label htmlFor={`secret-min-${index}`}>Disponible para</Label>
              <select id={`secret-min-${index}`} className="world-select"
                value={item.minCompletedCards ?? 0}
                onChange={(event) => updateSecretItem(index, { minCompletedCards: Number(event.target.value) })}>
                <option value={0}>Todos los miembros</option>
                <option value={1}>Quienes completaron 1 tarjeta</option>
                <option value={2}>Quienes completaron 2 tarjetas</option>
                <option value={3}>Quienes completaron 3 tarjetas</option>
                <option value={5}>Quienes completaron 5 tarjetas</option>
              </select>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addSecretItem}
          disabled={secretMenu.length >= maxSecretMenuItems}>
          <Plus aria-hidden="true" /> Agregar al menú secreto
        </Button>
      </section>

      <section className="studio-section" aria-labelledby="world-links-title">
        <div>
          <h2 id="world-links-title">Accesos directos del local</h2>
          <p className="studio-hint">Aparecen como botones con el estilo de tu marca dentro de la tarjeta.</p>
        </div>

        <div className="studio-two">
          <div className="studio-field">
            <Label htmlFor="world-link-menu">Enlace del menú</Label>
            <Input id="world-link-menu" type="url" maxLength={240} placeholder="https://tunegocio.com/menu"
              value={links.menuUrl ?? ""} onChange={(event) => updateLinks({ menuUrl: event.target.value })} />
          </div>
          <div className="studio-field">
            <Label htmlFor="world-link-maps">Google Maps</Label>
            <Input id="world-link-maps" type="url" maxLength={240} placeholder="https://maps.app.goo.gl/..."
              value={links.mapsUrl ?? ""} onChange={(event) => updateLinks({ mapsUrl: event.target.value })} />
          </div>
          <div className="studio-field">
            <Label htmlFor="world-link-wa">WhatsApp (pedidos o reservas)</Label>
            <Input id="world-link-wa" maxLength={80} placeholder="55 1234 5678"
              value={links.whatsapp ?? ""} onChange={(event) => updateLinks({ whatsapp: event.target.value })} />
          </div>
          <div className="studio-field">
            <Label htmlFor="world-link-ig">Instagram</Label>
            <Input id="world-link-ig" maxLength={80} placeholder="@tunegocio"
              value={links.instagram ?? ""} onChange={(event) => updateLinks({ instagram: event.target.value })} />
          </div>
        </div>

        <div className="studio-field">
          <Label htmlFor="world-link-hours">Horarios</Label>
          <Input id="world-link-hours" maxLength={100} placeholder="Ej. Lun–Dom · 8:00 a 21:00"
            value={links.hours ?? ""} onChange={(event) => updateLinks({ hours: event.target.value })} />
        </div>
      </section>
    </>
  );
}
