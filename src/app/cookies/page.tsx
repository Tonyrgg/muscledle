import type { Metadata } from "next";
import Link from "next/link";

const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle Cookie Notice - Cookie Categories and Controls";
const META_DESCRIPTION =
  "Review Liftdle cookie categories, analytics consent options, and how cookie preferences affect measurement behavior.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/cookies",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/cookies",
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

export default function CookiesPage() {
  const cookiesJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Liftdle Cookie Notice",
    url: "https://liftdle.com/cookies",
    description: META_DESCRIPTION,
    inLanguage: "en",
  };

  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cookiesJsonLd) }}
      />
      <section className="legal-page__shell">
        <h1 className="legal-page__title">Cookie Notice</h1>
        <p className="legal-page__line">Last updated: April 16, 2026</p>

        <h2>Categories</h2>
        <p><strong>Necessary:</strong> required for authentication, security, and core gameplay. Always active.</p>
        <p><strong>Analytics:</strong> optional measurement used to improve product performance and user experience.</p>

        <h2>How To Manage Preferences</h2>
        <p>You can accept, refuse, or update analytics consent from Cookie settings at any time.</p>
        <p>Changing preferences affects future analytics collection and storage behavior.</p>

        <h2>Retention</h2>
        <p>Consent choices are stored with timestamp and policy version for compliance and audit purposes.</p>

        <p className="legal-page__line">
          See also the <Link href="/privacy">Privacy notice</Link>.
        </p>
      </section>
    </main>
  );
}
