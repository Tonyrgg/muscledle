import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Liftdle Cookie Notice",
  description: "Cookie categories and preference controls for Liftdle.",
};

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__shell">
        <h1 className="legal-page__title">Cookie Notice</h1>
        <p className="legal-page__line">Last updated: April 16, 2026</p>

        <h2>Categories</h2>
        <p><strong>Necessary:</strong> required for authentication, security, and core gameplay. Always active.</p>
        <p><strong>Analytics:</strong> optional measurement used to improve product performance and user experience.</p>

        <h2>How To Manage Preferences</h2>
        <p>You can accept, refuse, or update analytics consent from Cookie settings at any time.</p>
        <p>Changing preferences affects future analytics collection and storage behavior.</p>

        <h2>Retention</h2>
        <p>Consent choices are stored with timestamp and policy version for compliance and audit purposes.</p>

        <p className="legal-page__line">
          See also the <Link href="/privacy">Privacy notice</Link>.
        </p>
      </section>
    </main>
  );
}
