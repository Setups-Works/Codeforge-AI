import { openApiSpec } from "@/lib/openapi";

const METHODS = ["get", "post", "put", "patch", "delete"];

describe("OpenAPI spec", () => {
  const paths = openApiSpec.paths as Record<string, Record<string, any>>;
  const tags = new Set((openApiSpec.tags as { name: string }[]).map((t) => t.name));

  it("is JSON-serialisable", () => {
    expect(() => JSON.stringify(openApiSpec)).not.toThrow();
  });

  it("documents the LMS endpoints", () => {
    for (const p of ["/learn/progress", "/learn/quiz", "/learn/courses/{id}/checkout", "/learn/courses/{id}/verify", "/admin/courses", "/admin/orders/{id}/refund", "/admin/analytics", "/admin/bundles/{id}", "/billing/course-invoice/{id}"]) {
      expect(paths[p]).toBeDefined();
    }
  });

  it("gives every operation a known tag, a summary and responses", () => {
    for (const [path, item] of Object.entries(paths)) {
      for (const method of METHODS.filter((m) => item[m])) {
        const op = item[method];
        expect([path, method, op.summary]).toEqual([path, method, expect.any(String)]);
        expect(op.responses).toBeDefined();
        for (const t of op.tags) expect(tags.has(t)).toBe(true);
      }
    }
  });

  it("declares every path parameter that appears in a templated path", () => {
    for (const [path, item] of Object.entries(paths)) {
      const names = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (!names.length) continue;
      for (const method of METHODS.filter((m) => item[m])) {
        const declared = new Set(((item[method].parameters ?? []) as { in: string; name: string }[]).filter((p) => p.in === "path").map((p) => p.name));
        // Older routes may declare shared params at path level
        const shared = new Set(((item.parameters ?? []) as { in: string; name: string }[]).map((p) => p.name));
        for (const n of names) expect(declared.has(n) || shared.has(n)).toBe(true);
      }
    }
  });
});
