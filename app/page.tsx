import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "./brand";
import { LandingMotion } from "./landing-interactions";
import "./landing.css";

function BusinessCardPreview() {
  return (
    <div className="wallet-object" aria-hidden="true">
      <div className="wallet-stack"><div /><div /><div /></div>
      <div className="preview-card">
        <div className="preview-card-top">
          <div>
            <div className="preview-business">Panadería Sol</div>
            <div className="preview-location">Roma Norte</div>
          </div>
          <div className="preview-count">
            <div className="preview-label">Sellos</div>
            <div className="preview-total">4/12</div>
          </div>
        </div>
        <div className="preview-stamps">
          {Array.from({ length: 12 }, (_, index) => {
            const stamp = index + 1;
            const milestone = [5, 10, 12].includes(stamp);
            return <span key={stamp} className={`preview-slot${stamp <= 4 ? " is-filled" : ""}${milestone ? " is-milestone" : ""}`}>{milestone ? stamp : stamp <= 4 ? "★" : null}</span>;
          })}
        </div>
        <div className="preview-card-bottom">
          <div className="preview-label">Siguiente premio</div>
          <div className="preview-reward">1 sello para Café americano gratis</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <LandingMotion>
      {/* Permanent Maat Relief */}
        <div className="maat-relief" aria-hidden="true">
          <Image src="/maat/maat.png" alt="" width={1672} height={941}
            sizes="(max-width: 1288px) 90vw, 1160px" loading="eager" fetchPriority="high" />
        </div>

        {/* Top Navigation */}
        <header className="site-nav">
          <div className="container nav-inner">
            <Link href="/" className="brand-link">
              <Brand />
            </Link>

            <nav className="nav-links" aria-label="Secciones">
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#metas">Premios</a>
              <a href="#roles">Equipo</a>
              <Link href="/clientes">Clientes</Link>
            </nav>

            <div className="od-cluster" style={{ "--od-gap": "8px" } as CSSProperties}>
              <Link href="/auth?tab=login" className="btn btn-ghost btn-sm">Iniciar sesión</Link>
              <Link href="/auth?tab=signup" className="btn btn-primary btn-sm">Crear cuenta</Link>
            </div>
          </div>
        </header>

        <main>
          {/* HERO */}
          <section className="hero">
            <div className="container hero-grid">
              <div className="hero-copy">
                <h1 className="hero-title gsap-hero">Una tarjeta que tus clientes nunca pierden.</h1>
                <p className="hero-lead gsap-hero">
                  Tu tarjeta de sellos con tu logo y tus colores. Tus clientes se registran con un QR y tu equipo los escanea en segundos.
                </p>
                <div className="od-cluster gsap-hero" style={{ "--od-gap": "12px" } as CSSProperties}>
                  <Link href="/auth?tab=signup&amp;role=owner" className="btn btn-primary">Crear cuenta</Link>
                  <Link href="/clientes" className="btn btn-secondary">Soy cliente</Link>
                </div>
              </div>

              <div className="gsap-hero-card"><BusinessCardPreview /></div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="como-funciona" className="band-section">
            <div className="container">
              <div className="section-header gsap-reveal">
                <h2 className="section-title">Listo en minutos.</h2>
              </div>

              <div className="steps-grid">
                <article className="step-col gsap-step">
                  <div className="step-num">01</div>
                  <h3>Diseña tu tarjeta</h3>
                  <p>Tu logo, tus colores y los premios que quieras dar.</p>
                </article>
                <article className="step-col gsap-step">
                  <div className="step-num">02</div>
                  <h3>Pon tu QR en el mostrador</h3>
                  <p>Tus clientes lo escanean con la cámara y su tarjeta queda en su celular.</p>
                </article>
                <article className="step-col gsap-step">
                  <div className="step-num">03</div>
                  <h3>Escanea en cada visita</h3>
                  <p>Tu equipo suma sellos y entrega premios en un toque.</p>
                </article>
              </div>
            </div>
          </section>

          {/* MULTI-MILESTONE STAMPS */}
          <section id="metas" className="band-section">
            <div className="container">
              <div className="section-header gsap-reveal">
                <h2 className="section-title">Premia a los 5, a los 10 y al completar.</h2>
                <p className="section-desc">Varios premios en la misma tarjeta, para que siempre haya uno cerca.</p>
              </div>

              <div className="milestone-rail">
                <article className="milestone-step gsap-milestone">
                  <span className="milestone-badge">5 SELLOS</span>
                  <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800 }}>Café americano gratis</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--ink-secondary)" }}>Un premio rápido para que vuelvan. Los sellos se conservan.</p>
                </article>
                <article className="milestone-step gsap-milestone">
                  <span className="milestone-badge">10 SELLOS</span>
                  <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800 }}>Una concha recién horneada</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--ink-secondary)" }}>Al cliente le llega un aviso cuando le falta un sello.</p>
                </article>
                <article className="milestone-step gsap-milestone">
                  <span className="milestone-badge">12 SELLOS</span>
                  <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800 }}>Desayuno completo</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--ink-secondary)" }}>Al entregarlo, la tarjeta empieza de nuevo.</p>
                </article>
              </div>
            </div>
          </section>

          {/* OWNER VS STAFF */}
          <section id="roles" className="band-section">
            <div className="container">
              <div className="section-header gsap-reveal">
                <h2 className="section-title">Una vista para decidir. Otra para escanear.</h2>
              </div>

              <div className="role-split">
                <article className="role-pane gsap-role">
                  <div className="role-art"><Image src="/maat/maat.png" alt="Relieve en piedra caliza de la diosa Maat" width={1672} height={941} sizes="(max-width: 820px) 100vw, 550px" /></div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>DUEÑO</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Todo tu negocio</h3>
                  <ul className="role-list">
                    <li><span>•</span><span>Visitas, clientes y avance de cada premio.</span></li>
                    <li><span>•</span><span>Quién vino hoy y quién se registró.</span></li>
                    <li><span>•</span><span>Tu tarjeta, tus sucursales y avisos a clientes.</span></li>
                  </ul>
                  <Link href="/auth?tab=signup&amp;role=owner" className="btn btn-primary btn-sm">Crear cuenta</Link>
                </article>

                <article className="role-pane is-staff gsap-role">
                  <div className="role-art"><Image src="/maat/thoth.jpg" alt="Relieve en piedra pizarra del dios Thot con su paleta de escriba" width={1536} height={1024} sizes="(max-width: 820px) 100vw, 550px" /></div>
                  <div className="eyebrow" style={{ marginBottom: 8, color: "var(--accent-amber-ink)" }}>STAFF</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Escanear y listo</h3>
                  <ul className="role-list">
                    <li><span>•</span><span>Abre, escanea y suma sellos.</span></li>
                    <li><span>•</span><span>Si hay un premio listo, lo entrega en un toque.</span></li>
                    <li><span>•</span><span>Ve a los clientes que atendió hoy.</span></li>
                  </ul>
                </article>
              </div>
            </div>
          </section>

          {/* CLIENTES */}
          <section id="clientes" className="client-band" aria-labelledby="clientes-title">
            <Image className="client-band-img" src="/maat/hathor.jpg" alt="" width={1536} height={1024} sizes="100vw" />
            <div className="container">
              <div className="client-copy gsap-reveal">
                <h2 id="clientes-title" className="section-title">Tus clientes, todas sus tarjetas en un solo lugar.</h2>
                <p className="section-desc">Cada una con el estilo de su negocio y su QR listo para la caja.</p>
                <Link href="/clientes" className="btn btn-primary">Acceso para clientes →</Link>
              </div>
            </div>
          </section>

          <div className="frieze" aria-hidden="true">
            <Image src="/maat/ofrendas.jpg" alt="" width={1536} height={1024} sizes="100vw" />
          </div>

          {/* FINAL CTA */}
          <section className="cta-band">
            <div className="container gsap-reveal">
              <h2 className="section-title" style={{ maxWidth: "18ch" }}>Tu tarjeta, tu marca, tus reglas.</h2>
              <div style={{ height: 28 }} aria-hidden="true"></div>
              <div className="od-cluster" style={{ "--od-gap": "12px" } as CSSProperties}>
                <Link href="/auth?tab=signup&amp;role=owner" className="btn btn-primary">Crear cuenta</Link>
                <Link href="/clientes" className="btn btn-secondary">Soy cliente</Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="container od-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <span>© 2026 Maat</span>
            <div className="od-cluster" style={{ "--od-gap": "18px" } as CSSProperties}>
              <Link href="/auth?tab=login" style={{ color: "inherit", textDecoration: "none" }}>Iniciar sesión</Link>
              <Link href="/auth?tab=signup" style={{ color: "inherit", textDecoration: "none" }}>Crear cuenta</Link>
              <Link href="/cuenta" style={{ color: "inherit", textDecoration: "none" }}>Ir a la app</Link>
            </div>
          </div>
        </footer>
    </LandingMotion>
  );
}
