import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Liftdle Privacy Notice",
  description: "Privacy notice for Liftdle gameplay and services.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__shell">
        <h1 className="legal-page__title">Privacy Notice</h1>
        <p className="legal-page__line">Last updated: April 16, 2026</p>

        <h2>Controller</h2>
        <p>Liftdle project team</p>
        <p>Contact: support@liftdle.app</p>

        <h2>Data We Process</h2>
        <p>Gameplay data such as guesses, feedback, progress, and aggregated statistics.</p>
        <p>Authentication/session information managed through Supabase, including anonymous sessions.</p>
        <p>Operational telemetry related to service reliability and security.</p>

        <h2>Why We Process Data</h2>
        <p>To provide and secure gameplay features and user sessions.</p>
        <p>To detect abuse and maintain platform integrity.</p>
        <p>To improve product quality through analytics, only when consent is granted.</p>

        <h2>Third Parties</h2>
        <p>Supabase for authentication and database services.</p>
        <p>Vercel for hosting and analytics infrastructure.</p>

        <h2>Your Rights</h2>
        <p>You may request access, correction, deletion, and restriction or objection where applicable.</p>
        <p>You can update analytics preferences anytime from Cookie settings in the app.</p>

        <p className="legal-page__line">
          See also the <Link href="/cookies">Cookie notice</Link>.
        </p>
      </section>
    </main>
  );
}
