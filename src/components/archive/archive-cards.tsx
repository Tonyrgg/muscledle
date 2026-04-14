'use client';

import Image from "next/image";
import { useMemo, useState } from "react";
import { getExerciseIconCandidates } from "@/lib/exercises/icons";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";

type ArchiveCardsProps = {
  rows: ExerciseArchiveRow[];
};

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildInfoLine(row: ExerciseArchiveRow): string {
  const movement = row.movement[0] ? titleCase(row.movement[0]) : "Mixed";
  const pattern = row.pattern[0] ? titleCase(row.pattern[0]) : "Mixed";
  const reps = row.reps[0] ?? "6-12";
  const goal = row.goal[0] ? titleCase(row.goal[0]) : "Hypertrophy";
  return `${movement} movement, ${pattern} pattern, typical reps ${reps}, primary goal ${goal}.`;
}

export function ArchiveCards({ rows }: ArchiveCardsProps) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

  const groups = useMemo(() => {
    const values = new Set(rows.map((row) => row.muscleGroup));
    return ["all", ...Array.from(values).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter !== "all" && row.muscleGroup !== groupFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = `${row.name} ${row.slug} ${row.aliases.join(" ")} ${row.muscleGroup}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [groupFilter, query, rows]);

  return (
    <section className="archive-cards" aria-label="Exercise library cards">
      <div className="archive-toolbar">
        <input
          className="archive-toolbar__search"
          placeholder="Search exercise or alias..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="archive-toolbar__select"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          {groups.map((group) => (
            <option key={group} value={group}>
              {group === "all" ? "All groups" : titleCase(group)}
            </option>
          ))}
        </select>
      </div>

      <p className="archive-meta">Showing {filtered.length} / {rows.length}</p>

      <div className="archive-cards__grid">
        {filtered.map((row) => {
          const icon = getExerciseIconCandidates({
            slug: row.slug,
            name: row.name,
            muscle_group: row.muscleGroup,
          })[0] ?? "/muscle-icons/full-body.svg";

          return (
            <article key={row.id} className="archive-card">
              <div className="archive-card__media-wrap">
                <Image src={icon} alt="" width={92} height={92} className="archive-card__media" />
              </div>
              <div className="archive-card__body">
                <p className="archive-card__group">{titleCase(row.muscleGroup)}</p>
                <h2 className="archive-card__name">{row.name}</h2>
                <p className="archive-card__slug">{row.slug}</p>
                <p className="archive-card__info">{buildInfoLine(row)}</p>
                <div className="archive-card__chips">
                  <span className="archive-card__chip">{titleCase(row.equipment[0] ?? "bodyweight")}</span>
                  <span className="archive-card__chip">{titleCase(row.goal[0] ?? "hypertrophy")}</span>
                  <span className="archive-card__chip">{(row.reps[0] ?? "6-12").toUpperCase()}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
