export default function Loading() {
  return (
    <main className="route-loading" aria-live="polite" aria-label="Loading page">
      <div className="route-loading__spinner" aria-hidden="true" />
      <p className="route-loading__label">Loading...</p>
    </main>
  );
}
