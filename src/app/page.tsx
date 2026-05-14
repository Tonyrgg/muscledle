import type { Metadata } from "next";
import Link from "next/link";
import { ModeIcon } from "@/components/modes/mode-icon";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og-image.png";
const META_TITLE = "Liftdle Hub - Daily, LiftGrid, and WeightGuess";
const SITE_DESCRIPTION =
  "Enter the Liftdle hub and choose between the daily exercise challenge, LiftGrid, and WeightGuess.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: META_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: META_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Liftdle",
    type: "website",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: META_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

const homepageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Liftdle",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "CollectionPage",
      name: "Liftdle Hub",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
  ],
};

const hubCards = [
  {
    mode: "daily" as const,
    title: "Daily",
    href: "/daily",
    description: "Guess today's exercise using training clues.",
    status: null,
    disabled: false,
    className: "hub-card--daily",
    ariaLabel: "Open Daily mode",
  },
  {
    mode: "liftgrid" as const,
    title: "LiftGrid",
    href: "/liftgrid",
    description: "Match muscles and equipment across the grid.",
    status: "New",
    disabled: false,
    className: "hub-card--liftgrid",
    ariaLabel: "Open LiftGrid mode",
  },
  {
    mode: "weightguess" as const,
    title: "WeightGuess",
    href: null,
    description: "Watch the lift and guess the weight.",
    status: "Coming Soon",
    disabled: true,
    className: "hub-card--weightguess hub-card--disabled",
    ariaLabel: "WeightGuess coming soon",
  },
] as const;

function HubCard({
  mode,
  title,
  href,
  description,
  status,
  disabled,
  className,
  ariaLabel,
}: (typeof hubCards)[number]) {
  const cardInner = (
    <>
      <div className="hub-card__topline">
        <span className="hub-card__icon">
          <ModeIcon mode={mode} className="hub-card__icon-svg" alt="" />
        </span>
        {status ? <span className="hub-card__pill">{status}</span> : null}
      </div>
      <div className="hub-card__visual" aria-hidden="true" />
      <div className="hub-card__body">
        <span className="hub-card__line" aria-hidden="true" />
        <div className="hub-card__headline">
          <h2 className="hub-card__title">{title}</h2>
          <span className="hub-card__arrow" aria-hidden="true">
            →
          </span>
        </div>
        <p className="hub-card__description">{description}</p>
      </div>
    </>
  );

  if (disabled || !href) {
    return (
      <article className={`hub-card ${className}`} aria-label={ariaLabel}>
        {cardInner}
      </article>
    );
  }

  return (
    <Link href={href} className={`hub-card ${className}`} aria-label={ariaLabel}>
      {cardInner}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="hub-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
      <main className="hub-main">
        <section className="hub-grid" aria-label="Liftdle game modes">
          {hubCards.map((card) => (
            <HubCard key={card.title} {...card} />
          ))}
        </section>
      </main>

      <footer className="hub-footer">
        <nav className="hub-footer__links" aria-label="Hub footer links">
          <Link href="/how-to-play">About</Link>
          <Link href="/archive">Archive</Link>
        </nav>
        <p className="hub-footer__copy">© 2026 Liftdle. All rights reserved.</p>
      </footer>
      <div id="mobile-floating-pills-host" className="mobile-floating-pills-host hub-mobile-pills" aria-hidden />
    </div>
  );
}
