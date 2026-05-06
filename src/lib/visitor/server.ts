export function normalizeConstructedId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 160) return null;
  return cleaned;
}

export function isConstructedVisitorId(value: string): boolean {
  return /^[A-Z]{2}-\d{8}-\d{5}$/.test(value);
}

export function readCountryCode(headers: Headers): string {
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("cloudfront-viewer-country"),
    headers.get("x-country-code"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const cleaned = candidate.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cleaned)) {
      return cleaned;
    }
  }

  return "ZZ";
}
