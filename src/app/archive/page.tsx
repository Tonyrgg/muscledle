import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ArchiveCards } from "@/components/archive/archive-cards";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Liftdle Archive - Guess the exercise",
  description: "Daily fitness guessing game. Can you identify the exercise?",
};

export default async function ArchivePage() {
  const rows = await listExerciseArchive();

  return (
    <main className="archive-page">
      <section className="archive-shell archive-shell--cards">
        <header className="archive-hero">
          <Logo className="archive-hero__logo" />
          <p className="archive-hero__kicker">Explore Liftdle Movements</p>
          <h1 className="archive-hero__title">Exercise Library</h1>
          <Link className="archive-hero__back" href="/">
            Play Now
          </Link>
        </header>
        <ArchiveCards rows={rows.filter((row) => row.isLive)} />
      </section>
    </main>
  );
}


