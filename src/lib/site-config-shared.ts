import type { SiteConfigDoc } from "@/types/db";

/**
 * Pure, dependency-free site-config helpers and constants — no `next/cache` or
 * database imports, so they are safe to unit-test and import from anywhere.
 * The cached DB reader (`getSiteConfig`, `getEffectiveConfig`) lives in
 * `@/lib/site-config`, which re-exports everything here.
 */

export const SITE_CONFIG_TAG = "site-config";
export const MASKED = "__MASKED__";

/** Config fields that must never be sent to the client in cleartext. */
export const SENSITIVE_FIELDS: (keyof SiteConfigDoc)[] = [
  "smtpPass",
  "groqApiKey",
  "googleClientSecret",
  "githubClientSecret",
  "razorpayKeySecret",
  "redisToken",
  "judge0ApiKey",
  "paizaApiKey",
];

/**
 * Resolve a config value: a non-empty DB value takes priority over the env
 * fallback. Both sides are trimmed.
 *
 * @param dbVal - Value stored in the DB (may be undefined/blank).
 * @param envVal - Environment fallback.
 * @returns The resolved value, or `""` when neither is set.
 */
export function resolve(dbVal: string | undefined, envVal: string | undefined): string {
  return dbVal && dbVal.trim() ? dbVal.trim() : (envVal ?? "");
}

/**
 * Mask sensitive fields before sending config to the client. Populated secrets
 * become the {@link MASKED} sentinel; unset ones become `""`. Non-sensitive
 * fields pass through untouched.
 *
 * @param cfg - The raw (partial) site config.
 * @returns A shallow copy safe to serialize to the client.
 */
export function maskConfig(cfg: Partial<SiteConfigDoc>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...cfg };
  for (const field of SENSITIVE_FIELDS) {
    const val = cfg[field] as string | undefined;
    out[field as string] = val ? MASKED : "";
  }
  return out;
}
