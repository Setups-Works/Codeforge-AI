/**
 * Seeds the question bank from the spec files in scripts/seed/.
 *
 * Expected outputs are COMPUTED by running each spec's reference `solve`
 * over its inputs — test cases are correct by construction. Idempotent:
 * questions whose slug already exists are skipped.
 *
 * Usage: node scripts/seed-questions.mjs
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { JS_SPECS } from "./seed/js-specs.mjs";
import { REACT_SPECS_1 } from "./seed/react-specs-1.mjs";
import { REACT_SPECS_2 } from "./seed/react-specs-2.mjs";
import { DSA_SPECS } from "./seed/dsa-specs.mjs";

const SPECS = [...JS_SPECS, ...REACT_SPECS_1, ...REACT_SPECS_2, ...DSA_SPECS];

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  for (const file of [".env.local", ".env"]) {
    try {
      const match = readFileSync(file, "utf8").match(/MONGODB_URI="([^"]+)"/);
      if (match) return match[1];
    } catch {
      // try the next file
    }
  }
  throw new Error("MONGODB_URI not found in env, .env.local or .env");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const JS_STARTER =
  "const input = require('fs').readFileSync(0, 'utf8').trim();\n" +
  "// Parse the input (format described above) and print the answer\n" +
  "// with console.log.\n";

const PY_STARTER =
  "import sys\n" +
  "data = sys.stdin.read().strip()\n" +
  "# Parse the input (format described above) and print the answer.\n";

function buildDoc(spec) {
  // Compute expected outputs from the reference solution.
  const cases = spec.inputs.map((input) => {
    const expected = spec.solve(input);
    if (typeof expected !== "string" || expected.length === 0) {
      throw new Error(`reference solve returned empty output for input ${JSON.stringify(input)}`);
    }
    return { input, expected };
  });

  const visibleCount = Math.min(2, cases.length);
  const testCases = cases.map((testCase, index) => ({
    input: testCase.input,
    expected: testCase.expected,
    hidden: index >= visibleCount,
  }));

  const example = cases[0];
  const description =
    `${spec.statement}\n\n` +
    "_Your program reads from **stdin** and prints to **stdout**._";

  const solution =
    "const input = require('fs').readFileSync(0, 'utf8').trim();\n" +
    `const solve = ${spec.solve.toString()};\n` +
    "console.log(solve(input));\n";

  return {
    slug: slugify(spec.title),
    title: spec.title,
    difficulty: spec.difficulty,
    category: spec.category,
    tags: spec.tags,
    companies: [],
    description,
    examples: [{ input: example.input, output: example.expected }],
    constraints: [],
    starterCode: { javascript: JS_STARTER, typescript: JS_STARTER, python: PY_STARTER },
    testCases,
    solution,
    editorial: `${spec.explanation}`,
    hints: spec.hints,
    isPublished: true,
    source: "manual",
    stats: { submissions: 0, accepted: 0 },
  };
}

async function main() {
  // Sanity: titles must be unique across all spec files.
  const titles = new Set();
  for (const spec of SPECS) {
    if (titles.has(spec.title)) throw new Error(`duplicate title: ${spec.title}`);
    titles.add(spec.title);
  }
  console.log(`Specs loaded: ${SPECS.length}`);

  await mongoose.connect(loadMongoUri());
  const questions = mongoose.connection.db.collection("questions");

  let created = 0;
  let skipped = 0;
  const failures = [];
  const byCategory = new Map();

  for (const spec of SPECS) {
    let doc;
    try {
      doc = buildDoc(spec);
    } catch (error) {
      failures.push(`${spec.title}: ${error.message}`);
      continue;
    }

    const exists = await questions.findOne({ slug: doc.slug }, { projection: { _id: 1 } });
    if (exists) {
      skipped++;
      continue;
    }

    await questions.insertOne({
      ...doc,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created++;
    byCategory.set(doc.category, (byCategory.get(doc.category) ?? 0) + 1);
  }

  console.log(`\nCreated: ${created} · Skipped (already present): ${skipped} · Failed: ${failures.length}`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  if (byCategory.size > 0) {
    console.log("\nNew questions by category:");
    for (const [category, count] of [...byCategory.entries()].sort()) {
      console.log(`  ${String(count).padStart(2)} · ${category}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
