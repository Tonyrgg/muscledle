'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";

type ArchiveTableProps = {
  rows: ExerciseArchiveRow[];
};

export function ArchiveTable({ rows }: ArchiveTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "matched" | "missing">("all");
  const [enrichmentFilter, setEnrichmentFilter] = useState<"all" | "enriched" | "missing">("all");
  const [liveFilter, setLiveFilter] = useState<"all" | "live" | "offline">("all");
  const [muscleFilter, setMuscleFilter] = useState("all");

  const muscleGroups = useMemo(() => {
    const groups = new Set(rows.map((row) => row.muscleGroup));
    return ["all", ...Array.from(groups).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "matched" && row.media.syncStatus !== "matched") return false;
      if (statusFilter === "missing" && row.media.syncStatus === "matched") return false;
      if (enrichmentFilter === "enriched" && row.enrichment.status !== "enriched") return false;
      if (enrichmentFilter === "missing" && row.enrichment.status === "enriched") return false;
      if (liveFilter === "live" && !row.isLive) return false;
      if (liveFilter === "offline" && row.isLive) return false;
      if (muscleFilter !== "all" && row.muscleGroup !== muscleFilter) return false;

      if (!normalizedQuery) return true;
      const haystack = `${row.name} ${row.slug} ${row.aliases.join(" ")} ${row.muscle.join(" ")} ${row.equipment.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [rows, query, statusFilter, enrichmentFilter, liveFilter, muscleFilter]);

  return (
    <section className="archive-panel" aria-label="Exercise archive">
      <div className="archive-toolbar">
        <input
          className="archive-toolbar__search"
          placeholder="Search exercise, slug, alias..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="archive-toolbar__select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "matched" | "missing")}
        >
          <option value="all">All media</option>
          <option value="matched">GIF matched</option>
          <option value="missing">GIF missing</option>
        </select>
        <select
          className="archive-toolbar__select"
          value={enrichmentFilter}
          onChange={(event) => setEnrichmentFilter(event.target.value as "all" | "enriched" | "missing")}
        >
          <option value="all">All enrichment</option>
          <option value="enriched">Enriched</option>
          <option value="missing">Missing</option>
        </select>
        <select
          className="archive-toolbar__select"
          value={liveFilter}
          onChange={(event) => setLiveFilter(event.target.value as "all" | "live" | "offline")}
        >
          <option value="all">All visibility</option>
          <option value="live">Live</option>
          <option value="offline">Offline</option>
        </select>
        <select
          className="archive-toolbar__select"
          value={muscleFilter}
          onChange={(event) => setMuscleFilter(event.target.value)}
        >
          {muscleGroups.map((group) => (
            <option key={group} value={group}>
              {group === "all" ? "All groups" : group}
            </option>
          ))}
        </select>
      </div>

      <p className="archive-meta">Showing {filtered.length} / {rows.length}</p>

      <div className="archive-table-scroll" role="region" aria-label="Archive table" tabIndex={0}>
        <table className="archive-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Live</th>
              <th>GIF</th>
              <th>Media URL</th>
              <th>Enrichment</th>
              <th>Properties</th>
              <th>Guesses</th>
              <th>Guessers</th>
              <th>Accuracy</th>
              <th>Targets</th>
              <th>Avg Solve</th>
              <th>Last Guess</th>
              <th>Last Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <p className="archive-table__name">{row.name}</p>
                  <p className="archive-table__slug">{row.slug}</p>
                  <p className="archive-table__sub">
                    <Link href={row.exercisePagePath} className="archive-table__link" target="_blank" rel="noreferrer">
                      Open exercise page
                    </Link>
                  </p>
                  {row.enrichment.providerExerciseId || row.enrichment.providerExerciseName || row.media.providerExerciseName ? (
                    <p className="archive-table__sub">
                      ExerciseDB{" "}
                      {row.enrichment.providerExerciseId ? `#${row.enrichment.providerExerciseId}` : ""}
                      {row.enrichment.providerExerciseName
                        ? ` - ${row.enrichment.providerExerciseName}`
                        : row.media.providerExerciseName
                          ? ` - ${row.media.providerExerciseName}`
                          : ""}
                    </p>
                  ) : null}
                  {row.aliases.length > 0 ? <p className="archive-table__sub">{row.aliases.slice(0, 3).join(" - ")}</p> : null}
                </td>
                <td>{row.muscleGroup}</td>
                <td>
                  <span className={`archive-badge ${row.isLive ? "archive-badge--ok" : "archive-badge--warn"}`}>
                    {row.isLive ? "live" : "offline"}
                  </span>
                </td>
                <td>{row.media.syncStatus ?? "missing"}</td>
                <td>{row.media.mediaUrl ? "yes" : "no"}</td>
                <td>{row.enrichment.status ?? "missing"}</td>
                <td className="archive-table__props-cell">
                  <p className="archive-table__props-line">{row.muscle.join(" / ")}</p>
                  <p className="archive-table__props-line">{row.equipment.join(" / ")}</p>
                  <p className="archive-table__props-line">
                    {row.movement.join(" / ")} - {row.pattern.join(" / ")}
                  </p>
                  <p className="archive-table__props-line">
                    {row.reps.join(" / ")} - {row.goal.join(" / ")} - {row.ego.join(" / ")}
                  </p>
                </td>
                <td>{row.stats.totalGuesses}</td>
                <td>{row.stats.uniqueGuessers}</td>
                <td>{row.stats.accuracy !== null ? `${row.stats.accuracy}%` : "-"}</td>
                <td>{row.stats.timesAsDailyTarget}</td>
                <td>{row.stats.avgGuessesToSolveWhenTarget ?? "-"}</td>
                <td>{row.stats.lastGuessedAt ? row.stats.lastGuessedAt.slice(0, 10) : "-"}</td>
                <td>{row.stats.lastDailyTargetDate ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
