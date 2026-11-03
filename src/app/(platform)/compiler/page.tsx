import type { Metadata } from "next";
import { Compiler } from "@/features/compiler/compiler";
import { JsonLd } from "@/components/json-ld";
import { LANGUAGES } from "@/lib/constants";
import { BRAND_KEYWORDS, LANGUAGE_NAMES, SITE_URL, graph, howToLd, ids, mergeKeywords, pageNodes } from "@/lib/seo";

const DESCRIPTION =
  "Free online compiler and code editor for JavaScript, TypeScript, Python, Java, C, C++, C#, Go, PHP, Rust, Kotlin and Swift. Run code instantly with custom input, see stdout, stderr and runtime stats.";

export const metadata: Metadata = {
  title: "Online Compiler — Run Code in 12 Languages",
  description: DESCRIPTION,
  keywords: mergeKeywords(BRAND_KEYWORDS, [
    "online compiler", "online code editor", "online IDE", "run code online", "free online compiler",
    ...Object.values(LANGUAGE_NAMES).map((l) => `online ${l} compiler`),
    "code runner with stdin", "multi language compiler",
  ]),
  alternates: { canonical: "/compiler" },
  openGraph: { type: "website", url: `${SITE_URL}/compiler`, title: "Online Compiler — Run Code in 12 Languages", description: DESCRIPTION },
};

const ld = graph(
  ...pageNodes({
    url: "/compiler",
    name: "Online Compiler",
    description: DESCRIPTION,
    breadcrumb: [
      { name: "Home", url: SITE_URL },
      { name: "Online Compiler", url: "/compiler" },
    ],
  }),
  {
    "@type": ["WebApplication", "SoftwareApplication"],
    "@id": `${SITE_URL}/compiler#app`,
    name: "Setups Works Lab Online Compiler",
    url: `${SITE_URL}/compiler`,
    description: DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Online compiler",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript and a modern web browser.",
    isAccessibleForFree: true,
    isPartOf: { "@id": ids.app },
    publisher: { "@id": ids.org },
    featureList: LANGUAGES.map((l) => `Run ${l.label} online`),
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR", availability: "https://schema.org/InStock" },
  },
  howToLd({
    name: "How to run code online",
    description: "Run code in any of 12 languages from your browser, no setup required.",
    totalTime: "PT1M",
    steps: [
      { name: "Pick a language", text: "Choose from JavaScript, TypeScript, Python, Java, C, C++, C#, Go, PHP, Rust, Kotlin or Swift." },
      { name: "Write or paste code", text: "Use the editor with syntax highlighting and autocomplete." },
      { name: "Add input (optional)", text: "Provide custom stdin for programs that read input." },
      { name: "Run", text: "Click Run to see stdout, stderr, runtime and memory usage." },
    ],
  }),
);

export default function CompilerPage() {
  return (
    <>
      <JsonLd data={ld} />
      <Compiler />
    </>
  );
}
