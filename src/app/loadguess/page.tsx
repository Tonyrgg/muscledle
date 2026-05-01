import type { Metadata } from "next";
import { LoadGuessPage } from "@/components/loadguess/loadguess-page";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle LoadGuess Daily - Guess the Load";
const META_DESCRIPTION =
  "Play Liftdle LoadGuess Daily. Five rounds per day, five attempts per round, and a final recap of every lift.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/loadguess",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/loadguess",
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

const loadGuessJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Liftdle LoadGuess Daily",
  url: `${SITE_URL}/loadguess`,
  description: META_DESCRIPTION,
  inLanguage: "en",
  isPartOf: {
    "@type": "WebSite",
    name: "Liftdle",
    url: SITE_URL,
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(loadGuessJsonLd) }}
      />
      <LoadGuessPage />
    </>
  );
}
