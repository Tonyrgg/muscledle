import Link from "next/link";
import { ArchiveCards } from "@/components/archive/archive-cards";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const rows = await listExerciseArchive();
  const withMedia = rows.filter((row) => row.media.syncStatus === "matched").length;
  const live = rows.filter((row) => row.isLive).length;

  return (
    <main className="archive-page">
      <section className="archive-shell archive-shell--cards">
        <header className="archive-hero">
          <p className="archive-hero__kicker">Explore Muscledle Movements</p>
          <h1 className="archive-hero__title">Exercise Library</h1>
          <p className="archive-hero__stats">
            LIVE {live} - WITH MEDIA {withMedia}
          </p>
          <Link className="archive-hero__back" href="/">
            Back To Game
          </Link>
        </header>

        <ArchiveCards rows={rows.filter((row) => row.isLive)} />
      </section>
    </main>
  );
}
