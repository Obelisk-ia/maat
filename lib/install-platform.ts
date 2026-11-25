// How this browser can put the site on the home screen, judged from what it says about itself.

export type InstallGuide = "ios" | "ios-inapp" | "android" | "android-inapp" | null;

// Browsers inside other apps, which can't add anything to the home screen.
const inAppBrowsers = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|Twitter|GSA\//;

export function installGuide({ userAgent, platform, maxTouchPoints }: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): InstallGuide {
  // Recent iPads describe themselves as Macs; only the touch screen gives them away.
  if (/iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) {
    // Real iOS browsers name Safari; a bare web view inside an app doesn't.
    return inAppBrowsers.test(userAgent) || !/Safari\//.test(userAgent) ? "ios-inapp" : "ios";
  }
  if (/Android/.test(userAgent)) {
    return inAppBrowsers.test(userAgent) || /; wv\)/.test(userAgent) ? "android-inapp" : "android";
  }
  // On a computer, only a browser that offers its own install prompt gets the button.
  return null;
}
