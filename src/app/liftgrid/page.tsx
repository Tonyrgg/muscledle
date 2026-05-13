import type { Metadata } from "next";
import { LiftGridPage } from "@/components/liftgrid/liftgrid-page";

const META_TITLE = "Liftdle LiftGrid Daily";
const META_DESCRIPTION =
  "Play LiftGrid, the daily Liftdle grid mode. Fill the 3x3 board by matching exercises to muscle and equipment categories.";
const OG_IMAGE_PATH = "/og/liftdle-og.png";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/liftgrid",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/liftgrid",
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

export default function Page() {
  return <LiftGridPage />;
}
