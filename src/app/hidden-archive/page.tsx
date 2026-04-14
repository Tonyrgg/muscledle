import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveTable } from "@/components/archive/archive-table";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hidden Archive",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
};

export default async function HiddenArchivePage() {
  const rows = await listExerciseArchive();
  const matched = rows.filter((row) => row.media.syncStatus === "matched").length;
  const enriched = rows.filter((row) => row.enrichment.status === "enriched").length;
  const live = rows.filter((row) => row.isLive).length;

  return (
    <main className="archive-page">
      <section className="archive-shell">
        <header className="archive-hero">
          <p className="archive-hero__kicker">Muscledle Backoffice</p>
          <h1 className="archive-hero__title">Hidden Exercise Archive</h1>
          <p className="archive-hero__stats">
            LIVE {live} - GIF MATCHED {matched} - ENRICHED {enriched}
          </p>
          <Link className="archive-hero__back" href="/">
            Back To Game
          </Link>
        </header>

        <ArchiveTable rows={rows} />
      </section>
    </main>
  );
}

