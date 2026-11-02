/**
 * Seeds the question bank into Supabase (the `questions` table) from the spec
 * files in scripts/seed/. Same specs and idempotency as seed-questions.mjs:
 * slugs that already exist are skipped.
 *
 * Dry run by default — pass --apply to insert. Pass --only=dsa to seed just
 * the DSA set (skipping the JavaScript / React specs).
 *
 * Usage:
 *   node scripts/seed-questions-supabase.mjs                      # preview
 *   node scripts/seed-questions-supabase.mjs --only=dsa --apply   # insert DSA only
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env, .env.local or .env).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SPECS, assertUniqueTitles, buildDoc } from "./seed/build-doc.mjs";
import { DSA_SPECS } from "./seed/dsa-specs.mjs";

const APPLY = process.argv.includes("--apply");
const SELECTED = process.argv.includes("--only=dsa") ? DSA_SPECS : SPECS;

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    try {
      const match = readFileSync(file, "utf8").match(new RegExp(`^${name}="?([^"\\n]+)"?`, "m"));
      if (match) return match[1];
    } catch {
      // try the next file
    }
  }
  throw new Error(`${name} not found in env, .env.local or .env`);
}

/** Map a question doc to the Postgres `questions` columns. */
function toRow(doc) {
  return {
    slug: doc.slug,
    title: doc.title,
    difficulty: doc.difficulty,
    category: doc.category,
    tags: doc.tags,
    companies: doc.companies,
    description: doc.description,
    examples: doc.examples,
    constraints: doc.constraints,
    starter_code: doc.starterCode,
    test_cases: doc.testCases,
    solution: doc.solution,
    editorial: doc.editorial,
    hints: doc.hints,
    is_published: doc.isPublished,
    source: doc.source,
    stats: doc.stats,
  };
}

async function main() {
  assertUniqueTitles();
  const url = loadEnv("NEXT_PUBLIC_SUPABASE_URL");
  const sb = createClient(url, loadEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log(`Target: ${new URL(url).host} · ${APPLY ? "APPLY" : "dry run (pass --apply to insert)"}`);
  console.log(`Specs loaded: ${SELECTED.length}`);

  const { data: existing, error } = await sb.from("questions").select("slug");
  if (error) throw error;
  const have = new Set(existing.map((r) => r.slug));

  const rows = [];
  const failures = [];
  let skipped = 0;
  for (const spec of SELECTED) {
    try {
      const doc = buildDoc(spec);
      if (have.has(doc.slug)) skipped++;
      else rows.push(toRow(doc));
    } catch (e) {
      failures.push(`${spec.title}: ${e.message}`);
    }
  }

  const byDifficulty = {};
  for (const r of rows) byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1;
  console.log(`To create: ${rows.length} ${JSON.stringify(byDifficulty)} · Already present: ${skipped} · Failed: ${failures.length}`);
  for (const f of failures) console.log(`  ✗ ${f}`);

  if (!APPLY || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 25) {
    const { error: insertError } = await sb.from("questions").insert(rows.slice(i, i + 25));
    if (insertError) throw insertError;
  }
  console.log(`Inserted ${rows.length} questions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
