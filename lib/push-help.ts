// What a customer can do when notifications won't turn on. Written for whatever browser they
// use: it never assumes they have a particular one.

export type PushTrouble =
  /** The phone never answered the permission question. */
  | "no-answer"
  /** Notifications are blocked for Maat or for the browser. */
  | "blocked"
  /** Allowed, but the browser couldn't reach its push service. */
  | "service"
  /** The browser can't receive notifications at all. */
  | "unsupported";

export type Platform = "android" | "ios" | "computer";

export function platformOf({ userAgent, platform, maxTouchPoints }: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): Platform {
  if (/iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) return "ios";
  return /Android/.test(userAgent) ? "android" : "computer";
}

type Help = {
  steps: string[];
  note?: string;
  /** Offers the link, to open Maat somewhere else. */
  copyLink: boolean;
  /** The customer can change a setting and check again. */
  recheck: boolean;
};

export function pushHelp(trouble: PushTrouble, platform: Platform, installed: boolean): Help {
  if (trouble === "unsupported") {
    return {
      steps: [],
      note: "Tu tarjeta y tu QR funcionan igual aquí. Para recibir avisos, copia el enlace y abre Maat en otro navegador.",
      copyLink: true, recheck: false,
    };
  }
  if (trouble === "service") {
    return {
      steps: [
        "Revisa tu conexión a internet.",
        "Algunos navegadores que cuidan la privacidad traen apagados los avisos «push». Búscalos en sus ajustes y actívalos.",
      ],
      note: "Si sigue igual, copia el enlace y abre Maat en otro navegador.",
      copyLink: true, recheck: true,
    };
  }
  if (platform === "ios") {
    return {
      steps: ["Abre Ajustes → Notificaciones → Maat y permite las notificaciones.", "Regresa aquí."],
      copyLink: false, recheck: true,
    };
  }
  if (platform === "computer") {
    return {
      steps: ["Haz clic en el candado junto a la dirección y permite las notificaciones.", "Regresa aquí o recarga la página."],
      copyLink: false, recheck: true,
    };
  }
  // On Android an installed app has its own switch in the phone's settings.
  return installed ? {
    steps: [
      "Abre los Ajustes del teléfono → Aplicaciones → Maat → Notificaciones, y actívalas.",
      "Si Maat no aparece ahí, haz lo mismo con el navegador con el que la instalaste.",
      "Cierra Maat por completo y ábrela otra vez.",
    ],
    note: "Si sigue igual, tu navegador falla con la app instalada. Copia el enlace, ábrelo en el navegador y usa Maat ahí, sin instalar.",
    copyLink: true, recheck: true,
  } : {
    steps: [
      "Toca el candado o el menú junto a la dirección, busca Permisos o Notificaciones y permítelas para este sitio.",
      "Revisa también Ajustes del teléfono → Aplicaciones → tu navegador → Notificaciones.",
      "Regresa aquí.",
    ],
    note: "Si tu navegador no te deja, copia el enlace y abre Maat en otro.",
    copyLink: true, recheck: true,
  };
}
