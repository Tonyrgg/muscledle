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
  if (!value) return "-";
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
  return `${value.slice(0, 8)}...`;
}

function compactText(value: string | null, max = 120): string {
  if (!value) return "-";
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 3)}...`;
}

function percentage(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 24, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h2>
        {subtitle ? (
          <p style={{ margin: 0, color: "#98aab8", maxWidth: 920, lineHeight: 1.5 }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #24303d",
        borderRadius: 20,
        background: "linear-gradient(180deg, rgba(19,33,45,0.96), rgba(11,17,23,0.98))",
        boxShadow: "0 18px 46px rgba(0,0,0,0.22)",
      }}
    >
      {children}
    </div>
  );
}

function DataTable({
  headers,
  rows,
  compact = false,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  compact?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr style={{ background: "#17232e" }}>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  padding: compact ? "10px 12px" : "12px 14px",
                  borderBottom: "1px solid #24303d",
                  color: "#d6e2ea",
                  textAlign: "left",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: "1px solid #1d2a36" }}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    padding: compact ? "10px 12px" : "12px 14px",
                    color: "#edf3f7",
                    verticalAlign: "top",
                    fontSize: compact ? 13 : 14,
                    lineHeight: 1.45,
                  }}
                >
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

function StatCard({
  label,
  value,
  note,
  tone = "#7dd3fc",
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #24303d",
        borderRadius: 18,
        padding: 18,
        background: "linear-gradient(180deg, #13212d 0%, #0f161d 100%)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ color: "#90a2b2", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div style={{ color: tone, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {note ? <div style={{ color: "#b8c7d3", fontSize: 13, lineHeight: 1.4 }}>{note}</div> : null}
    </div>
  );
}

function MiniCard({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #24303d",
        borderRadius: 18,
        padding: 18,
        background: "rgba(13, 19, 26, 0.88)",
        display: "grid",
        gap: 8,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, textTransform: "uppercase", letterSpacing: "0.06em", color: "#f2f6f8" }}>
        {title}
      </h3>
      <div style={{ color: "#aebdc9", lineHeight: 1.5, fontSize: 14 }}>{body}</div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "neutral" | "green" | "orange" | "red" | "blue";
  children: React.ReactNode;
}) {
  const colorMap = {
    neutral: { border: "#33404b", bg: "#172028", fg: "#d8e0e6" },
    green: { border: "#2f6c50", bg: "rgba(34,92,64,0.25)", fg: "#9ee2bc" },
    orange: { border: "#8a5a2a", bg: "rgba(138,90,42,0.24)", fg: "#ffc28e" },
    red: { border: "#7b3f3f", bg: "rgba(123,63,63,0.22)", fg: "#ffb0b0" },
    blue: { border: "#2f597c", bg: "rgba(47,89,124,0.22)", fg: "#9dd3ff" },
  } as const;

  const palette = colorMap[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.fg,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function RawBlock({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      style={{
        border: "1px solid #24303d",
        borderRadius: 18,
        background: "rgba(12, 18, 24, 0.92)",
        padding: "0 16px 16px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "16px 0",
          fontWeight: 800,
          color: "#edf3f7",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
        <span style={{ display: "block", marginTop: 6, color: "#97a9b7", fontSize: 13, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
          {subtitle}
        </span>
      </summary>
      {children}
    </details>
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
  const latestAudience = data.dailyAudience[0] ?? null;
  const latestFeedbackDay = data.feedbackByDay[0] ?? null;
  const openFeedback = data.feedbackReports.filter((row) => row.status === "open").length;
  const bugFeedback = data.feedbackReports.filter((row) => row.category === "bug").length;
  const dataFeedback = data.feedbackReports.filter((row) => row.category === "data").length;
  const signedInVisitors = data.visitors.filter((row) => row.linkedUserId).length;
  const returningVisitors = data.visitors.filter((row) => row.visitorType === "returning").length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(49, 87, 116, 0.24), transparent 34%), linear-gradient(180deg, #091016 0%, #0d1318 100%)",
        color: "#edf3f7",
      }}
    >
      <section
        style={{
          width: "min(1500px, calc(100vw - 32px))",
          margin: "0 auto",
          padding: "28px 0 80px",
          display: "grid",
          gap: 28,
        }}
      >
        <Surface>
          <header style={{ padding: 24, display: "grid", gap: 14 }}>
            <Logo className="archive-hero__logo" />
            <p style={{ margin: 0, color: "#89d3b4", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>
              Hidden Backoffice
            </p>
            <h1 style={{ margin: 0, fontSize: "clamp(34px, 5vw, 62px)", textTransform: "uppercase", lineHeight: 0.94 }}>
              Pulse Room
            </h1>
            <p style={{ margin: 0, color: "#b9c7d2", maxWidth: 980, lineHeight: 1.55 }}>
              Questa pagina serve a capire tre cose in pochi secondi: quanti visitatori arrivano ogni giorno,
              quanti tornano, e quali feedback stiamo raccogliendo. Le tabelle tecniche complete restano sotto,
              ma la lettura principale parte da qui.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Pill tone="blue">Generata {formatDateTime(data.generatedAt)}</Pill>
              <Pill tone="neutral">Token protetto</Pill>
              <Pill tone="orange">Focus: retention + feedback</Pill>
            </div>
          </header>
        </Surface>

        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {[
            ["overview", "Overview"],
            ["audience", "Utenti giornalieri"],
            ["feedback", "Feedback"],
            ["glossary", "Cosa salviamo"],
            ["raw", "Tabelle tecniche"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              style={{
                border: "1px solid #31414d",
                borderRadius: 999,
                padding: "10px 14px",
                color: "#dbe5eb",
                textDecoration: "none",
                background: "rgba(14,21,28,0.84)",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        <Section
          id="overview"
          title="Overview"
          subtitle="Questi numeri rispondono alla domanda operativa: la pagina sta portando pubblico nuovo, sta riportando gente indietro, e sta generando feedback utile?"
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <StatCard
              label="Visitatori letti"
              value={data.totals.visitors}
              note={`${returningVisitors} returning, ${signedInVisitors} collegati a un account`}
            />
            <StatCard
              label="Sessioni lette"
              value={data.totals.visitorSessions}
              tone="#facc15"
              note={latestAudience ? `${latestAudience.sessions} sessioni nell ultimo giorno letto` : "Nessun dato giornaliero"}
            />
            <StatCard
              label="Feedback letti"
              value={data.totals.feedbackReports}
              tone="#fda4af"
              note={`${openFeedback} aperti, ${bugFeedback} bug, ${dataFeedback} data/content`}
            />
            <StatCard
              label="Daily games lette"
              value={data.totals.dailyGames}
              tone="#86efac"
              note={`${data.totals.attempts} tentativi caricati`}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <MiniCard
              title="Che cosa guardare qui"
              body={
                <>
                  <div>1. Se i nuovi visitatori crescono, acquisizione e discovery stanno funzionando.</div>
                  <div>2. Se i returning restano bassi, il prodotto non sta trattenendo.</div>
                  <div>3. Se i feedback aperti aumentano, bisogna capire se il problema e UX, bug o dati.</div>
                </>
              }
            />
            <MiniCard
              title="Ultimo giorno letto"
              body={
                latestAudience ? (
                  <>
                    <div>{latestAudience.date}</div>
                    <div>{latestAudience.uniqueVisitors} visitatori unici</div>
                    <div>{latestAudience.newVisitors} nuovi, {latestAudience.returningVisitors} di ritorno</div>
                    <div>{latestAudience.pageViews} page views, paesi top: {latestAudience.topCountries || "-"}</div>
                  </>
                ) : (
                  "Ancora nessun aggregato giornaliero disponibile."
                )
              }
            />
            <MiniCard
              title="Ultimo segnale feedback"
              body={
                latestFeedbackDay ? (
                  <>
                    <div>{latestFeedbackDay.date}</div>
                    <div>{latestFeedbackDay.reports} report totali</div>
                    <div>{latestFeedbackDay.bug} bug, {latestFeedbackDay.ux} UX, {latestFeedbackDay.feature} feature, {latestFeedbackDay.data} data</div>
                  </>
                ) : (
                  "Ancora nessun aggregato feedback disponibile."
                )
              }
            />
          </div>
        </Section>

        <Section
          id="audience"
          title="Utenti Giornalieri"
          subtitle="Questa e la tabella piu importante per retention. Ogni riga e un giorno, non un utente."
        >
          <Surface>
            <DataTable
              headers={[
                "Data",
                "Unici",
                "Nuovi",
                "Returning",
                "% Returning",
                "Signed-in",
                "Sessioni",
                "Page views",
                "Paesi top",
              ]}
              rows={data.dailyAudience.map((row) => [
                row.date,
                row.uniqueVisitors,
                row.newVisitors,
                row.returningVisitors,
                percentage(row.returningVisitors, row.uniqueVisitors),
                row.signedInVisitors,
                row.sessions,
                row.pageViews,
                row.topCountries || "-",
              ])}
            />
          </Surface>
        </Section>

        <Section
          id="feedback"
          title="Feedback"
          subtitle="Prima la vista leggibile e utile, poi il dettaglio. Qui conta soprattutto capire tipo di problema, gravita, origine e concentrazione nel tempo."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <MiniCard
              title="Distribuzione"
              body={
                <>
                  <div>Bug: {bugFeedback}</div>
                  <div>UX: {data.feedbackReports.filter((row) => row.category === "ux").length}</div>
                  <div>Feature: {data.feedbackReports.filter((row) => row.category === "feature").length}</div>
                  <div>Data/content: {dataFeedback}</div>
                </>
              }
            />
            <MiniCard
              title="Stato"
              body={
                <>
                  <div>Aperti: {openFeedback}</div>
                  <div>Chiusi: {data.feedbackReports.filter((row) => row.status !== "open").length}</div>
                  <div>Con allegati: {data.feedbackReports.filter((row) => row.attachmentCount > 0).length}</div>
                </>
              }
            />
          </div>

          <Surface>
            <DataTable
              headers={[
                "Quando",
                "Categoria",
                "Stato",
                "Modulo",
                "Gravita",
                "Impatto",
                "Triage",
                "Origine",
                "Titolo",
                "Descrizione",
              ]}
              rows={data.feedbackReports.slice(0, 40).map((row) => [
                formatDateTime(row.createdAt),
                row.category,
                row.status,
                row.module ?? "-",
                row.severity ?? "-",
                row.impact ?? "-",
                row.triageScore,
                `${row.pagePath ?? "-"} / ${row.gameMode ?? "-"}`,
                compactText(row.title, 56),
                compactText(row.description, 150),
              ])}
            />
          </Surface>

          <Surface>
            <DataTable
              headers={["Data", "Totale", "Bug", "UX", "Feature", "Data/content"]}
              rows={data.feedbackByDay.map((row) => [
                row.date,
                row.reports,
                row.bug,
                row.ux,
                row.feature,
                row.data,
              ])}
              compact
            />
          </Surface>
        </Section>

        <Section
          id="glossary"
          title="Cosa Salviamo"
          subtitle="Questa sezione traduce i nomi tabella in linguaggio operativo. Serve per capire quali dati stai davvero conservando."
        >
          <Surface>
            <DataTable
              headers={["Tabella", "A cosa serve", "ID leggibile", "Campi da leggere davvero"]}
              rows={data.storageMap.map((row) => [
                row.table,
                row.purpose,
                row.readableId,
                row.keyFields,
              ])}
            />
          </Surface>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <MiniCard
              title="Nuovo visitatore"
              body="Un visitor e nuovo se la sua prima data di atterraggio coincide con il giorno della sessione letta."
            />
            <MiniCard
              title="Returning"
              body="Un visitor e di ritorno se lo rivediamo in una data successiva o in una sessione non iniziale."
            />
            <MiniCard
              title="Guest vs user"
              body="Guest significa visitatore senza linked user id. Signed-in significa visitor collegato a un account Supabase Auth."
            />
          </div>
        </Section>

        <Section
          id="raw"
          title="Tabelle Tecniche"
          subtitle="Questa parte resta utile per controlli manuali, ma non e la lettura principale. E nascosta in pannelli per evitare rumore."
        >
          <div style={{ display: "grid", gap: 16 }}>
            <RawBlock
              title="Visitatori"
              subtitle="Anagrafica canonica dei visitor id. Utile quando devi controllare first landing, linked user e storico sessioni."
              defaultOpen
            >
              <DataTable
                headers={["Visitor ID", "Tipo", "First landing", "First country", "Last country", "User", "Sessioni", "Views", "First path", "Last path", "First seen", "Last seen"]}
                rows={data.visitors.map((row) => [
                  row.publicId,
                  row.visitorType,
                  row.firstLandingDate,
                  row.firstCountry,
                  row.lastCountry,
                  formatUserId(row.linkedUserId),
                  row.sessions,
                  row.pageViews,
                  row.firstPath ?? "-",
                  row.lastPath ?? "-",
                  formatDateTime(row.firstSeenAt),
                  formatDateTime(row.lastSeenAt),
                ])}
                compact
              />
            </RawBlock>

            <RawBlock
              title="Sessioni"
              subtitle="Ogni sessione di navigazione con entry path, ultimo path e page views."
            >
              <DataTable
                headers={["Session ID", "Visitor ID", "Start", "Last seen", "Paese", "Landing path", "Last path", "Views", "Prima sessione?"]}
                rows={data.sessions.map((row) => [
                  row.publicId,
                  row.visitorPublicId,
                  formatDateTime(row.startedAt),
                  formatDateTime(row.lastSeenAt),
                  row.countryCode,
                  row.landingPath ?? "-",
                  row.lastPath ?? "-",
                  row.pageViews,
                  row.isFirstSession ? "yes" : "no",
                ])}
                compact
              />
            </RawBlock>

            <RawBlock
              title="Page Visits"
              subtitle="Ultime pagine visitate, con referrer e marker di ingresso."
            >
              <DataTable
                headers={["Visit ID", "Visitor ID", "Session ID", "Visited", "Path", "Referrer", "Paese", "Entry?"]}
                rows={data.recentPageVisits.map((row) => [
                  row.publicId,
                  row.visitorPublicId,
                  row.sessionPublicId,
                  formatDateTime(row.visitedAt),
                  row.path ?? "-",
                  compactText(row.referrer, 80),
                  row.countryCode,
                  row.isEntry ? "yes" : "no",
                ])}
                compact
              />
            </RawBlock>

            <RawBlock
              title="Daily Games e Tentativi"
              subtitle="Persistenza delle daily partite e dei relativi attempt."
            >
              <div style={{ display: "grid", gap: 16 }}>
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
                  compact
                />
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
                  compact
                />
              </div>
            </RawBlock>

            <RawBlock
              title="Privacy e Analytics"
              subtitle="Storico consenso privacy e log applicativi backend."
            >
              <div style={{ display: "grid", gap: 16 }}>
                <DataTable
                  headers={["Consent ID", "Created", "Visitor", "User", "Source", "Action", "Analytics", "Marketing", "Policy"]}
                  rows={data.consentEvents.map((row) => [
                    row.public_id,
                    formatDateTime(row.created_at),
                    row.visitor_id ?? "-",
                    formatUserId(row.user_id),
                    row.source,
                    row.action,
                    row.analytics ? "on" : "off",
                    row.marketing ? "on" : "off",
                    row.policy_version,
                  ])}
                  compact
                />
                <DataTable
                  headers={["Event ID", "Created", "Event", "User", "Session", "Payload"]}
                  rows={data.analyticsEvents.map((row) => [
                    row.public_id,
                    formatDateTime(row.created_at),
                    row.event_name,
                    formatUserId(row.user_id),
                    row.session_id ?? "-",
                    compactText(JSON.stringify(row.payload ?? {}), 160),
                  ])}
                  compact
                />
              </div>
            </RawBlock>
          </div>
        </Section>

        {data.warnings.length > 0 ? (
          <section
            style={{
              border: "1px solid #6b2d2d",
              borderRadius: 18,
              background: "#2a1313",
              padding: 18,
              display: "grid",
              gap: 8,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Warning di lettura
            </h2>
            {data.warnings.map((warning) => (
              <p key={warning} style={{ margin: 0, color: "#fecaca", lineHeight: 1.45 }}>
                {warning}
              </p>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
