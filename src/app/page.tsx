import type { Metadata } from "next";
import Link from "next/link";
import { HubModeGrid } from "@/components/modes/hub-mode-grid";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og-image.png";
const META_TITLE = "Liftdle - Daily Fitness Guessing Game & Gym Wordle ";
const SITE_DESCRIPTION =
  "Play Liftdle, the daily fitness guessing game where you guess gym exercises using clues like muscle group, equipment, movement pattern, reps, and training goal.";

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

export default function Home() {
  return (
    <div className="hub-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
      <main className="hub-main">
        <HubModeGrid />
      </main>

      <footer className="hub-footer">
        <nav className="hub-footer__links" aria-label="Hub footer links">
          <Link href="/how-to-play">About</Link>
          <Link href="/archive">Archive</Link>
        </nav>
        <p className="hub-footer__copy">© 2026 Liftdle. All rights reserved.</p>
      </footer>
      <div
        id="mobile-floating-pills-host"
        className="mobile-floating-pills-host hub-mobile-pills"
        aria-hidden
      />
    </div>
  );
}
