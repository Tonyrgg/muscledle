import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAttributeDefinition,
  type FeedbackColumnKey,
} from "@/lib/exercises/attribute-definitions";
import { getLiveExerciseSeoEntryBySlug, listLiveExerciseSeoEntries } from "@/lib/exercises/catalog";
import { buildPostGameInsights, buildPreferredCoachNotesForSlug } from "@/lib/exercises/post-game-insights";
import { listExerciseArchive } from "@/lib/exercise-archive/service";
import {
  getExerciseIconCandidates,
  getMuscleGroupIconKey,
  getMuscleGroupIconPath,
  resolveMuscleGroupIconKey,
} from "@/lib/exercises/icons";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";
import type { LiveExerciseSuggestion } from "@/lib/game/client";

type ExercisePageProps = {
  params: Promise<{ slug: string }>;
};

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";

export const revalidate = 3600;

function toTitleCase(value: string): string {
  return value
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatList(values: string[]): string {
  if (values.length === 0) return "Not available";
  return values.map((value) => toTitleCase(value)).join(" / ");
}

function parseMuscleTokens(values: string[]): string[] {
  return values
    .flatMap((value) => value.split("/"))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
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

function resolveSplitIconPaths(row: ExerciseArchiveRow): readonly [string, string] | null {
  const tokens = parseMuscleTokens(row.muscle);
  if (tokens.length < 2) return null;

  const uniquePaths = Array.from(new Set(tokens.map((token) => resolveIconPathFromToken(token))));
  if (uniquePaths.length < 2) return null;

  return [uniquePaths[0], uniquePaths[1]];
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
    label: toTitleCase(column),
    summary,
    description,
  };
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
  return toTitleCase(key.replaceAll("_", "-"));
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

function buildExerciseDescription(exercise: {
  display_name: string;
  muscle_group: string;
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
}): string {
  const equipment = exercise.equipment.map(toTitleCase).join(", ");
  const movement = exercise.movement.map(toTitleCase).join(", ");
  const pattern = exercise.pattern.map(toTitleCase).join(", ");
  const reps = exercise.reps.join(", ");
  const goal = exercise.goal.map(toTitleCase).join(", ");
  return `${exercise.display_name} is a ${toTitleCase(exercise.muscle_group)} exercise in Liftdle. Typical setup uses ${equipment}. It follows ${movement} and ${pattern} patterns, commonly trained in ${reps} reps for ${goal}.`;
}

export async function generateStaticParams() {
  try {
    const entries = await listLiveExerciseSeoEntries();
    return entries.map((entry) => ({ slug: entry.slug }));
  } catch (error) {
    console.error("Failed to generate exercise static params", error);
    return [];
  }
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = await getLiveExerciseSeoEntryBySlug(slug.trim().toLowerCase());

  if (!exercise) {
    return {
      title: "Exercise Not Found | Liftdle",
      description: "The requested exercise page was not found.",
    };
  }

  const title = `${exercise.display_name} Exercise Guide | Liftdle`;
  const description = buildExerciseDescription(exercise);

  return {
    title,
    description,
    alternates: {
      canonical: `/exercise/${exercise.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/exercise/${exercise.slug}`,
      type: "article",
      images: [{ url: OG_IMAGE_PATH, alt: exercise.display_name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.trim().toLowerCase();
  const exercise = await getLiveExerciseSeoEntryBySlug(normalizedSlug);

  if (!exercise) {
    notFound();
  }

  const archiveRows = await listExerciseArchive();
  const archiveRow = archiveRows.find((row) => row.slug === exercise.slug);
  if (!archiveRow) {
    notFound();
  }

  const related = archiveRows
    .filter((row) => row.isLive && row.slug !== archiveRow.slug && row.muscleGroup === archiveRow.muscleGroup)
    .slice(0, 8);

  const primaryIcon =
    getExerciseIconCandidates({
      slug: archiveRow.slug,
      name: archiveRow.name,
      muscle_group: archiveRow.muscleGroup,
    })[0] ?? "/muscle-icons/full-body.svg";
  const splitIconPaths = resolveSplitIconPaths(archiveRow);

  const mediaUrl = sanitizeMediaUrl(archiveRow.media.mediaUrl);
  const mediaKind = detectMediaKind(mediaUrl);
  const shouldShowFallbackIcon = !mediaUrl || mediaKind === "unknown";

  const description = buildExerciseDescription(exercise);
  const notes = buildPostGameInsights(toLiveExerciseSuggestion(archiveRow));
  const notesPreferred = buildPreferredCoachNotesForSlug(archiveRow.slug, notes);

  const exerciseJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${exercise.display_name} Exercise`,
    url: `${SITE_URL}/exercise/${exercise.slug}`,
    description,
    inLanguage: "en",
    mainEntity: {
      "@type": "Thing",
      name: exercise.display_name,
      additionalProperty: [
        { "@type": "PropertyValue", name: "Muscle Group", value: toTitleCase(exercise.muscle_group) },
        { "@type": "PropertyValue", name: "Equipment", value: formatList(exercise.equipment) },
        { "@type": "PropertyValue", name: "Movement", value: formatList(exercise.movement) },
        { "@type": "PropertyValue", name: "Pattern", value: formatList(exercise.pattern) },
        { "@type": "PropertyValue", name: "Reps", value: exercise.reps.join(", ") },
        { "@type": "PropertyValue", name: "Goal", value: formatList(exercise.goal) },
      ],
    },
    isPartOf: {
      "@type": "WebSite",
      name: "Liftdle",
      url: SITE_URL,
    },
  };

  return (
    <main className="legal-page exercise-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(exerciseJsonLd) }}
      />
      <section className="exercise-page__shell">
        <header className="exercise-page__header">
          <div>
            <p className="exercise-page__kicker">{toTitleCase(archiveRow.muscleGroup)} Focus</p>
            <h1 className="exercise-page__title">{exercise.display_name}</h1>
          </div>
          <Link className="exercise-media-modal__close" href="/archive">
            Back to Archive
          </Link>
        </header>

        <div className="exercise-page__layout">
          <aside className="exercise-page__media-col">
            <section className="exercise-page__card exercise-page__media-card">
              {shouldShowFallbackIcon ? (
                splitIconPaths ? (
                  <div className="archive-detail-modal__fallback-split" aria-label={`Muscle icons ${exercise.display_name}`}>
                    <img
                      src={splitIconPaths[0]}
                      alt=""
                      className="archive-detail-modal__fallback-split-part archive-detail-modal__fallback-split-part--primary"
                      width={148}
                      height={148}
                      loading="lazy"
                    />
                    <img
                      src={splitIconPaths[1]}
                      alt=""
                      className="archive-detail-modal__fallback-split-part archive-detail-modal__fallback-split-part--secondary"
                      width={148}
                      height={148}
                      loading="lazy"
                    />
                    <span className="archive-detail-modal__fallback-split-divider" />
                  </div>
                ) : (
                  <img
                    src={primaryIcon}
                    alt={`${exercise.display_name} icon`}
                    width={148}
                    height={148}
                    className="archive-detail-modal__fallback-icon"
                    loading="lazy"
                  />
                )
              ) : mediaKind === "video" ? (
                <video
                  src={mediaUrl ?? undefined}
                  className="archive-detail-modal__gif"
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={mediaUrl ?? ""}
                  alt={`${exercise.display_name} preview`}
                  className="archive-detail-modal__gif"
                  loading="lazy"
                />
              )}
            </section>
          </aside>

          <section className="exercise-page__main-col">
            <section className="exercise-page__card exercise-page__coach" aria-label="Coach notes">
              <div className="exercise-page__section-head">
                <span className="exercise-page__section-kicker">Coach Notes</span>
              </div>
              <div className="exercise-page__coach-body">
                <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("coach_take")}</p>
                <p className="archive-detail-modal__coach-line">{notesPreferred.coach_take}</p>
                <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("make_it_easier")}</p>
                <p className="archive-detail-modal__coach-line">{notesPreferred.make_it_easier}</p>
                <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("level_it_up")}</p>
                <p className="archive-detail-modal__coach-line">{notesPreferred.level_it_up}</p>
                <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel("build_size")}</p>
                <p className="archive-detail-modal__coach-line">{notesPreferred.build_size}</p>
                <p className="archive-detail-modal__coach-head">{formatCoachSectionLabel(notesPreferred.secondary_key)}</p>
                <p className="archive-detail-modal__coach-line">{notesPreferred.secondary_value}</p>
              </div>
            </section>

            <div className="exercise-page__content-grid">
              <div className="exercise-page__card exercise-page__card--attributes">
                <h2 className="archive-detail-modal__group-title">Attribute Breakdown</h2>
                <div className="archive-detail-modal__detail-list">
                  {[
                    getAttributeDetails("muscle", archiveRow.muscle),
                    getAttributeDetails("equipment", archiveRow.equipment),
                    getAttributeDetails("movement", archiveRow.movement),
                    getAttributeDetails("pattern", archiveRow.pattern),
                    getAttributeDetails("reps", archiveRow.reps),
                    getAttributeDetails("goal", archiveRow.goal),
                    getAttributeDetails("ego", archiveRow.ego),
                  ].map((detail) => (
                    <article key={detail.label} className="archive-detail-modal__detail-item">
                      <p className="archive-detail-modal__detail-label">{detail.label}</p>
                      <p className="archive-detail-modal__detail-summary">{detail.summary}</p>
                      <p className="archive-detail-modal__detail-description">{detail.description}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="exercise-page__card">
                <h2 className="archive-detail-modal__group-title">Related Exercises</h2>
                <div className="exercise-page__related">
                  {related.length > 0 ? (
                    related.map((entry) => (
                      <Link
                        key={entry.slug}
                        href={`/exercise/${entry.slug}`}
                        prefetch={false}
                        className="exercise-page__related-link"
                      >
                        {entry.name}
                      </Link>
                    ))
                  ) : (
                    <span className="archive-detail-modal__chip archive-detail-modal__chip--soft">No related exercises</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="legal-page__cta-wrap">
          <p className="legal-page__line legal-page__line--cta">Play Liftdle</p>
          <Link href="/" className="legal-page__cta">
            Back to Daily Challenge
          </Link>
        </div>
      </section>
    </main>
  );
}
