import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle Marathon Mode - Endless Exercise Guessing Run";
const META_DESCRIPTION =
  "Play Liftdle Marathon Mode for a continuous exercise guessing run. Chain correct answers, manage attempts, and push your score higher.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/marathon",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/marathon",
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

const marathonJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Liftdle Marathon Mode",
  url: `${SITE_URL}/marathon`,
  description: META_DESCRIPTION,
  inLanguage: "en",
  isPartOf: {
    "@type": "WebSite",
    name: "Liftdle",
    url: SITE_URL,
  },
};

export default function MarathonPage() {
  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marathonJsonLd) }}
      />
      <section className="legal-page__shell">
        <h1 className="legal-page__title">Marathon Mode</h1>
        <p className="legal-page__line">Continuous rounds, cumulative score</p>

        <h2>How It Works</h2>
        <p>Solve one hidden exercise, then move directly to the next.</p>
        <p>Each round keeps the same clue system while score carries across the run.</p>

        <h2>What To Optimize</h2>
        <p>Balance speed and precision to avoid wasted attempts.</p>
        <p>Use movement pattern and equipment clues early to narrow candidates quickly.</p>

        <div className="legal-page__cta-wrap">
          <p className="legal-page__line legal-page__line--cta">Start a run</p>
          <Link href="/" className="legal-page__cta">
            Play Liftdle Marathon
          </Link>
        </div>
      </section>
    </main>
  );
}
