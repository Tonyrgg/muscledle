import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "How to Play Liftdle - Daily Gym Exercise Guessing Rules";
const META_DESCRIPTION =
  "Learn how to play Liftdle: decode muscle group, equipment, movement pattern, reps, and goal clues to guess the daily gym exercise.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/how-to-play",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/how-to-play",
    type: "article",
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

const howToPlayJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "How to Play Liftdle",
  url: `${SITE_URL}/how-to-play`,
  description: META_DESCRIPTION,
  inLanguage: "en",
};

export default function HowToPlayPage() {
  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToPlayJsonLd) }}
      />
      <section className="legal-page__shell">
        <h1 className="legal-page__title">How To Play Liftdle</h1>
        <p className="legal-page__line">Daily fitness guessing game rules</p>

        <h2>Core Loop</h2>
        <p>Submit an exercise guess and compare it against the hidden daily target.</p>
        <p>Each row returns feedback across muscle, equipment, movement, pattern, reps, goal, and ego.</p>

        <h2>Read the Clues</h2>
        <p>Green means exact match.</p>
        <p>Yellow means partial overlap.</p>
        <p>Red means no overlap for that attribute.</p>

        <h2>Winning Strategy</h2>
        <p>Start with a common compound lift, then narrow one variable at a time using the feedback grid.</p>
        <p>Use the archive to review exercise attributes and improve your next daily solve.</p>

        <div className="legal-page__cta-wrap">
          <p className="legal-page__line legal-page__line--cta">Ready to play?</p>
          <Link href="/" className="legal-page__cta">
            Start today&apos;s Liftdle challenge
          </Link>
        </div>
      </section>
    </main>
  );
}
