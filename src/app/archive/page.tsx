import Link from "next/link";
import { ArchiveTable } from "@/components/archive/archive-table";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const rows = await listExerciseArchive();
  const matched = rows.filter((row) => row.media.syncStatus === "matched").length;
  const enriched = rows.filter((row) => row.enrichment.status === "enriched").length;
  const live = rows.filter((row) => row.isLive).length;

  return (
    <main className="archive-page">
      <section className="archive-shell">
        <header className="archive-hero">
          <p className="archive-hero__kicker">Muscledle Backoffice</p>
          <h1 className="archive-hero__title">Exercise Archive</h1>
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

