'use client';

import { useMemo, useState } from "react";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";

type ArchiveTableProps = {
  rows: ExerciseArchiveRow[];
};

export function ArchiveTable({ rows }: ArchiveTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "matched" | "missing">("all");
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
      if (muscleFilter !== "all" && row.muscleGroup !== muscleFilter) return false;

      if (!normalizedQuery) return true;
      const haystack = `${row.name} ${row.slug} ${row.aliases.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [rows, query, statusFilter, muscleFilter]);

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
              <th>GIF</th>
              <th>Enrichment</th>
              <th>Guesses</th>
              <th>Accuracy</th>
              <th>Targets</th>
              <th>Avg Solve</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <p className="archive-table__name">{row.name}</p>
                  <p className="archive-table__slug">{row.slug}</p>
                </td>
                <td>{row.muscleGroup}</td>
                <td>{row.media.syncStatus ?? "missing"}</td>
                <td>{row.enrichment.status ?? "missing"}</td>
                <td>{row.stats.totalGuesses}</td>
                <td>{row.stats.accuracy !== null ? `${row.stats.accuracy}%` : "-"}</td>
                <td>{row.stats.timesAsDailyTarget}</td>
                <td>{row.stats.avgGuessesToSolveWhenTarget ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

