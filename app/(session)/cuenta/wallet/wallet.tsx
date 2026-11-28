"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { CreditCard, Gift, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Brand } from "@/app/brand";
import { InstallApp } from "@/components/pwa/install-app";
import { api } from "@/convex/_generated/api";
import { cardProgress } from "@/lib/card-progress";
import { parseJoinLink } from "@/lib/join-link";
import { formatPhone } from "@/lib/registration";
import { ScanDialog } from "../scan-dialog";
import { AccountPage, initials } from "./account-page";
import { AlertsWelcome, LocationWelcome } from "./alerts-welcome";
import { useLocation } from "./use-location";
import { usePush } from "./use-push";
import { CardDetail } from "./card-detail";
import { CardList } from "./card-list";
import { enterSection, foldCardIntoList, motionAllowed, visibleRect, type Rect } from "./motion";
import { QrDialog } from "./qr-dialog";
import { RewardsPage } from "./rewards-page";
import type { Customer, WalletCard } from "./types";
import "./wallet.css";

type View = "cards" | "rewards" | "account";

const navigation = [
  { view: "cards", label: "Mis tarjetas", short: "Tarjetas", icon: CreditCard },
  { view: "rewards", label: "Premios", short: "Premios", icon: Gift },
  { view: "account", label: "Cuenta", short: "Cuenta", icon: User },
] as const;

export function Wallet({ customer, initialCards, joinId, cardId }: {
  customer: Customer;
  initialCards: WalletCard[];
  /** The business whose QR brought the customer here. */
  joinId: string | null;
  /** The card a tapped notification is about. */
  cardId: string | null;
}) {
  const { isAuthenticated } = useConvexAuth();
  const liveViewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const liveCustomer: Customer = liveViewer?.role === "client"
    ? { name: liveViewer.name, email: liveViewer.email, phone: liveViewer.phone }
    : customer;
  // The server's copy shows at once; the live one takes over so new stamps appear by themselves.
  const cards = useQuery(api.clients.memberships.mine, isAuthenticated ? {} : "skip") ?? initialCards;
  const join = useMutation(api.clients.memberships.join);
  const push = usePush();
  const location = useLocation();
  const leave = useMutation(api.clients.memberships.leave);
  const [view, setView] = useState<View>("cards");
  // The open card, and where it sat in the list if it was opened from there.
  const [open, setOpen] = useState<{ id: string; from?: Rect }>();
  // Cards rise into place when the wallet first shows, not on later visits to the list.
  const [intro, setIntro] = useState(true);
  const main = useRef<HTMLElement>(null);
  const listView = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const closing = useRef<{ id: string; from: Rect }>(null);
  const lastView = useRef<View>("cards");
  const [qrId, setQrId] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean; leaving?: boolean }>();
  const [seenStamps, setSeenStamps] = useState(() => new Map(cards.map((card) => [card.membershipId, card.stamps])));
  const [seenPrizes, setSeenPrizes] = useState(() => new Map(cards.map((card) => [card.membershipId, card.history.at(0)?.id])));
  const joinedFromLink = useRef(false);
  const openedFromNotification = useRef(false);

  // Announce stamps as they arrive, and get the full-screen QR out of the way of the animation.
  if (cards.some((card) => seenStamps.get(card.membershipId) !== card.stamps)) {
    const stamped = cards.find((card) => card.stamps > (seenStamps.get(card.membershipId) ?? Infinity));
    setSeenStamps(new Map(cards.map((card) => [card.membershipId, card.stamps])));
    if (stamped) {
      setNotice({ text: `¡Nuevo sello en ${stamped.details.displayName}!` });
      if (qrId === stamped.membershipId) setQrId(undefined);
    }
  }

  // The same for a prize handed over. A card that just appeared here has nothing to announce.
  if (cards.some((card) => !seenPrizes.has(card.membershipId) || seenPrizes.get(card.membershipId) !== card.history.at(0)?.id)) {
    const rewarded = cards.find((card) => seenPrizes.has(card.membershipId) &&
      card.history.length > 0 && seenPrizes.get(card.membershipId) !== card.history[0].id);
    setSeenPrizes(new Map(cards.map((card) => [card.membershipId, card.history.at(0)?.id])));
    if (rewarded) {
      const [prize] = rewarded.history;
      setNotice({ text: `Canjeaste ${prize.prizeName}.${prize.restartedCard ? " Empezó tu tarjeta nueva." : ""}` });
      if (qrId === rewarded.membershipId) setQrId(undefined);
    }
  }

  const openCard = useCallback((membershipId: string) => {
    const list = listView.current;
    const from = visibleRect(list?.querySelector(`[data-card="${membershipId}"]`)?.closest(".wallet-item")?.querySelector(".business-card"));
    // Hiding the list forgets its scroll position, so keep it for the way back.
    if (list?.offsetParent) listScroll.current = list.scrollTop;
    setIntro(false);
    setView("cards");
    setOpen({ id: membershipId, from });
    // A history entry lets the phone's back button close the card.
    if (!window.history.state?.walletCard) window.history.pushState({ walletCard: true }, "");
  }, []);

  /** Notes where the card is on its screen, then leaves it. */
  const leaveCardScreen = useCallback(() => {
    const screen = main.current?.querySelector<HTMLElement>(".wallet-detail");
    const from = visibleRect(screen?.querySelector(".wallet-detail-card .business-card"));
    closing.current = screen?.dataset.membership && from ? { id: screen.dataset.membership, from } : null;
    setOpen(undefined);
  }, []);

  function closeCard() {
    if (window.history.state?.walletCard) window.history.back();
    else leaveCardScreen();
  }

  function changeView(next: View) {
    if (open) closeCard();
    setIntro(false);
    setView(next);
  }

  // Runs before the list is painted again, so the card starts its way back without a flash.
  useLayoutEffect(() => {
    const list = listView.current;
    if (open || !list) return;
    list.scrollTop = listScroll.current;
    const back = closing.current;
    closing.current = null;
    if (!back) return;
    list.querySelector<HTMLElement>(`[data-card="${back.id}"]`)?.focus({ preventScroll: true });
    if (motionAllowed()) return foldCardIntoList(list, back.id, back.from);
  }, [open]);

  useLayoutEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    const section = main.current?.querySelector(".wallet-view:not([hidden]) > *");
    if (section && motionAllowed()) return enterSection(section);
  }, [view]);

  const addCard = useCallback(async (organizationId: string) => {
    try {
      const { membershipId, added, restored } = await join({ organizationId });
      openCard(membershipId);
      setNotice({
        text: added ? "Agregamos la tarjeta a tu colección."
          : restored ? "Recuperaste tu tarjeta con tus sellos." : "Ya tenías esta tarjeta.",
      });
    } catch (error) {
      setNotice({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos agregar la tarjeta. Escanea el código otra vez.",
      });
    }
  }, [join, openCard]);

  async function leaveCard(card: WalletCard) {
    await leave({ membershipId: card.membershipId });
    closeCard();
    setNotice({ text: `Dejaste de seguir a ${card.details.displayName}.` });
  }

  useEffect(() => {
    if (!isAuthenticated || !joinId || joinedFromLink.current) return;
    joinedFromLink.current = true;
    // Drop the QR's address first, so reloading doesn't run it again.
    window.history.replaceState(null, "", "/cuenta");
    void addCard(joinId);
  }, [isAuthenticated, joinId, addCard]);

  useEffect(() => {
    if (!cardId || openedFromNotification.current) return;
    openedFromNotification.current = true;
    window.history.replaceState(null, "", "/cuenta");
    if (cards.some((card) => card.membershipId === cardId)) requestAnimationFrame(() => openCard(cardId));
  }, [cardId, cards, openCard]);

  // A notification tapped while the wallet is open shows its card without reloading.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const url = new URL((event as CustomEvent<string>).detail, window.location.origin);
      if (url.pathname !== "/cuenta") return;
      const wanted = url.searchParams.get("tarjeta");
      if (wanted && !cards.some((card) => card.membershipId === wanted)) return;
      event.preventDefault();
      if (wanted) openCard(wanted);
    };
    window.addEventListener("maat:open", onOpen);
    return () => window.removeEventListener("maat:open", onOpen);
  }, [cards, openCard]);

  useEffect(() => {
    const onPopState = () => { if (!window.history.state?.walletCard) leaveCardScreen(); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [leaveCardScreen]);

  // A message slides away before it's removed.
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(notice.leaving ? undefined : { ...notice, leaving: true }),
      notice.leaving ? 160 : 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const openedCard = cards.find((card) => card.membershipId === open?.id);
  const readyCount = cards.reduce(
    (sum, card) => sum + cardProgress(card.details, card.stamps, card.redeemedPrizes).ready.length, 0);
  const badges: Record<View, number> = { cards: cards.length, rewards: readyCount, account: 0 };

  return (
    <div className="wallet" data-detail={view === "cards" && Boolean(openedCard)} data-intro={intro}>
      <div className="wallet-relief" aria-hidden="true">
        <Image src="/maat/hathor.webp" alt="" width={1536} height={1024} sizes="(max-width: 876px) 130vw, 1140px" loading="eager" />
      </div>

      <aside className="wallet-sidebar">
        <Link href="/" className="wallet-brand" aria-label="Maat, inicio"><Brand /></Link>
        <nav aria-label="Secciones">
          {navigation.map(({ view: target, label, icon: Icon }) => (
            <button key={target} type="button" aria-current={view === target ? "page" : undefined} onClick={() => changeView(target)}>
              <Icon aria-hidden="true" /><span>{label}</span>
              {badges[target] > 0 && <b className="wallet-badge">{badges[target]}</b>}
            </button>
          ))}
        </nav>
        <InstallApp className="wallet-sidebar-install" />
        <div className="wallet-user">
          <span className="wallet-avatar" aria-hidden="true">{initials(liveCustomer.name)}</span>
          <div><strong>{liveCustomer.name}</strong><span>{formatPhone(liveCustomer.phone)}</span></div>
        </div>
      </aside>

      <header className="wallet-topbar">
        <Link href="/" className="wallet-brand" aria-label="Maat, inicio"><Brand /></Link>
        <InstallApp className="wallet-topbar-install" />
        <button type="button" className="wallet-topbar-account" onClick={() => changeView("account")} aria-label="Abrir mi cuenta">
          <span className="wallet-avatar" aria-hidden="true">{initials(liveCustomer.name)}</span>
        </button>
      </header>

      <main ref={main} className="wallet-main">
        {/* The list stays mounted behind an open card, ready for the card's way back. */}
        <div ref={listView} className="wallet-view" hidden={view !== "cards" || Boolean(openedCard)}>
          <CardList cards={cards} name={liveCustomer.name} onOpen={openCard} onAdd={() => setScanning(true)} />
        </div>
        {view === "cards" && openedCard && (
          <CardDetail key={openedCard.membershipId} card={openedCard} from={open?.from} member={liveCustomer.name} push={push}
            onBack={closeCard} onShowQr={() => setQrId(openedCard.membershipId)} onLeave={() => leaveCard(openedCard)} />
        )}
        {view === "rewards" && <div className="wallet-view"><RewardsPage cards={cards} onShowQr={setQrId} /></div>}
        {view === "account" && <div className="wallet-view"><AccountPage customer={liveCustomer} cards={cards} push={push} location={location} /></div>}
      </main>

      <nav className="wallet-tabs" aria-label="Secciones">
        {navigation.map(({ view: target, short, icon: Icon }) => (
          <button key={target} type="button" aria-current={view === target ? "page" : undefined} onClick={() => changeView(target)}>
            <Icon aria-hidden="true" /><span>{short}</span>
            {target === "rewards" && readyCount > 0 && <b className="wallet-badge">{readyCount}</b>}
          </button>
        ))}
      </nav>

      <ScanDialog open={scanning} onOpenChange={setScanning} title="Agregar una tarjeta" className="wallet-sheet"
        description="Escanea el QR que el negocio tiene en el mostrador o en las mesas."
        onText={(text) => {
          const organizationId = parseJoinLink(text);
          if (!organizationId) return "Ese QR no es de un negocio en Maat.";
          void addCard(organizationId);
          return null;
        }} />
      <AlertsWelcome push={push} quiet={scanning || qrId !== undefined} />
      <LocationWelcome location={location} push={push} quiet={scanning || qrId !== undefined || cards.length === 0} />
      <QrDialog card={cards.find((card) => card.membershipId === qrId)} customer={customer} onClose={() => setQrId(undefined)} />

      <div className="wallet-toast-region" role="status">
        {notice && (
          <div key={notice.text} className="wallet-toast" data-error={Boolean(notice.error)} data-leaving={Boolean(notice.leaving)}>
            <span>{notice.text}</span>
            {notice.error && <button type="button" onClick={() => setNotice(undefined)} aria-label="Cerrar aviso"><X aria-hidden="true" /></button>}
          </div>
        )}
      </div>
    </div>
  );
}
