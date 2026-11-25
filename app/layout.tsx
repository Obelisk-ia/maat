import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { captureInstallPrompt } from "@/components/pwa/install-store";
import { ServiceWorker } from "@/components/pwa/service-worker";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Maat", template: "%s · Maat" },
  description: "Tarjetas de lealtad digitales para tu negocio y tus clientes.",
  applicationName: "Maat",
  appleWebApp: { capable: true, title: "Maat", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the installed app reach the screen's edges; the layouts add the safe-area margins.
  viewportFit: "cover",
  themeColor: "#cec7bf",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX" data-scroll-behavior="smooth">
      <head>
        {/* start_url's ?app=1 marks a home screen launch (see cuenta/page.tsx). The browser sends
            cookies with this request only when asked, and tunnels and protected previews need them. */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <script dangerouslySetInnerHTML={{ __html: captureInstallPrompt }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
