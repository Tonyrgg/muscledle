import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ArchiveCards } from "@/components/archive/archive-cards";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";

const OG_IMAGE_PATH = "/og/liftdle-og.png";
const META_TITLE = "Liftdle Archive - Exercise Library and Past Daily Targets";
const META_DESCRIPTION =
  "Browse the Liftdle archive of gym exercises, movement clues, and historical daily targets to improve your guessing strategy.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/archive",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "/archive",
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

export default async function ArchivePage() {
  const rows = await listExerciseArchive();
  const liveRows = rows.filter((row) => row.isLive);
  const archiveJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Liftdle Exercise Archive",
        url: "https://liftdle.com/archive",
        description: META_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "ItemList",
        name: "Liftdle Live Exercises",
        numberOfItems: liveRows.length,
        itemListElement: liveRows.slice(0, 100).map((row, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: row.name,
          url: `https://liftdle.com/exercise/${row.slug}`,
        })),
      },
    ],
  };

  return (
    <main className="archive-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(archiveJsonLd) }}
      />
      <section className="archive-shell archive-shell--cards">
        <header className="archive-hero">
          <Logo className="archive-hero__logo" />
          <p className="archive-hero__kicker">Explore Liftdle Movements</p>
          <h1 className="archive-hero__title">Exercise Library</h1>
          <Link className="archive-hero__back" href="/">
            Play Now
          </Link>
        </header>
        <ArchiveCards rows={liveRows} />
      </section>
    </main>
  );
}


