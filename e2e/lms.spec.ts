import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

/**
 * Public LMS flows against a real database: a published course is seeded
 * through the Supabase REST API, exercised from the browser as an anonymous
 * visitor, and removed afterwards. Signed-in flows (checkout, player, quizzes)
 * need credentials and are covered by the service-level tests instead.
 */

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  try {
    const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).replace(/^"|"$/g, "") : "";
  } catch {
    return "";
  }
}

const URL_ = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const DRIVE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

test.skip(!URL_ || !KEY, "Supabase credentials are required to seed course data");

// One worker runs the whole file in order, so the course is seeded once.
test.describe.configure({ mode: "serial" });

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const run = randomUUID().slice(0, 8);
const live = { slug: `e2e-live-${run}`, title: `E2E Live Course ${run}`, id: "" };
const draft = { slug: `e2e-draft-${run}`, title: `E2E Draft Course ${run}`, id: "" };
const second = { slug: `e2e-second-${run}`, title: `E2E Second Course ${run}`, id: "" };
const bundle = { slug: `e2e-bundle-${run}`, title: `E2E Bundle ${run}`, id: "" };

test.beforeAll(async () => {
  for (const c of [live, draft, second]) {
    const [course] = await rest("courses", {
      method: "POST",
      body: JSON.stringify({
        slug: c.slug,
        title: c.title,
        subtitle: "End-to-end test course",
        description: "About **this** course",
        category: "E2E",
        level: "Beginner",
        price_inr: 499,
        compare_at_inr: 999,
        status: c === draft ? "draft" : "published",
        published_at: c === draft ? null : new Date().toISOString(),
        outcomes: ["Learn the thing"],
        instructor_name: "Eddie Tester",
      }),
    });
    c.id = course.id;
    const [section] = await rest("course_sections", { method: "POST", body: JSON.stringify({ course_id: c.id, title: "Getting started", position: 0 }) });
    await rest("course_lessons", {
      method: "POST",
      body: JSON.stringify([
        { course_id: c.id, section_id: section.id, title: "Free intro lesson", position: 0, kind: "video", video: { provider: "drive", ref: DRIVE_ID }, duration_s: 300, is_free_preview: true },
        { course_id: c.id, section_id: section.id, title: "Paid deep dive", position: 1, kind: "video", video: { provider: "drive", ref: DRIVE_ID }, duration_s: 600, is_free_preview: false },
      ]),
    });
  }
});

test.beforeAll(async () => {
  const [b] = await rest("course_bundles", {
    method: "POST",
    body: JSON.stringify({ slug: bundle.slug, title: bundle.title, description: "Two courses together", price_inr: 599, status: "published" }),
  });
  bundle.id = b.id;
  await rest("course_bundle_items", { method: "POST", body: JSON.stringify([{ bundle_id: b.id, course_id: live.id, position: 0 }, { bundle_id: b.id, course_id: second.id, position: 1 }]) });
});

test.afterAll(async () => {
  if (bundle.id) await rest(`course_bundles?id=eq.${bundle.id}`, { method: "DELETE" }).catch(() => {});
  for (const c of [live, draft, second]) if (c.id) await rest(`courses?id=eq.${c.id}`, { method: "DELETE" }).catch(() => {});
});

test.describe("public course catalogue", () => {
  test("lists a published course and hides drafts", async ({ page }) => {
    await page.goto(`/courses?q=${encodeURIComponent(`E2E Live Course ${run}`)}`);
    await expect(page.getByRole("heading", { name: /online coding courses/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(live.title) })).toBeVisible();

    await page.goto(`/courses?q=${encodeURIComponent(draft.title)}`);
    await expect(page.locator("p:visible", { hasText: /no courses match/i })).toHaveCount(1);
  });

  test("search with no matches shows the empty state", async ({ page }) => {
    await page.goto("/courses?q=zzzz-nothing-matches-this");
    await expect(page.locator("p:visible", { hasText: /no courses match your filters/i })).toHaveCount(1);
  });
});

test.describe("public course page", () => {
  test("shows the curriculum, price and a sign-in call to action", async ({ page }) => {
    await page.goto(`/courses/${live.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: live.title })).toBeVisible();
    await expect(page.getByText("Getting started")).toBeVisible();
    await expect(page.getByText("Free intro lesson")).toBeVisible();
    await expect(page.getByText("Paid deep dive")).toBeVisible();
    await expect(page.getByText("Learn the thing")).toBeVisible();
    await expect(page.getByText("Eddie Tester").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in to buy/i })).toBeVisible();
    await expect(page.getByText(/refund policy/i)).toBeVisible();
  });

  test("ships Course structured data and never leaks the video id", async ({ page }) => {
    const response = await page.goto(`/courses/${live.slug}`);
    const html = await response!.text();
    expect(html).not.toContain(DRIVE_ID);
    expect(html).not.toContain("drive.google.com");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const graphs = blocks.map((b) => JSON.parse(b)["@graph"] as { "@type": string | string[] }[]).flat();
    const course = graphs.find((n) => n["@type"] === "Course") as {
      name: string;
      offers: Record<string, string>;
      syllabusSections: { description: string }[];
    };
    expect(course.name).toBe(live.title);
    expect(course.offers).toMatchObject({ price: "499", priceCurrency: "INR" });
    expect((course as unknown as Record<string, unknown>).educationalCredentialAwarded).toBe("Certificate of completion");
    expect(course.syllabusSections[0].description).toContain("Free intro lesson");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/courses/${live.slug}$`));
  });

  test("the sign-in button returns you to the in-app course page", async ({ page }) => {
    await page.goto(`/courses/${live.slug}`);
    await page.getByRole("link", { name: /sign in to buy/i }).click();
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get("callbackUrl") ?? "")).toBe(`/learn/courses/${live.slug}`);
  });

  test("a draft course is not publicly viewable", async ({ page }) => {
    await page.goto(`/courses/${draft.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: draft.title })).toHaveCount(0);
  });
});

test.describe("access control", () => {
  test("learn pages send anonymous visitors to sign in", async ({ page }) => {
    for (const path of ["/learn", "/learn/courses", `/learn/courses/${live.slug}`, "/learn/my-courses", "/learn/certificates"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("learner and admin APIs reject anonymous requests", async ({ request }) => {
    const id = randomUUID();
    for (const [method, path] of [
      ["post", "/api/learn/progress"],
      ["post", "/api/learn/quiz"],
      ["post", `/api/learn/courses/${id}/checkout`],
      ["get", "/api/admin/courses"],
      ["get", "/api/admin/orders"],
      ["post", `/api/admin/orders/${id}/refund`],
      ["get", "/api/admin/analytics"],
    ] as const) {
      const res = await request[method](path, method === "post" ? { data: {} } : {});
      expect(res.status(), `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });
});

test.describe("growth links", () => {
  test("an invite link remembers the referral and lands on the catalogue", async ({ page, context }) => {
    await page.goto("/invite/K7M2QX9D");
    await expect(page).toHaveURL(/\/courses$/);
    const cookie = (await context.cookies()).find((c) => c.name === "sw_ref");
    expect(cookie?.value).toBe("K7M2QX9D");
    expect(cookie?.httpOnly).toBe(true);
  });

  test("a malformed invite code sets no cookie", async ({ page, context }) => {
    await page.goto("/invite/not-a-code");
    expect((await context.cookies()).find((c) => c.name === "sw_ref")).toBeUndefined();
  });

  test("unknown certificate codes are not found and not indexable", async ({ page }) => {
    await page.goto("/certificate/SW-AAAA-BBBB-CCCC");
    const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));
    expect(robots.length).toBeGreaterThan(0);
    expect(robots.every((r) => r.includes("noindex"))).toBe(true);
    // No certificate card is rendered for a code that does not exist.
    await expect(page.locator("article")).toHaveCount(0);
  });
});

test.describe("bundles", () => {
  test("the public bundle page lists its courses and ships Product schema", async ({ page }) => {
    await page.goto(`/bundles/${bundle.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: bundle.title })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(live.title) }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(second.title) }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in to buy/i })).toBeVisible();
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = blocks.map((b) => JSON.parse(b)["@graph"] as { "@type": string }[]).flat();
    const product = nodes.find((n) => n["@type"] === "Product") as unknown as { offers: Record<string, string>; isRelatedTo: unknown[] };
    expect(product.offers).toMatchObject({ price: "599", priceCurrency: "INR" });
    expect(product.isRelatedTo).toHaveLength(2);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/bundles/${bundle.slug}$`));
  });

  test("the catalogue links to the bundle", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.locator(`a[href="/bundles/${bundle.slug}"]`)).toBeVisible();
  });
});

test.describe("discovery", () => {
  test("the sitemap lists the bundle", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain(`/bundles/${bundle.slug}`);
  });

  test("robots keeps crawlers out of the signed-in app", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toMatch(/Disallow: \/learn/);
    expect(txt).not.toMatch(/Disallow: \/courses/);
  });

  test("llms.txt lists the bundle", async ({ request }) => {
    const text = await (await request.get("/llms.txt")).text();
    expect(text).toContain(`/bundles/${bundle.slug}`);
  });

  test("the sitemap lists the published course, not the draft", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain(`/courses/${live.slug}`);
    expect(xml).not.toContain(draft.slug);
    expect(xml).toMatch(/<loc>[^<]*\/courses<\/loc>/);
  });

  test("llms.txt describes the courses", async ({ request }) => {
    const text = await (await request.get("/llms.txt")).text();
    expect(text).toContain("## Courses");
    expect(text).toContain(`/courses/${live.slug}`);
    expect(text).not.toContain(draft.slug);
  });

  test("the landing page has a Courses section with live data", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#learn");
    await expect(section).toBeVisible();
    await expect(section.getByRole("heading", { name: /learn with real courses/i })).toBeVisible();
    // The teaser is cached for a few minutes, so assert it renders course links rather than this run's exact course.
    await expect(section.locator('a[href^="/courses/"]').first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Courses", exact: true }).first()).toBeVisible();
    await expect(section.getByRole("link", { name: /explore courses/i })).toHaveAttribute("href", "/courses");
  });
});
