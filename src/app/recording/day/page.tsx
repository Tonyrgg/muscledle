import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/game/game-shell";
import { getPreviewGameStateDaysAgo } from "@/lib/game/bootstrap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liftdle Recording - Historical Daily",
  description: "Private recording route for historical daily puzzles.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

type RecordingDayPageProps = {
  searchParams?: Promise<{
    k?: string | string[];
    n?: string | string[];
  }>;
};

function readSingleQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function parseDaysAgo(raw: string | null): number {
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3650, Math.max(1, parsed));
}

export default async function RecordingDayPage({ searchParams }: RecordingDayPageProps) {
  const query = (await searchParams) ?? {};
  const expectedKey = process.env.LIFTDLE_RECORDING_KEY?.trim() ?? "";
  const providedKey = readSingleQueryValue(query.k)?.trim() ?? "";

  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    notFound();
  }

  const daysAgo = parseDaysAgo(readSingleQueryValue(query.n));
  const initialState = await getPreviewGameStateDaysAgo(daysAgo);

  return <GameShell initialState={initialState} />;
}
