import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/game/game-shell";
import { getYesterdayPreviewGameState } from "@/lib/game/bootstrap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liftdle Recording - Yesterday",
  description: "Private recording route for yesterday daily puzzle.",
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

type RecordingYesterdayPageProps = {
  searchParams?: Promise<{
    k?: string | string[];
  }>;
};

function readSingleQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function RecordingYesterdayPage({ searchParams }: RecordingYesterdayPageProps) {
  const query = (await searchParams) ?? {};
  const expectedKey = process.env.LIFTDLE_RECORDING_KEY?.trim() ?? "";
  const providedKey = readSingleQueryValue(query.k)?.trim() ?? "";

  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    notFound();
  }

  const initialState = await getYesterdayPreviewGameState();

  return <GameShell initialState={initialState} />;
}
