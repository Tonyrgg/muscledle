import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ArchiveSimulator } from "@/components/archive/archive-simulator";
import { ArchiveTable } from "@/components/archive/archive-table";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liftdle Hidden Archive",
  description: "Private operational archive for Liftdle exercise analytics and media quality.",
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
          <Logo className="archive-hero__logo" />
          <p className="archive-hero__kicker">Liftdle Backoffice</p>
          <h1 className="archive-hero__title">Hidden Exercise Archive</h1>
          <p className="archive-hero__stats">
            LIVE {live} - GIF MATCHED {matched} - ENRICHED {enriched}
          </p>
          <Link className="archive-hero__back" href="/">
            Play Now
          </Link>
        </header>

        <ArchiveSimulator rows={rows} />
        <ArchiveTable rows={rows} />
      </section>
    </main>
  );
}

