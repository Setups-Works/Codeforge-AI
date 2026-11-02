import type { NextRequest } from "next/server";

/**
 * Passkey (WebAuthn) config + helpers. Credentials are stored in Supabase
 * (`webauthn_credentials`); a verified assertion is bridged into a real
 * Supabase session in the authenticate/verify route.
 */

export const RP_NAME = "Setups Works Lab";

/** The single-use challenge is stashed in a short-lived httpOnly cookie. */
export const CHALLENGE_COOKIE = "pk_challenge";
export const CHALLENGE_MAX_AGE = 300; // seconds

/**
 * Derive the Relying Party ID + origin from the request so passkeys work on
 * prod, previews and localhost without hardcoding. rpID must be the hostname.
 */
export function rpFromRequest(req: NextRequest): { rpID: string; origin: string } {
  const raw =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://labs.setups.works";
  const u = new URL(raw);
  return { rpID: u.hostname, origin: `${u.protocol}//${u.host}` };
}

/** Uint8Array (COSE public key) → base64url text for storage. */
export function toB64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/** base64url text → Uint8Array (fresh ArrayBuffer-backed, for verification). */
export function fromB64Url(text: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(text, "base64url");
  const out = new Uint8Array(new ArrayBuffer(buf.byteLength));
  out.set(buf);
  return out;
}

/** httpOnly cookie options for the challenge. */
export function challengeCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
