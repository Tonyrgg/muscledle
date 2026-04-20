import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle Daily Mode - Guess Today’s Gym Exercise";
const META_DESCRIPTION =
  "Play Liftdle Daily Mode and guess the exercise of the day using clues for muscle group, equipment, movement pattern, reps, and training goal.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/daily",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/daily",
    type: "website",
    images: [
      {
        url: OG_IMAGE_PATH,
        alt: META_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

const dailyJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Liftdle Daily Mode",
  url: `${SITE_URL}/daily`,
  description: META_DESCRIPTION,
  inLanguage: "en",
  isPartOf: {
    "@type": "WebSite",
    name: "Liftdle",
    url: SITE_URL,
  },
};

export default function DailyPage() {
  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dailyJsonLd) }}
      />
      <section className="legal-page__shell">
        <h1 className="legal-page__title">Daily Mode</h1>
        <p className="legal-page__line">One exercise per day, reset at midnight Europe/Rome</p>

        <h2>What You Get</h2>
        <p>A fresh daily target exercise for all players.</p>
        <p>Consistent clue-based gameplay built around real gym movements.</p>

        <h2>Why Play Daily</h2>
        <p>Build a streak, compare your solves over time, and improve exercise recognition speed.</p>
        <p>Use post-game notes and archive browsing to sharpen your next attempt.</p>

        <div className="legal-page__cta-wrap">
          <p className="legal-page__line legal-page__line--cta">Play now</p>
          <Link href="/" className="legal-page__cta">
            Open today&apos;s Liftdle
          </Link>
        </div>
      </section>
    </main>
  );
}
