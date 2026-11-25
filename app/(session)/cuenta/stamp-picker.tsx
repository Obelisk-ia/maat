"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { stampCatalog, type StampIcon } from "@/lib/stamp-catalog";
import { stampGlyphs } from "./stamp-icons";

const icons = Object.keys(stampCatalog) as StampIcon[];

function searchable(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function StampPicker({ value, onChange, description = "Elige el ícono que aparecerá en cada sello." }: {
  value: StampIcon;
  onChange: (icon: StampIcon) => void;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const CurrentIcon = stampGlyphs[value];
  const query = searchable(search.trim());
  const matching = icons.filter((icon) => searchable(`${stampCatalog[icon]} ${icon}`).includes(query));

  function toggle(next: boolean) {
    setOpen(next);
    if (!next) setSearch("");
  }

  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <CurrentIcon aria-hidden="true" />
          Cambiar ícono <span className="text-muted-foreground">· {stampCatalog[value]}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="stamp-picker">
        <DialogHeader>
          <DialogTitle className="m-0">Biblioteca de sellos</DialogTitle>
          <DialogDescription className="m-0">{description}</DialogDescription>
        </DialogHeader>
        <div className="stamp-picker-search">
          <Search aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar íconos" placeholder="Buscar íconos" autoComplete="off" />
        </div>
        {matching.length === 0 ? <p className="studio-hint" role="status">No encontramos íconos para esa búsqueda.</p> : (
          <div className="stamp-picker-grid" role="group" aria-label="Íconos disponibles">
            {matching.map((icon) => {
              const Glyph = stampGlyphs[icon];
              return (
                <Button key={icon} className="stamp-picker-option" type="button"
                  variant={icon === value ? "default" : "outline"} aria-pressed={icon === value}
                  onClick={() => { onChange(icon); toggle(false); }}>
                  <Glyph aria-hidden="true" />
                  <span>{stampCatalog[icon]}</span>
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
