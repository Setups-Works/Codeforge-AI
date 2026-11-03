/**
 * Master switch for the LMS. `NEXT_PUBLIC_` so the same check works in server
 * code, client components (nav) and the middleware; the value is inlined at
 * build time, so flipping it needs a redeploy. Off by default.
 */
export function lmsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LMS_ENABLED === "true";
}
