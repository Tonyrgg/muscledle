import { createAdminClient } from "@/lib/supabase/admin";

type VisitorRow = {
  id: string;
  public_id: string;
  linked_user_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  first_landing_date: string;
  first_country_code: string;
  last_country_code: string;
  first_path: string | null;
  last_path: string | null;
  session_count: number;
  page_view_count: number;
};

type VisitorSessionRow = {
  id: string;
  public_id: string;
  visitor_id: string;
  started_at: string;
  last_seen_at: string;
  country_code: string;
  landing_path: string | null;
  last_path: string | null;
  page_view_count: number;
  is_first_session: boolean;
};

type VisitorPageVisitRow = {
  public_id: string;
  visitor_id: string;
  session_id: string;
  path: string | null;
  referrer: string | null;
  country_code: string;
  visited_at: string;
  is_entry: boolean;
};

type FeedbackReportRow = {
  id: string;
  public_id: string;
  visitor_id: string;
  reporter_user_id: string | null;
  status: string;
  category: string;
  module: string | null;
  severity: string | null;
  impact: string | null;
  title: string;
  description: string;
  data_type: string | null;
  page_path: string | null;
  game_mode: string | null;
  triage_score: number;
  created_at: string;
};

type FeedbackAttachmentRow = {
  report_id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type ConsentEventRow = {
  public_id: string;
  user_id: string | null;
  visitor_id: string | null;
  source: string;
  action: string;
  policy_version: string;
  analytics: boolean;
  marketing: boolean;
  created_at: string;
};

type DailyGameRow = {
  public_id: string;
  user_id: string;
  game_date: string;
  status: string;
  guess_count: number;
  started_at: string | null;
  finished_at: string | null;
};

type GameAttemptRow = {
  public_id: string;
  user_id: string;
  game_date: string;
  user_daily_game_id: string;
  guess_index: number;
  is_correct: boolean;
  created_at: string;
};

type AnalyticsEventRow = {
  public_id: string;
  user_id: string | null;
  session_id: string | null;
  event_name: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type RetentionDashboardData = {
  generatedAt: string;
  totals: {
    visitors: number;
    visitorSessions: number;
    pageVisits: number;
    feedbackReports: number;
    dailyGames: number;
    attempts: number;
  };
  dailyAudience: Array<{
    date: string;
    uniqueVisitors: number;
    newVisitors: number;
    returningVisitors: number;
    signedInVisitors: number;
    sessions: number;
    pageViews: number;
    topCountries: string;
  }>;
  visitors: Array<{
    publicId: string;
    firstLandingDate: string;
    firstCountry: string;
    lastCountry: string;
    linkedUserId: string | null;
    sessions: number;
    pageViews: number;
    firstPath: string | null;
    lastPath: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
    visitorType: "new" | "returning";
  }>;
  sessions: Array<{
    publicId: string;
    visitorPublicId: string;
    startedAt: string;
    lastSeenAt: string;
    countryCode: string;
    landingPath: string | null;
    lastPath: string | null;
    pageViews: number;
    isFirstSession: boolean;
  }>;
  recentPageVisits: Array<{
    publicId: string;
    visitorPublicId: string;
    sessionPublicId: string;
    path: string | null;
    referrer: string | null;
    countryCode: string;
    visitedAt: string;
    isEntry: boolean;
  }>;
  feedbackReports: Array<{
    publicId: string;
    visitorId: string;
    reporterUserId: string | null;
    status: string;
    category: string;
    module: string | null;
    severity: string | null;
    impact: string | null;
    title: string;
    description: string;
    dataType: string | null;
    pagePath: string | null;
    gameMode: string | null;
    triageScore: number;
    attachmentCount: number;
    createdAt: string;
  }>;
  feedbackByDay: Array<{
    date: string;
    reports: number;
    bug: number;
    ux: number;
    feature: number;
    data: number;
  }>;
  consentEvents: ConsentEventRow[];
  dailyGames: DailyGameRow[];
  attempts: GameAttemptRow[];
  analyticsEvents: AnalyticsEventRow[];
  storageMap: Array<{
    table: string;
    purpose: string;
    readableId: string;
    keyFields: string;
  }>;
  warnings: string[];
};

function isoDate(input: string): string {
  return input.slice(0, 10);
}

function sortDescByDate<T>(rows: T[], getValue: (row: T) => string): T[] {
  return [...rows].sort((a, b) => getValue(b).localeCompare(getValue(a)));
}

async function queryTable<T>(
  run: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  tableName: string,
  warnings: string[],
): Promise<T[]> {
  const { data, error } = await run();

  if (error) {
    warnings.push(`${tableName}: ${error.message}`);
    return [];
  }

  return data ?? [];
}

export async function getRetentionDashboardData(): Promise<RetentionDashboardData> {
  const admin = createAdminClient();
  const warnings: string[] = [];

  const [
    visitorRows,
    sessionRows,
    pageVisitRows,
    feedbackRows,
    attachmentRows,
    consentRows,
    dailyGameRows,
    attemptRows,
    analyticsRows,
  ] = await Promise.all([
    queryTable<VisitorRow>(
      () =>
        admin
          .from("visitors")
          .select(
            "id, public_id, linked_user_id, first_seen_at, last_seen_at, first_landing_date, first_country_code, last_country_code, first_path, last_path, session_count, page_view_count",
          )
          .order("last_seen_at", { ascending: false })
          .limit(120)
          .returns<VisitorRow[]>(),
      "visitors",
      warnings,
    ),
    queryTable<VisitorSessionRow>(
      () =>
        admin
          .from("visitor_sessions")
          .select(
            "id, public_id, visitor_id, started_at, last_seen_at, country_code, landing_path, last_path, page_view_count, is_first_session",
          )
          .order("started_at", { ascending: false })
          .limit(1200)
          .returns<VisitorSessionRow[]>(),
      "visitor_sessions",
      warnings,
    ),
    queryTable<VisitorPageVisitRow>(
      () =>
        admin
          .from("visitor_page_visits")
          .select("public_id, visitor_id, session_id, path, referrer, country_code, visited_at, is_entry")
          .order("visited_at", { ascending: false })
          .limit(200)
          .returns<VisitorPageVisitRow[]>(),
      "visitor_page_visits",
      warnings,
    ),
    queryTable<FeedbackReportRow>(
      () =>
        admin
          .from("feedback_reports")
          .select(
            "id, public_id, visitor_id, reporter_user_id, status, category, module, severity, impact, title, description, data_type, page_path, game_mode, triage_score, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(120)
          .returns<FeedbackReportRow[]>(),
      "feedback_reports",
      warnings,
    ),
    queryTable<FeedbackAttachmentRow>(
      () =>
        admin
          .from("feedback_report_attachments")
          .select("report_id, file_name, mime_type, size_bytes, created_at")
          .order("created_at", { ascending: false })
          .limit(400)
          .returns<FeedbackAttachmentRow[]>(),
      "feedback_report_attachments",
      warnings,
    ),
    queryTable<ConsentEventRow>(
      () =>
        admin
          .from("privacy_consent_events")
          .select("public_id, user_id, visitor_id, source, action, policy_version, analytics, marketing, created_at")
          .order("created_at", { ascending: false })
          .limit(120)
          .returns<ConsentEventRow[]>(),
      "privacy_consent_events",
      warnings,
    ),
    queryTable<DailyGameRow>(
      () =>
        admin
          .from("user_daily_games")
          .select("public_id, user_id, game_date, status, guess_count, started_at, finished_at")
          .order("started_at", { ascending: false })
          .limit(120)
          .returns<DailyGameRow[]>(),
      "user_daily_games",
      warnings,
    ),
    queryTable<GameAttemptRow>(
      () =>
        admin
          .from("game_attempts")
          .select("public_id, user_id, game_date, user_daily_game_id, guess_index, is_correct, created_at")
          .order("created_at", { ascending: false })
          .limit(200)
          .returns<GameAttemptRow[]>(),
      "game_attempts",
      warnings,
    ),
    queryTable<AnalyticsEventRow>(
      () =>
        admin
          .from("analytics_events")
          .select("public_id, user_id, session_id, event_name, payload, created_at")
          .order("created_at", { ascending: false })
          .limit(120)
          .returns<AnalyticsEventRow[]>(),
      "analytics_events",
      warnings,
    ),
  ]);

  const visitorsById = new Map(visitorRows.map((row) => [row.id, row]));
  const sessionsById = new Map(sessionRows.map((row) => [row.id, row]));
  const attachmentCountByReportId = new Map<string, number>();
  for (const row of attachmentRows) {
    attachmentCountByReportId.set(
      row.report_id,
      (attachmentCountByReportId.get(row.report_id) ?? 0) + 1,
    );
  }

  const dailyAudienceMap = new Map<
    string,
    {
      visitors: Set<string>;
      newVisitors: Set<string>;
      returningVisitors: Set<string>;
      signedInVisitors: Set<string>;
      sessions: number;
      pageViews: number;
      countries: Map<string, number>;
    }
  >();

  for (const session of sessionRows) {
    const date = isoDate(session.started_at);
    const visitor = visitorsById.get(session.visitor_id);
    const bucket =
      dailyAudienceMap.get(date) ??
      {
        visitors: new Set<string>(),
        newVisitors: new Set<string>(),
        returningVisitors: new Set<string>(),
        signedInVisitors: new Set<string>(),
        sessions: 0,
        pageViews: 0,
        countries: new Map<string, number>(),
      };

    bucket.sessions += 1;
    bucket.pageViews += session.page_view_count;
    bucket.countries.set(
      session.country_code,
      (bucket.countries.get(session.country_code) ?? 0) + 1,
    );

    if (visitor) {
      bucket.visitors.add(visitor.id);
      if (visitor.linked_user_id) {
        bucket.signedInVisitors.add(visitor.id);
      }
      if (visitor.first_landing_date === date || session.is_first_session) {
        bucket.newVisitors.add(visitor.id);
      } else {
        bucket.returningVisitors.add(visitor.id);
      }
    }

    dailyAudienceMap.set(date, bucket);
  }

  const dailyAudience = sortDescByDate(
    Array.from(dailyAudienceMap.entries()).map(([date, bucket]) => {
      const topCountries = Array.from(bucket.countries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([code, count]) => `${code} ${count}`)
        .join(" | ");

      return {
        date,
        uniqueVisitors: bucket.visitors.size,
        newVisitors: bucket.newVisitors.size,
        returningVisitors: bucket.returningVisitors.size,
        signedInVisitors: bucket.signedInVisitors.size,
        sessions: bucket.sessions,
        pageViews: bucket.pageViews,
        topCountries,
      };
    }),
    (row) => row.date,
  ).slice(0, 30);

  const feedbackByDayMap = new Map<
    string,
    { reports: number; bug: number; ux: number; feature: number; data: number }
  >();
  for (const row of feedbackRows) {
    const date = isoDate(row.created_at);
    const bucket =
      feedbackByDayMap.get(date) ?? {
        reports: 0,
        bug: 0,
        ux: 0,
        feature: 0,
        data: 0,
      };
    bucket.reports += 1;
    if (row.category === "bug") bucket.bug += 1;
    if (row.category === "ux") bucket.ux += 1;
    if (row.category === "feature") bucket.feature += 1;
    if (row.category === "data") bucket.data += 1;
    feedbackByDayMap.set(date, bucket);
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      visitors: visitorRows.length,
      visitorSessions: sessionRows.length,
      pageVisits: pageVisitRows.length,
      feedbackReports: feedbackRows.length,
      dailyGames: dailyGameRows.length,
      attempts: attemptRows.length,
    },
    dailyAudience,
    visitors: visitorRows.map((row) => ({
      publicId: row.public_id,
      firstLandingDate: row.first_landing_date,
      firstCountry: row.first_country_code,
      lastCountry: row.last_country_code,
      linkedUserId: row.linked_user_id,
      sessions: row.session_count,
      pageViews: row.page_view_count,
      firstPath: row.first_path,
      lastPath: row.last_path,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      visitorType: row.session_count > 1 ? "returning" : "new",
    })),
    sessions: sessionRows.slice(0, 150).map((row) => ({
      publicId: row.public_id,
      visitorPublicId: visitorsById.get(row.visitor_id)?.public_id ?? row.visitor_id,
      startedAt: row.started_at,
      lastSeenAt: row.last_seen_at,
      countryCode: row.country_code,
      landingPath: row.landing_path,
      lastPath: row.last_path,
      pageViews: row.page_view_count,
      isFirstSession: row.is_first_session,
    })),
    recentPageVisits: pageVisitRows.slice(0, 120).map((row) => ({
      publicId: row.public_id,
      visitorPublicId: visitorsById.get(row.visitor_id)?.public_id ?? row.visitor_id,
      sessionPublicId: sessionsById.get(row.session_id)?.public_id ?? row.session_id,
      path: row.path,
      referrer: row.referrer,
      countryCode: row.country_code,
      visitedAt: row.visited_at,
      isEntry: row.is_entry,
    })),
    feedbackReports: feedbackRows.map((row) => ({
      publicId: row.public_id,
      visitorId: row.visitor_id,
      reporterUserId: row.reporter_user_id,
      status: row.status,
      category: row.category,
      module: row.module,
      severity: row.severity,
      impact: row.impact,
      title: row.title,
      description: row.description,
      dataType: row.data_type,
      pagePath: row.page_path,
      gameMode: row.game_mode,
      triageScore: row.triage_score,
      attachmentCount: attachmentCountByReportId.get(row.id) ?? 0,
      createdAt: row.created_at,
    })),
    feedbackByDay: sortDescByDate(
      Array.from(feedbackByDayMap.entries()).map(([date, bucket]) => ({
        date,
        reports: bucket.reports,
        bug: bucket.bug,
        ux: bucket.ux,
        feature: bucket.feature,
        data: bucket.data,
      })),
      (row) => row.date,
    ).slice(0, 30),
    consentEvents: consentRows,
    dailyGames: dailyGameRows,
    attempts: attemptRows,
    analyticsEvents: analyticsRows,
    storageMap: [
      {
        table: "visitors",
        purpose: "Anagrafica visitatore canonica per distinguere new vs returning.",
        readableId: "public_id",
        keyFields: "country, first_landing_date, linked_user_id, session_count, page_view_count",
      },
      {
        table: "visitor_sessions",
        purpose: "Sessioni di navigazione per giorno/ritorno/percorso.",
        readableId: "public_id",
        keyFields: "visitor_id, started_at, country_code, landing_path, page_view_count, is_first_session",
      },
      {
        table: "visitor_page_visits",
        purpose: "Dettaglio delle pagine visitate e degli entry point.",
        readableId: "public_id",
        keyFields: "visitor_id, session_id, path, referrer, country_code, is_entry",
      },
      {
        table: "feedback_reports",
        purpose: "Segnalazioni utente con categoria, severità, impatto e contesto.",
        readableId: "public_id",
        keyFields: "visitor_id, reporter_user_id, category, module, severity, impact, page_path, triage_score",
      },
      {
        table: "privacy_consent_events",
        purpose: "Storico preferenze privacy/cookie.",
        readableId: "public_id",
        keyFields: "visitor_id, user_id, source, action, analytics, marketing, policy_version",
      },
      {
        table: "user_daily_games",
        purpose: "Partite daily per utente autenticato.",
        readableId: "public_id",
        keyFields: "user_id, game_date, status, guess_count, started_at, finished_at",
      },
      {
        table: "game_attempts",
        purpose: "Tentativi giornalieri legati alla partita daily.",
        readableId: "public_id",
        keyFields: "user_id, game_date, user_daily_game_id, guess_index, is_correct",
      },
      {
        table: "analytics_events",
        purpose: "Eventi prodotto e gameplay lato backend.",
        readableId: "public_id",
        keyFields: "user_id, session_id, event_name, payload",
      },
    ],
    warnings,
  };
}
