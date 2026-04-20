'use client';

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  getAttributeDefinition,
  type FeedbackColumnKey,
} from "@/lib/exercises/attribute-definitions";
import { buildPostGameInsights, buildPreferredCoachNotesForSlug } from "@/lib/exercises/post-game-insights";
import {
  getMuscleGroupIconKey,
  getMuscleGroupIconPath,
  resolveMuscleGroupIconKey,
} from "@/lib/exercises/icons";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";
import type { LiveExerciseSuggestion } from "@/lib/game/client";

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

function formatCoachSectionLabel(key: string): string {
  const explicit: Record<string, string> = {
    coach_take: "Coach Take",
    make_it_easier: "Make It Easier",
    level_it_up: "Level It Up",
    build_size: "Build Size",
    build_strength: "Build Strength",
    build_skill: "Build Skill",
    build_control: "Build Control",
    build_resilience: "Build Resilience",
    chase_pump: "Chase Pump",
    build_power: "Build Power",
  };
  if (explicit[key]) return explicit[key];
  return titleCase(key.replaceAll("_", "-"));
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

function sanitizeMediaUrl(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned === "null" || cleaned === "undefined") return null;
  if (cleaned.startsWith("//")) return `https:${cleaned}`;
  return cleaned;
}

function detectMediaKind(url: string | null): "image" | "video" | "unknown" {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (/\.(mp4|webm|ogg)(\?|#|$)/.test(lower)) return "video";
  if (/\.(gif|png|jpg|jpeg|webp|avif|svg)(\?|#|$)/.test(lower)) return "image";
  return "unknown";
}

function formatList(values: string[]): string {
  if (values.length === 0) return "Not available";
  return values.map((value) => titleCase(value)).join(" / ");
}

function buildAttributeValue(values: string[]): string {
  if (values.length === 0) return "unknown";
  return values.join(" / ");
}

function getAttributeDetails(
  column: FeedbackColumnKey,
  values: string[],
): { label: string; summary: string; description: string } {
  const summary = formatList(values);
  const description = getAttributeDefinition(column, buildAttributeValue(values));
  return {
    label: titleCase(column),
    summary,
    description,
  };
}

function toLiveExerciseSuggestion(row: ExerciseArchiveRow): LiveExerciseSuggestion {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    canonical_name: row.name,
    display_name: row.name,
    aliases: row.aliases,
    muscle_group: row.muscleGroup as LiveExerciseSuggestion["muscle_group"],
    muscle: row.muscle as LiveExerciseSuggestion["muscle"],
    equipment: row.equipment as LiveExerciseSuggestion["equipment"],
    movement: row.movement as LiveExerciseSuggestion["movement"],
    pattern: row.pattern as LiveExerciseSuggestion["pattern"],
    reps: row.reps as LiveExerciseSuggestion["reps"],
    goal: row.goal as LiveExerciseSuggestion["goal"],
    ego: row.ego as LiveExerciseSuggestion["ego"],
  };
}

export function ArchiveCards({ rows }: ArchiveCardsProps) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<ExerciseArchiveRow | null>(null);
  const [coachNotesOpen, setCoachNotesOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

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

  const selectedIcon = useMemo(() => {
    if (!selectedRow) return "/muscle-icons/core.svg";
    return resolveArchivePrimaryIcon(selectedRow);
  }, [selectedRow]);
  const selectedSplitIconPaths = useMemo(
    () => (selectedRow ? resolveArchiveSplitIconPaths(selectedRow) : null),
    [selectedRow],
  );

  const selectedMediaUrl = useMemo(
    () => sanitizeMediaUrl(selectedRow?.media.mediaUrl ?? null),
    [selectedRow?.media.mediaUrl],
  );

  const selectedMediaKind = useMemo(
    () => detectMediaKind(selectedMediaUrl),
    [selectedMediaUrl],
  );

  const shouldShowFallbackIcon =
    !selectedMediaUrl || mediaFailed || selectedMediaKind === "unknown";

  const selectedCoachNotes = useMemo(
    () => buildPostGameInsights(selectedRow ? toLiveExerciseSuggestion(selectedRow) : null),
    [selectedRow],
  );
  const selectedCoachNotesPreferred = useMemo(
    () => (selectedRow ? buildPreferredCoachNotesForSlug(selectedRow.slug, selectedCoachNotes) : null),
    [selectedCoachNotes, selectedRow],
  );

  const openDetails = (row: ExerciseArchiveRow) => {
    setSelectedRow(row);
    setCoachNotesOpen(false);
    setMediaFailed(false);
  };

  useEffect(() => {
    if (!selectedRow) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRow(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedRow]);

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
            <article
              key={row.id}
              className="archive-card archive-card--interactive"
              onClick={() => openDetails(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDetails(row);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open details for ${row.name}`}
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
            </article>
          );
        })}
      </div>

      {selectedRow ? (
        <section
          className="archive-detail-modal"
          aria-label="Exercise details modal"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="archive-detail-modal__panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-detail-title"
          >
            <header className="archive-detail-modal__header">
              <div>
                <p className="archive-detail-modal__kicker">{titleCase(selectedRow.muscleGroup)} Focus</p>
                <h2 id="archive-detail-title" className="archive-detail-modal__title">{selectedRow.name}</h2>
              </div>
              <button
                type="button"
                className="exercise-media-modal__close"
                onClick={() => setSelectedRow(null)}
              >
                Close
              </button>
            </header>

            <div className="archive-detail-modal__layout">
              <section className="archive-detail-modal__media">
                {shouldShowFallbackIcon ? (
                  selectedSplitIconPaths ? (
                    <div className="archive-detail-modal__fallback-split" aria-label={`Muscle icons ${selectedRow.name}`}>
                      <img
                        src={selectedSplitIconPaths[0]}
                        alt=""
                        className="archive-detail-modal__fallback-split-part archive-detail-modal__fallback-split-part--primary"
                        width={148}
                        height={148}
                        loading="lazy"
                        onError={onIconError}
                      />
                      <img
                        src={selectedSplitIconPaths[1]}
                        alt=""
                        className="archive-detail-modal__fallback-split-part archive-detail-modal__fallback-split-part--secondary"
                        width={148}
                        height={148}
                        loading="lazy"
                        onError={onIconError}
                      />
                      <span className="archive-detail-modal__fallback-split-divider" />
                    </div>
                  ) : (
                    <img
                      src={selectedIcon}
                      alt={`${selectedRow.name} icon`}
                      width={148}
                      height={148}
                      className="archive-detail-modal__fallback-icon"
                      loading="lazy"
                      onError={onIconError}
                    />
                  )
                ) : selectedMediaKind === "video" ? (
                  <video
                    src={selectedMediaUrl ?? undefined}
                    className="archive-detail-modal__gif"
                    controls
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onError={() => setMediaFailed(true)}
                  />
                ) : (
                  <img
                    src={selectedMediaUrl ?? ""}
                    alt={`${selectedRow.name} preview`}
                    className="archive-detail-modal__gif"
                    loading="lazy"
                    onError={() => setMediaFailed(true)}
                  />
                )}
              </section>

              <section className="archive-detail-modal__content">
                <section
                  className="archive-detail-modal__coach"
                  aria-label="Coach notes"
                  role="button"
                  tabIndex={0}
                  aria-expanded={coachNotesOpen}
                  onClick={() => setCoachNotesOpen((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setCoachNotesOpen((current) => !current);
                    }
                  }}
                >
                  <div className="archive-detail-modal__coach-toggle">
                    <span className="archive-detail-modal__coach-kicker">Coach Notes</span>
                    <span
                      className={`archive-detail-modal__coach-chevron ${
                        coachNotesOpen ? "archive-detail-modal__coach-chevron--open" : ""
                      }`}
                      aria-hidden
                    />
                  </div>

                  {coachNotesOpen ? (
                    <div className="archive-detail-modal__coach-body">
                      <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("coach_take")}</p>
                      <p className="archive-detail-modal__coach-line">
                        {selectedCoachNotesPreferred?.coach_take ?? selectedCoachNotes.whyUse}
                      </p>
                      <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("make_it_easier")}</p>
                      <p className="archive-detail-modal__coach-line">
                        {selectedCoachNotesPreferred?.make_it_easier ?? selectedCoachNotes.variants.easier}
                      </p>
                      <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("level_it_up")}</p>
                      <p className="archive-detail-modal__coach-line">
                        {selectedCoachNotesPreferred?.level_it_up ?? selectedCoachNotes.variants.harder}
                      </p>
                      <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("build_size")}</p>
                      <p className="archive-detail-modal__coach-line">
                        {selectedCoachNotesPreferred?.build_size ?? selectedCoachNotes.dose.hypertrophy}
                      </p>
                      <p className="archive-detail-modal__coach-head">
                        {formatCoachSectionLabel(selectedCoachNotesPreferred?.secondary_key ?? "build_strength")}
                      </p>
                      <p className="archive-detail-modal__coach-line">
                        {selectedCoachNotesPreferred?.secondary_value ?? selectedCoachNotes.dose.strengthOrSkill}
                      </p>
                    </div>
                  ) : null}
                </section>

                <div className="archive-detail-modal__chip-groups">
                  <div className="archive-detail-modal__group">
                    <h3 className="archive-detail-modal__group-title">Attribute Breakdown</h3>
                    <div className="archive-detail-modal__detail-list">
                      {[
                        getAttributeDetails("muscle", selectedRow.muscle),
                        getAttributeDetails("equipment", selectedRow.equipment),
                        getAttributeDetails("movement", selectedRow.movement),
                        getAttributeDetails("pattern", selectedRow.pattern),
                        getAttributeDetails("reps", selectedRow.reps),
                        getAttributeDetails("goal", selectedRow.goal),
                        getAttributeDetails("ego", selectedRow.ego),
                      ].map((detail) => (
                        <article key={detail.label} className="archive-detail-modal__detail-item">
                          <p className="archive-detail-modal__detail-label">{detail.label}</p>
                          <p className="archive-detail-modal__detail-summary">{detail.summary}</p>
                          <p className="archive-detail-modal__detail-description">{detail.description}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="archive-detail-modal__group">
                    <h3 className="archive-detail-modal__group-title">Aliases</h3>
                    <div className="archive-detail-modal__chips">
                      {selectedRow.aliases.length > 0 ? (
                        selectedRow.aliases.map((alias) => (
                          <span key={alias} className="archive-detail-modal__chip archive-detail-modal__chip--soft">
                            {alias}
                          </span>
                        ))
                      ) : (
                        <span className="archive-detail-modal__chip archive-detail-modal__chip--soft">No aliases</span>
                      )}
                    </div>
                  </div>

                  <div className="archive-detail-modal__group">
                    <h3 className="archive-detail-modal__group-title">Status & Stats</h3>
                    <div className="archive-detail-modal__chips">
                      <span className="archive-detail-modal__chip">Visibility: {selectedRow.isLive ? "Live" : "Offline"}</span>
                      <span className="archive-detail-modal__chip">
                        Enrichment: {selectedRow.enrichment.status ?? "missing"}
                      </span>
                      <span className="archive-detail-modal__chip">
                        Accuracy: {selectedRow.stats.accuracy !== null ? `${selectedRow.stats.accuracy}%` : "N/A"}
                      </span>
                      <span className="archive-detail-modal__chip">Total guesses: {selectedRow.stats.totalGuesses}</span>
                      <span className="archive-detail-modal__chip">Unique guessers: {selectedRow.stats.uniqueGuessers}</span>
                      <span className="archive-detail-modal__chip">Daily targets: {selectedRow.stats.timesAsDailyTarget}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
