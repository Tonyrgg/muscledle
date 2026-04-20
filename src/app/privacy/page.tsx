import type { Metadata } from "next";
import Link from "next/link";

const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle Privacy Notice - Data and Consent Information";
const META_DESCRIPTION =
  "Read how Liftdle processes gameplay data, analytics consent, and user privacy rights for the daily fitness guessing game.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/privacy",
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

export default function PrivacyPage() {
  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Liftdle Privacy Notice",
    url: "https://liftdle.com/privacy",
    description: META_DESCRIPTION,
    inLanguage: "en",
  };

  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }}
      />
      <section className="legal-page__shell">
        <h1 className="legal-page__title">Privacy Notice</h1>
        <p className="legal-page__line">Last updated: April 16, 2026</p>

        <h2>Controller</h2>
        <p>Liftdle project team</p>
        <p>Contact: support@liftdle.app</p>

        <h2>Data We Process</h2>
        <p>Gameplay data such as guesses, feedback, progress, and aggregated statistics.</p>
        <p>Authentication/session information managed through Supabase, including anonymous sessions.</p>
        <p>Operational telemetry related to service reliability and security.</p>

        <h2>Why We Process Data</h2>
        <p>To provide and secure gameplay features and user sessions.</p>
        <p>To detect abuse and maintain platform integrity.</p>
        <p>To improve product quality through analytics, only when consent is granted.</p>

        <h2>Third Parties</h2>
        <p>Supabase for authentication and database services.</p>
        <p>Vercel for hosting and analytics infrastructure.</p>

        <h2>Your Rights</h2>
        <p>You may request access, correction, deletion, and restriction or objection where applicable.</p>
        <p>You can update analytics preferences anytime from Cookie settings in the app.</p>

        <p className="legal-page__line">
          See also the <Link href="/cookies">Cookie notice</Link>.
        </p>
      </section>
    </main>
  );
}
