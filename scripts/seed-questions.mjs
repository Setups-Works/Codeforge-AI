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
import { SPECS, assertUniqueTitles, buildDoc } from "./seed/build-doc.mjs";

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

async function main() {
  assertUniqueTitles();
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
