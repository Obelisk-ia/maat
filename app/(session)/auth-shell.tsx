import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "../brand";

type Role = "owner" | "staff" | "client";

const reliefs = [
  { role: "owner", src: "/maat/maat.png", width: 1672, height: 941 },
  { role: "staff", src: "/maat/thoth.jpg", width: 1536, height: 1024 },
  { role: "client", src: "/maat/hathor.jpg", width: 1536, height: 1024 },
];

export function AuthShell({ children, role = "owner" }: { children: ReactNode; role?: Role }) {
  return (
    <div className="auth-page">
      <div className="maat-relief" aria-hidden="true">
        {reliefs.map(({ role: reliefRole, ...image }) => (
          <Image key={reliefRole} {...image} alt="" sizes="(max-width: 1295px) 88vw, 1140px"
            loading={reliefRole === role ? "eager" : "lazy"}
            className={reliefRole === role ? "is-active" : undefined} />
        ))}
      </div>
      <header className="auth-topbar">
        <Link href="/" className="brand-link" aria-label="Maat, inicio"><Brand /></Link>
        <Link href="/" className="back-link">← Volver al inicio</Link>
      </header>
      <main className="auth-main">
        <div className="auth-column auth-enter">{children}</div>
      </main>
    </div>
  );
}
