import type { Metadata } from "next";
import { LoadGuessPage } from "@/components/loadguess/loadguess-page";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle WeightGuess Daily";
const META_DESCRIPTION =
  "Play Liftdle WeightGuess. Four rounds, five attempts per round, and a clean clip reveal after every result.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/weightGuess",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/weightGuess",
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

const weightGuessJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Liftdle WeightGuess Daily",
  url: `${SITE_URL}/weightGuess`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(weightGuessJsonLd) }}
      />
      <LoadGuessPage />
    </>
  );
}
