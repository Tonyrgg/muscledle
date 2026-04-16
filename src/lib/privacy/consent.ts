export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentChoice = {
  policyVersion: string;
  decidedAt: string;
  preferences: ConsentPreferences;
};

export const CONSENT_STORAGE_KEY = "liftdle_consent_choice";
export const CONSENT_VISITOR_ID_KEY = "liftdle_visitor_id";
export const CONSENT_POLICY_VERSION = "2026-04-16";

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function isConsentPreferences(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ConsentPreferences>;

  return (
    candidate.necessary === true &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.marketing === "boolean"
  );
}

export function toConsentChoice(value: unknown): ConsentChoice | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ConsentChoice>;
  if (
    typeof candidate.policyVersion !== "string" ||
    typeof candidate.decidedAt !== "string" ||
    !isConsentPreferences(candidate.preferences)
  ) {
    return null;
  }

  return {
    policyVersion: candidate.policyVersion,
    decidedAt: candidate.decidedAt,
    preferences: candidate.preferences,
  };
}
