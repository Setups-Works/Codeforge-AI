/** Shared by the Supabase seeder: turns a spec into a question document. */
import { JS_SPECS } from "./js-specs.mjs";
import { REACT_SPECS_1 } from "./react-specs-1.mjs";
import { REACT_SPECS_2 } from "./react-specs-2.mjs";
import { DSA_SPECS } from "./dsa-specs.mjs";

export const SPECS = [...JS_SPECS, ...REACT_SPECS_1, ...REACT_SPECS_2, ...DSA_SPECS];

/** Titles must be unique across all spec files. */
export function assertUniqueTitles() {
  const titles = new Set();
  for (const spec of SPECS) {
    if (titles.has(spec.title)) throw new Error(`duplicate title: ${spec.title}`);
    titles.add(spec.title);
  }
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

export function buildDoc(spec) {
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

