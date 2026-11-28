// How this browser can put the site on the home screen or desktop, judged from what it says about itself.

export type InstallGuide =
  | "ios"
  | "ios-inapp"
  | "android"
  | "android-inapp"
  | "desktop-safari"
  | "desktop-chromium"
  | null;

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
  // Desktop browsers: macOS Safari (Add to Dock) and Chromium browsers (Chrome, Edge, Brave, Opera).
  if (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(userAgent)) {
    return "desktop-safari";
  }
  if (/Chrome\/|Chromium\/|Edg\/|OPR\//.test(userAgent)) {
    return "desktop-chromium";
  }
  return null;
}
