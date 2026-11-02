import { maskConfig, resolve, MASKED, SENSITIVE_FIELDS } from "@/lib/site-config-shared";

describe("maskConfig", () => {
  it("replaces every populated sensitive field with the masked sentinel", () => {
    const cfg = Object.fromEntries(SENSITIVE_FIELDS.map((f) => [f, "super-secret"]));
    const masked = maskConfig(cfg);
    for (const field of SENSITIVE_FIELDS) {
      expect(masked[field as string]).toBe(MASKED);
    }
  });

  it("never leaks a raw secret value to the client", () => {
    const masked = maskConfig({ groqApiKey: "gsk_live_abc123", razorpayKeySecret: "rzp_secret" });
    expect(JSON.stringify(masked)).not.toContain("gsk_live_abc123");
    expect(JSON.stringify(masked)).not.toContain("rzp_secret");
  });

  it("emits an empty string (not the sentinel) for unset secrets", () => {
    expect(maskConfig({ groqApiKey: "" }).groqApiKey).toBe("");
    expect(maskConfig({}).groqApiKey).toBe("");
  });

  it("passes non-sensitive fields through untouched", () => {
    const masked = maskConfig({ siteName: "Setups Works", groqApiKey: "x" });
    expect(masked.siteName).toBe("Setups Works");
  });
});

describe("resolve", () => {
  it("prefers a non-empty DB value over the env fallback", () => {
    expect(resolve("db-value", "env-value")).toBe("db-value");
  });

  it("trims the DB value", () => {
    expect(resolve("  db  ", "env")).toBe("db");
  });

  it("falls back to env when the DB value is empty or whitespace", () => {
    expect(resolve("", "env-value")).toBe("env-value");
    expect(resolve("   ", "env-value")).toBe("env-value");
    expect(resolve(undefined, "env-value")).toBe("env-value");
  });

  it("returns an empty string when neither is set", () => {
    expect(resolve(undefined, undefined)).toBe("");
  });
});
