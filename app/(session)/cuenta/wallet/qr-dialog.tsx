import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { stampWord } from "@/lib/business-card";
import { cardProgress } from "@/lib/card-progress";
import { formatMemberCode, memberQrValue } from "@/lib/member-code";
import { formatPhone } from "@/lib/registration";
import { CardLogo } from "./card-logo";
import type { WalletCard } from "./types";

export function QrDialog({ card: requested, customer, onClose }: {
  card: WalletCard | undefined;
  customer: { name: string; phone: string };
  onClose: () => void;
}) {
  // The card stays on screen while the window slides away.
  const [last, setLast] = useState(requested);
  if (requested && requested !== last) setLast(requested);
  const card = requested ?? last;
  if (!card) return null;
  const { stamps, total, ready } = cardProgress(card.details, card.stamps, card.redeemedPrizes);

  return (
    <Dialog open={Boolean(requested)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="wallet-qr-dialog wallet-sheet">
        <DialogHeader className="items-center">
          <CardLogo card={card} />
          <DialogTitle className="m-0">{card.details.displayName}</DialogTitle>
          <DialogDescription className="m-0">Sube el brillo de tu pantalla y muestra este código en caja.</DialogDescription>
        </DialogHeader>
        <QRCodeSVG className="wallet-qr" value={memberQrValue(card.code)} size={320} level="M" marginSize={4}
          title={`Tu QR de ${card.details.displayName}`} />
        <p className="wallet-qr-code">{formatMemberCode(card.code)}</p>
        <p className="wallet-qr-member">
          {customer.name} · {stamps}/{total} {stampWord(total, card.details)}<br />
          {ready.length > 0
            ? "Para canjear tu premio, muestra este QR o dicta el código."
            : `O dile tu celular: ${formatPhone(customer.phone)}`}
        </p>
      </DialogContent>
    </Dialog>
  );
}
