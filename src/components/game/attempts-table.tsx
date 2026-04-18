import { useEffect, useRef, useState } from "react";
import { AttemptRow } from "@/components/game/attempt-row";
import { ExerciseIconCell } from "@/components/game/exercise-icon-cell";
import { FeedbackCell } from "@/components/game/feedback-cell";
import type { FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";
import type { PublicGameAttempt } from "@/types/game";

type AttemptsTableProps = {
  attempts: PublicGameAttempt[];
  loading?: boolean;
  revealingAttemptId?: string | null;
};

const columns = ["Exercise", "Muscle", "Equipment", "Movement", "Pattern", "Reps", "Goal", "Ego"] as const;

const mobileColumnKeys: FeedbackColumnKey[] = [
  "muscle",
  "equipment",
  "movement",
  "pattern",
  "reps",
  "goal",
  "ego",
];

function MobileAttemptCard({
  attempt,
  isRevealing,
}: {
  attempt: PublicGameAttempt;
  isRevealing: boolean;
}) {
  return (
    <article className="attempts-mobile-card" aria-label={`Attempt ${attempt.guessName}`}>
      <div className="attempts-mobile-grid">
        <section className="attempts-mobile-slot attempts-mobile-slot--exercise">
          <p className="attempts-mobile-slot__label">Exercise</p>
          <div className="attempts-mobile-slot__body attempts-mobile-slot__body--exercise">
            <ExerciseIconCell
              exerciseName={attempt.guessName}
              exerciseSlug={attempt.guessSlug}
              exerciseMuscleGroup={attempt.guessMuscleGroup}
              exerciseMuscleValues={attempt.values.muscle}
            />
          </div>
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Muscle</p>
          <FeedbackCell
            column={mobileColumnKeys[0]}
            color={attempt.feedback.muscle}
            value={attempt.values.muscle}
            isRevealing={isRevealing}
            revealOrder={0}
          />
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Equipment</p>
          <FeedbackCell
            column={mobileColumnKeys[1]}
            color={attempt.feedback.equipment}
            value={attempt.values.equipment}
            isRevealing={isRevealing}
            revealOrder={1}
          />
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Movement</p>
          <FeedbackCell
            column={mobileColumnKeys[2]}
            color={attempt.feedback.movement}
            value={attempt.values.movement}
            isRevealing={isRevealing}
            revealOrder={2}
          />
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Pattern</p>
          <FeedbackCell
            column={mobileColumnKeys[3]}
            color={attempt.feedback.pattern}
            value={attempt.values.pattern}
            isRevealing={isRevealing}
            revealOrder={3}
          />
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Reps</p>
          <FeedbackCell
            column={mobileColumnKeys[4]}
            color={attempt.feedback.reps}
            value={attempt.values.reps}
            isRevealing={isRevealing}
            revealOrder={4}
          />
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Goal</p>
          <FeedbackCell
            column={mobileColumnKeys[5]}
            color={attempt.feedback.goal}
            value={attempt.values.goal}
            isRevealing={isRevealing}
            revealOrder={5}
          />
        </section>

        <section className="attempts-mobile-slot">
          <p className="attempts-mobile-slot__label">Ego</p>
          <FeedbackCell
            column={mobileColumnKeys[6]}
            color={attempt.feedback.ego}
            value={attempt.values.ego}
            isRevealing={isRevealing}
            revealOrder={6}
          />
        </section>
      </div>
    </article>
  );
}

export function AttemptsTable({
  attempts,
  loading = false,
  revealingAttemptId = null,
}: AttemptsTableProps) {
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const previousAttemptsCountRef = useRef(attempts.length);
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(query.matches);
    sync();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }

    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  useEffect(() => {
    if (!isMobile || loading || attempts.length === 0) {
      previousAttemptsCountRef.current = attempts.length;
      return;
    }

    const hasNewAttempt = attempts.length > previousAttemptsCountRef.current;
    previousAttemptsCountRef.current = attempts.length;

    if (!hasNewAttempt) {
      return;
    }

    const container = mobileScrollRef.current;
    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    });
  }, [attempts, isMobile, loading]);

  if (loading) {
    if (isMobile) {
      return (
        <div className="attempts-mobile-scroll" role="status" aria-live="polite" aria-label="Loading attempts">
          {Array.from({ length: 2 }).map((_, index) => (
            <article key={index} className="attempts-mobile-card attempts-mobile-card--loading">
              <div className="attempts-mobile-grid attempts-mobile-grid--loading">
                {Array.from({ length: 8 }).map((__, cellIndex) => (
                  <div key={cellIndex} className="attempts-mobile-slot attempts-mobile-slot--loading">
                    <span className="attempts-mobile-slot__label-skeleton" />
                    <span className="attempts-mobile-slot__body-skeleton" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      );
    }

    return (
      <div className="attempts-table-scroll" role="status" aria-live="polite" aria-label="Loading attempts">
        <div className="attempts-table attempts-loading">
          <div className="attempts-grid attempts-grid--header attempts-grid--skeleton-header">
            {columns.map((column) => (
              <div key={column} className="attempts-header-cell attempts-header-cell--skeleton">
                {column}
              </div>
            ))}
          </div>

          <div className="attempts-body">
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} className="attempts-grid attempts-loading__grid-row" aria-hidden>
                {Array.from({ length: columns.length }).map((__, cellIndex) => (
                  <div
                    key={`${rowIndex}-${cellIndex}`}
                    className={`attempts-loading__cell ${cellIndex === 0 ? "attempts-loading__cell--icon" : ""}`}
                  >
                    {cellIndex === 0 ? (
                      <div className="attempts-loading__exercise-skeleton">
                        <span className="attempts-loading__exercise-glyph" />
                        <span className="attempts-loading__exercise-line attempts-loading__exercise-line--main" />
                      </div>
                    ) : (
                      <div className="attempts-loading__value-skeleton">
                        <span className="attempts-loading__value-line" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return <p className="attempts-empty">No attempts yet. Make your first guess.</p>;
  }

  if (isMobile) {
    return (
      <div
        ref={mobileScrollRef}
        className="attempts-mobile-scroll"
        role="region"
        aria-label="Attempts carousel"
        tabIndex={0}
      >
        {attempts.map((attempt) => (
          <MobileAttemptCard
            key={attempt.id}
            attempt={attempt}
            isRevealing={attempt.id === revealingAttemptId}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="attempts-table-scroll" role="region" aria-label="Attempts table" tabIndex={0}>
      <div className="attempts-table" role="table" aria-rowcount={attempts.length + 1}>
        <div className="attempts-grid attempts-grid--header" role="row">
          {columns.map((column) => (
            <div key={column} className="attempts-header-cell" role="columnheader">
              {column}
            </div>
          ))}
        </div>

        <div className="attempts-body" role="rowgroup">
          {attempts.map((attempt) => (
            <AttemptRow key={attempt.id} attempt={attempt} isRevealing={attempt.id === revealingAttemptId} />
          ))}
        </div>
      </div>
    </div>
  );
}
