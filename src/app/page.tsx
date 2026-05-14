import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

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
    title: "Daily",
    href: "/daily",
    description: "Guess today's exercise using training clues.",
    status: null,
    disabled: false,
    className: "hub-card--daily",
    ariaLabel: "Open Daily mode",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="hub-card__icon-svg">
        <path
          d="M7 2.5a1 1 0 0 1 1 1v1h8v-1a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 7v12.5A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5V7A2.5 2.5 0 0 1 4.5 4.5H6v-1a1 1 0 0 1 1-1Zm12.5 8h-15v9a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5v-9Zm-11 2.5h2v2h-2v-2Zm5 0h2v2h-2v-2Zm-5 4h2v2h-2v-2Zm5 0h2v2h-2v-2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    title: "LiftGrid",
    href: "/liftgrid",
    description: "Match muscles and equipment across the grid.",
    status: "New",
    disabled: false,
    className: "hub-card--liftgrid",
    ariaLabel: "Open LiftGrid mode",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="hub-card__icon-svg">
        <path
          d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Zm2-7v3h3V6h-3ZM6 6v3h3V6H6Zm0 9v3h3v-3H6Zm9 0v3h3v-3h-3Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    title: "WeightGuess",
    href: null,
    description: "Watch the lift and guess the weight.",
    status: "Coming Soon",
    disabled: true,
    className: "hub-card--weightguess hub-card--disabled",
    ariaLabel: "WeightGuess coming soon",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="hub-card__icon-svg">
        <path
          d="M3 10h2.5V7H8v10H5.5v-3H3v-4Zm15.5-3H16v10h2.5v-3H21v-4h-2.5V7ZM9.5 9h5v6h-5V9Zm-7.5 2h1v2H2v-2Zm19 0h1v2h-1v-2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
] as const;

function HubCard({
  title,
  href,
  description,
  status,
  disabled,
  className,
  ariaLabel,
  icon,
}: (typeof hubCards)[number]) {
  const cardInner = (
    <>
      <div className="hub-card__topline">
        <span className="hub-card__icon">{icon}</span>
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

      <header className="hub-header">
        <div className="hub-brand">
          <Logo withSplashline splashlineVariant="standalone" />
        </div>
      </header>

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
