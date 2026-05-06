import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getRetentionDashboardData } from "@/lib/ops/retention-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liftdle Hidden Pulse Room",
  description: "Private operational dashboard for visitor retention, feedback, and daily activity.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatUserId(value: string | null): string {
  if (!value) return "guest";
  return `${value.slice(0, 8)}…`;
}

function compactText(value: string | null, max = 120): string {
  if (!value) return "—";
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}…`;
}

function TableSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 26, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</h2>
        {subtitle ? (
          <p style={{ margin: "6px 0 0", color: "#9fb0bf", maxWidth: 920 }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #24303d", borderRadius: 18, background: "#101820" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
        <thead>
          <tr style={{ background: "#16232f" }}>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #24303d",
                  color: "#dce7ef",
                  textAlign: "left",
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #1d2a36" }}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: "12px 14px", color: "#edf3f7", verticalAlign: "top", fontSize: 14 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, tone = "#7dd3fc" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div
      style={{
        border: "1px solid #24303d",
        borderRadius: 18,
        padding: 18,
        background: "linear-gradient(180deg, #13212d 0%, #0f161d 100%)",
      }}
    >
      <div style={{ color: "#9fb0bf", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: 8, color: tone, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default async function HiddenPulseRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const incomingKey = Array.isArray(params.key) ? params.key[0] : params.key;
  const expectedKey =
    process.env.HIDDEN_RETENTION_DASHBOARD_TOKEN?.trim() ||
    process.env.ADMIN_SYNC_TOKEN?.trim() ||
    "";

  if (!expectedKey || incomingKey?.trim() !== expectedKey) {
    notFound();
  }

  const data = await getRetentionDashboardData();
  const totalNewVisitors = data.dailyAudience.reduce((sum, row) => sum + row.newVisitors, 0);
  const totalReturningVisitors = data.dailyAudience.reduce((sum, row) => sum + row.returningVisitors, 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(42,78,104,0.28), transparent 36%), linear-gradient(180deg, #091016 0%, #0d1318 100%)",
        color: "#edf3f7",
      }}
    >
      <section style={{ width: "min(1480px, calc(100vw - 32px))", margin: "0 auto", padding: "32px 0 80px", display: "grid", gap: 28 }}>
        <header
          style={{
            display: "grid",
            gap: 14,
            border: "1px solid #24303d",
            borderRadius: 24,
            padding: 24,
            background: "linear-gradient(135deg, rgba(21,35,47,0.94), rgba(10,16,22,0.96))",
          }}
        >
          <Logo className="archive-hero__logo" />
          <p style={{ margin: 0, color: "#8fd3b6", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>
            Hidden Backoffice
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(34px, 5vw, 62px)", textTransform: "uppercase", lineHeight: 0.94 }}>
            Pulse Room
          </h1>
          <p style={{ margin: 0, color: "#b7c6d2", maxWidth: 920 }}>
            Vista privata e non indicizzata sui dati che stai conservando in Supabase, con focus su visitatori nuovi/di ritorno, feedback e attività daily.
          </p>
          <p style={{ margin: 0, color: "#7f93a3", fontSize: 13 }}>
            Generata il {formatDateTime(data.generatedAt)}. Accesso protetto da token via querystring.
          </p>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <StatCard label="Visitatori caricati" value={data.totals.visitors} />
          <StatCard label="Sessioni caricate" value={data.totals.visitorSessions} tone="#facc15" />
          <StatCard label="Page visits caricate" value={data.totals.pageVisits} tone="#c4b5fd" />
          <StatCard label="Feedback caricati" value={data.totals.feedbackReports} tone="#fda4af" />
          <StatCard label="Nuovi utenti 30g" value={totalNewVisitors} tone="#86efac" />
          <StatCard label="Returning 30g" value={totalReturningVisitors} tone="#fb923c" />
        </section>

        {data.warnings.length > 0 ? (
          <section style={{ border: "1px solid #6b2d2d", borderRadius: 18, background: "#2a1313", padding: 18, display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Warning di lettura</h2>
            {data.warnings.map((warning) => (
              <p key={warning} style={{ margin: 0, color: "#fecaca" }}>{warning}</p>
            ))}
          </section>
        ) : null}

        <TableSection
          title="Mappa Conservazione"
          subtitle="Questa tabella riassume quali dataset leggibili stai mantenendo e a cosa servono."
        >
          <DataTable
            headers={["Tabella", "Scopo", "ID leggibile", "Campi chiave"]}
            rows={data.storageMap.map((row) => [row.table, row.purpose, row.readableId, row.keyFields])}
          />
        </TableSection>

        <TableSection
          title="Utenti Giornalieri"
          subtitle="Aggregazione delle sessioni per giorno: visitatori unici, nuovi, di ritorno, signed-in, sessioni e page views."
        >
          <DataTable
            headers={["Data", "Visitatori unici", "Nuovi", "Di ritorno", "Signed-in", "Sessioni", "Page views", "Paesi top"]}
            rows={data.dailyAudience.map((row) => [
              row.date,
              row.uniqueVisitors,
              row.newVisitors,
              row.returningVisitors,
              row.signedInVisitors,
              row.sessions,
              row.pageViews,
              row.topCountries || "—",
            ])}
          />
        </TableSection>

        <TableSection
          title="Visitatori"
          subtitle="Anagrafica leggibile del visitatore. Qui capisci bene chi è nuovo e chi è già tornato almeno una volta."
        >
          <DataTable
            headers={["Visitor ID", "Tipo", "First landing", "Paese iniziale", "Ultimo paese", "User", "Sessioni", "Page views", "First path", "Last path", "First seen", "Last seen"]}
            rows={data.visitors.map((row) => [
              row.publicId,
              row.visitorType,
              row.firstLandingDate,
              row.firstCountry,
              row.lastCountry,
              formatUserId(row.linkedUserId),
              row.sessions,
              row.pageViews,
              row.firstPath ?? "—",
              row.lastPath ?? "—",
              formatDateTime(row.firstSeenAt),
              formatDateTime(row.lastSeenAt),
            ])}
          />
        </TableSection>

        <TableSection
          title="Sessioni"
          subtitle="Ogni sessione ha un ID leggibile e mostra entry path, ultimo path e page views della sessione."
        >
          <DataTable
            headers={["Session ID", "Visitor ID", "Start", "Last seen", "Paese", "Landing path", "Last path", "Page views", "Prima sessione?"]}
            rows={data.sessions.map((row) => [
              row.publicId,
              row.visitorPublicId,
              formatDateTime(row.startedAt),
              formatDateTime(row.lastSeenAt),
              row.countryCode,
              row.landingPath ?? "—",
              row.lastPath ?? "—",
              row.pageViews,
              row.isFirstSession ? "yes" : "no",
            ])}
          />
        </TableSection>

        <TableSection
          title="Feedback"
          subtitle="Focus principale: feedback recenti con categoria, impatto, severità, pagina d’origine e peso di triage. La descrizione è troncata per leggibilità."
        >
          <DataTable
            headers={["Feedback ID", "Quando", "Status", "Categoria", "Modulo", "Severity", "Impact", "Triage", "Visitor ID", "User", "Pagina", "Game mode", "Allegati", "Titolo", "Descrizione"]}
            rows={data.feedbackReports.map((row) => [
              row.publicId,
              formatDateTime(row.createdAt),
              row.status,
              row.category,
              row.module ?? "—",
              row.severity ?? "—",
              row.impact ?? "—",
              row.triageScore,
              row.visitorId,
              formatUserId(row.reporterUserId),
              row.pagePath ?? "—",
              row.gameMode ?? "—",
              row.attachmentCount,
              compactText(row.title, 60),
              compactText(row.description, 140),
            ])}
          />
        </TableSection>

        <TableSection
          title="Feedback Per Giorno"
          subtitle="Vista aggregata utile per vedere se aumentano bug, feedback UX o richieste feature."
        >
          <DataTable
            headers={["Data", "Totale", "Bug", "UX", "Feature", "Data/Content"]}
            rows={data.feedbackByDay.map((row) => [
              row.date,
              row.reports,
              row.bug,
              row.ux,
              row.feature,
              row.data,
            ])}
          />
        </TableSection>

        <TableSection
          title="Partite Daily"
          subtitle="Stato delle partite daily persistite per gli utenti autenticati."
        >
          <DataTable
            headers={["Game ID", "User", "Game date", "Status", "Guess count", "Started", "Finished"]}
            rows={data.dailyGames.map((row) => [
              row.public_id,
              formatUserId(row.user_id),
              row.game_date,
              row.status,
              row.guess_count,
              formatDateTime(row.started_at),
              formatDateTime(row.finished_at),
            ])}
          />
        </TableSection>

        <TableSection
          title="Tentativi Daily"
          subtitle="Tentativi recenti associati alle daily game rows."
        >
          <DataTable
            headers={["Attempt ID", "User", "Game date", "Daily game uuid", "Guess index", "Correct?", "Created"]}
            rows={data.attempts.map((row) => [
              row.public_id,
              formatUserId(row.user_id),
              row.game_date,
              formatUserId(row.user_daily_game_id),
              row.guess_index,
              row.is_correct ? "yes" : "no",
              formatDateTime(row.created_at),
            ])}
          />
        </TableSection>

        <TableSection
          title="Consenso Privacy"
          subtitle="Storico delle scelte cookie/analytics lato privacy."
        >
          <DataTable
            headers={["Consent ID", "Created", "Visitor", "User", "Source", "Action", "Analytics", "Marketing", "Policy"]}
            rows={data.consentEvents.map((row) => [
              row.public_id,
              formatDateTime(row.created_at),
              row.visitor_id ?? "—",
              formatUserId(row.user_id),
              row.source,
              row.action,
              row.analytics ? "on" : "off",
              row.marketing ? "on" : "off",
              row.policy_version,
            ])}
          />
        </TableSection>

        <TableSection
          title="Eventi Analytics"
          subtitle="Log applicativi recenti per capire quali eventi vengono salvati lato backend."
        >
          <DataTable
            headers={["Event ID", "Created", "Event", "User", "Session", "Payload"]}
            rows={data.analyticsEvents.map((row) => [
              row.public_id,
              formatDateTime(row.created_at),
              row.event_name,
              formatUserId(row.user_id),
              row.session_id ?? "—",
              compactText(JSON.stringify(row.payload ?? {}), 160),
            ])}
          />
        </TableSection>

        <TableSection
          title="Pagine Visitate"
          subtitle="Ultime page visits con path, referrer e marker di entry."
        >
          <DataTable
            headers={["Visit ID", "Visitor ID", "Session ID", "Visited", "Path", "Referrer", "Paese", "Entry?"]}
            rows={data.recentPageVisits.map((row) => [
              row.publicId,
              row.visitorPublicId,
              row.sessionPublicId,
              formatDateTime(row.visitedAt),
              row.path ?? "—",
              compactText(row.referrer, 80),
              row.countryCode,
              row.isEntry ? "yes" : "no",
            ])}
          />
        </TableSection>
      </section>
    </main>
  );
}
