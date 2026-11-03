import { randomBytes } from "node:crypto";

// No 0/O/1/I so a code can be read aloud or typed without ambiguity.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A verifiable certificate code like "SW-7K2M-9QXD-4TNB". */
export function generateCertificateCode(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `SW-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const CODE_RE = /^SW-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Normalise user input (case, spaces) and check the shape. Returns null if invalid. */
export function normalizeCertificateCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}
