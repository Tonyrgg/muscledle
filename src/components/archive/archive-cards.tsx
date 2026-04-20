'use client';

import Link from "next/link";
import { useMemo, useState, type SyntheticEvent } from "react";
import {
  getMuscleGroupIconKey,
  getMuscleGroupIconPath,
  resolveMuscleGroupIconKey,
} from "@/lib/exercises/icons";
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

function parseMuscleTokens(values: string[]): string[] {
  return values
    .flatMap((value) => value.split("/"))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function resolveArchivePrimaryIcon(row: ExerciseArchiveRow): string {
  const resolvedKey = resolveMuscleGroupIconKey({
    slug: row.slug,
    name: row.name,
    muscle_group: row.muscleGroup,
  });

  return getMuscleGroupIconPath(resolvedKey);
}

function resolveIconPathFromToken(token: string): string {
  const directKey = getMuscleGroupIconKey(token);
  if (directKey !== "full-body") {
    return getMuscleGroupIconPath(directKey);
  }

  const inferredKey = resolveMuscleGroupIconKey({
    slug: "",
    name: token,
    muscle_group: token,
  });

  return getMuscleGroupIconPath(inferredKey);
}

function resolveArchiveSplitIconPaths(row: ExerciseArchiveRow): readonly [string, string] | null {
  const tokens = parseMuscleTokens(row.muscle);
  if (tokens.length < 2) return null;

  const uniquePaths = Array.from(new Set(tokens.map((token) => resolveIconPathFromToken(token))));
  if (uniquePaths.length < 2) return null;

  return [uniquePaths[0], uniquePaths[1]];
}

function onIconError(event: SyntheticEvent<HTMLImageElement>) {
  const fallback = "/muscle-icons/core.svg";
  if (event.currentTarget.src.endsWith(fallback)) return;
  event.currentTarget.src = fallback;
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
          const icon = resolveArchivePrimaryIcon(row);
          const splitIconPaths = resolveArchiveSplitIconPaths(row);

          return (
            <Link
              key={row.id}
              className="archive-card archive-card--interactive"
              href={`/exercise/${row.slug}`}
              prefetch={false}
              aria-label={`Open exercise page for ${row.name}`}
            >
              <div className="archive-card__media-wrap">
                {splitIconPaths ? (
                  <span className="archive-card__split" aria-hidden>
                    <img
                      src={splitIconPaths[0]}
                      alt=""
                      className="archive-card__split-part archive-card__split-part--primary"
                      width={92}
                      height={92}
                      loading="lazy"
                      onError={onIconError}
                    />
                    <img
                      src={splitIconPaths[1]}
                      alt=""
                      className="archive-card__split-part archive-card__split-part--secondary"
                      width={92}
                      height={92}
                      loading="lazy"
                      onError={onIconError}
                    />
                    <span className="archive-card__split-divider" />
                  </span>
                ) : (
                  <img
                    src={icon}
                    alt=""
                    width={92}
                    height={92}
                    className="archive-card__media"
                    loading="lazy"
                    onError={onIconError}
                  />
                )}
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
            </Link>
          );
        })}
      </div>
    </section>
  );
}
