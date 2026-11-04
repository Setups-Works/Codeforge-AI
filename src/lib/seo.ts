import { APP_NAME } from "@/lib/constants";
import { PLANS } from "@/lib/plans";
import type { QuestionDetail } from "@/services/questions";
import type { CourseCard, CourseDetail } from "@/services/lms-catalog";
import type { BundleDetail } from "@/services/lms-bundles";
import type { Certificate } from "@/services/lms-certificates";
import { lmsEnabled } from "@/lib/lms/flag";

/**
 * Central SEO helpers: keyword banks and schema.org (JSON-LD) builders.
 *
 * Every builder returns plain JSON-serialisable nodes. Pages compose them into
 * a single `{ "@context", "@graph" }` payload via {@link graph} and render it
 * with `<JsonLd />`, which escapes the payload for safe inline embedding.
 * Nodes reference the site-wide entities published in the root layout
 * (`/#org`, `/#website`, `/#app`) by `@id` rather than redefining them.
 */

export const SITE_URL = "https://labs.setups.works";

export const ids = {
  org: `${SITE_URL}/#org`,
  website: `${SITE_URL}/#website`,
  app: `${SITE_URL}/#app`,
  logo: `${SITE_URL}/#logo`,
} as const;

/** Keywords that describe the whole product; merged into page-specific lists. */
export const BRAND_KEYWORDS = [
  "Setups Works Lab",
  "Setups Works",
  "setupsworkslab",
  "labs.setups.works",
];

export const CORE_KEYWORDS = [
  "AI coding mentor",
  "AI pair programmer",
  "coding interview preparation",
  "technical interview prep",
  "DSA practice",
  "data structures and algorithms",
  "algorithm practice",
  "LeetCode alternative",
  "LeetCode style problems",
  "coding practice platform",
  "competitive programming",
  "mock interview",
  "spaced repetition coding",
  "FAANG interview prep",
  "online compiler",
  "online code editor",
  "free coding practice",
  "coding challenges",
];

export const LANGUAGE_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  php: "PHP",
  rust: "Rust",
  kotlin: "Kotlin",
  swift: "Swift",
};

/** Merge keyword lists, dropping blanks and case-insensitive duplicates. */
export function mergeKeywords(...lists: (readonly (string | null | undefined)[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const kw = raw?.trim();
      if (!kw) continue;
      const key = kw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(kw);
    }
  }
  return out;
}

/** Keywords for a problem page: title variants, topic, difficulty, companies, languages. */
export function problemKeywords(q: Pick<QuestionDetail, "title" | "difficulty" | "category" | "tags" | "companies" | "starterCode">): string[] {
  const langs = Object.keys(q.starterCode ?? {})
    .map((id) => LANGUAGE_NAMES[id])
    .filter(Boolean)
    .slice(0, 6);
  return mergeKeywords(
    [
      q.title,
      `${q.title} solution`,
      `${q.title} leetcode`,
      `${q.title} interview question`,
      `${q.title} explained`,
      ...langs.map((l) => `${q.title} in ${l}`),
      `${q.difficulty} coding problem`,
      `${q.category} interview questions`,
      `${q.category} problems`,
    ],
    q.tags,
    q.tags.map((t) => `${t} interview questions`),
    (q.companies ?? []).map((c) => `${c} interview questions`),
    ["coding interview", "dsa practice", "online compiler"],
  );
}

/** Wrap nodes into one JSON-LD document. */
export function graph(...nodes: (Record<string, unknown> | null | undefined | false)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

export interface Crumb {
  name: string;
  /** Absolute URL, or a path beginning with `/`. */
  url: string;
}

const abs = (url: string) => (url.startsWith("http") ? url : `${SITE_URL}${url}`);

export function breadcrumbLd(crumbs: Crumb[], id?: string) {
  return {
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.url),
    })),
  };
}

interface WebPageInput {
  url: string;
  name: string;
  description: string;
  /** schema.org subtype, e.g. "CollectionPage", "AboutPage". */
  type?: string | string[];
  breadcrumb?: Crumb[];
  keywords?: string[];
  mainEntity?: Record<string, unknown>;
  dateModified?: string | Date;
  datePublished?: string | Date;
  /** CSS selectors for text-to-speech / assistant answer extraction. */
  speakable?: string[];
}

const iso = (d: string | Date) => (d instanceof Date ? d : new Date(d)).toISOString();

/** A WebPage node wired into the site-wide WebSite/Organization entities. */
export function webPageLd(input: WebPageInput) {
  const url = abs(input.url);
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: "en",
    isPartOf: { "@id": ids.website },
    publisher: { "@id": ids.org },
    about: { "@id": ids.app },
    ...(input.keywords?.length ? { keywords: input.keywords.join(", ") } : {}),
    ...(input.breadcrumb ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
    ...(input.mainEntity ? { mainEntity: input.mainEntity } : {}),
    ...(input.datePublished ? { datePublished: iso(input.datePublished) } : {}),
    ...(input.dateModified ? { dateModified: iso(input.dateModified) } : {}),
    ...(input.speakable?.length
      ? { speakable: { "@type": "SpeakableSpecification", cssSelector: input.speakable } }
      : {}),
    potentialAction: { "@type": "ReadAction", target: [url] },
  };
}

/** WebPage + its BreadcrumbList as a ready-to-spread pair of graph nodes. */
export function pageNodes(input: WebPageInput) {
  const url = abs(input.url);
  return [
    webPageLd(input),
    input.breadcrumb ? breadcrumbLd(input.breadcrumb, `${url}#breadcrumb`) : null,
  ];
}

export interface ListEntry {
  name: string;
  url: string;
  description?: string;
  image?: string;
}

/** An ordered ItemList. Google uses these for carousels and list understanding. */
export function itemListLd(name: string, entries: ListEntry[], id?: string) {
  return {
    "@type": "ItemList",
    ...(id ? { "@id": id } : {}),
    name,
    numberOfItems: entries.length,
    itemListOrder: "https://schema.org/ItemListUnordered",
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(e.url),
      name: e.name,
      ...(e.description ? { description: e.description } : {}),
      ...(e.image ? { image: e.image } : {}),
    })),
  };
}

export interface NavLink {
  name: string;
  url: string;
  description?: string;
}

/**
 * Primary navigation expressed as SiteNavigationElement nodes. Google picks
 * sitelinks itself, but explicit, well-labelled navigation entities are the
 * strongest signal for which pages to promote under the homepage result.
 */
export function siteNavigationLd(links: NavLink[]) {
  return links.map((l) => ({
    "@type": "SiteNavigationElement",
    "@id": `${abs(l.url)}#nav`,
    name: l.name,
    url: abs(l.url),
    ...(l.description ? { description: l.description } : {}),
  }));
}

/** The site's primary destinations, in importance order. */
export const PRIMARY_NAV: NavLink[] = [
  { name: "Practice Problems", url: "/problems", description: "LeetCode-style DSA interview problems with an AI mentor." },
  { name: "Online Compiler", url: "/compiler", description: "Run code in 12 languages with custom input." },
  { name: "Pricing", url: "/pricing", description: "Free plan plus Go and Plus plans with a 7-day trial." },
  { name: "Documentation", url: "/help", description: "Guides, API reference, tutorials and FAQs." },
  { name: "Blog", url: "/blog", description: "Interview prep guides, product updates and tips." },
  { name: "Community Forum", url: "/forum", description: "Discuss problems and interview experiences." },
  { name: "About", url: "/about", description: "About Setups Works Lab and its founder." },
  { name: "Contact", url: "/contact", description: "Get in touch with the Setups Works Lab team." },
];

/** Primary navigation including the LMS entry when it is switched on. */
export function primaryNav(): NavLink[] {
  if (!lmsEnabled()) return PRIMARY_NAV;
  const courses: NavLink = { name: "Courses", url: "/courses", description: "Video courses with lessons, progress tracking and certificates." };
  const at = PRIMARY_NAV.findIndex((l) => l.url === "/pricing");
  return [...PRIMARY_NAV.slice(0, at), courses, ...PRIMARY_NAV.slice(at)];
}

export function faqLd(faqs: { q: string; a: string }[], id?: string) {
  return {
    "@type": "FAQPage",
    ...(id ? { "@id": id } : {}),
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * Parse `**Question?**\nAnswer…` blocks (the docs FAQ format) into a FAQPage
 * node. Returns an empty array when nothing matches, so callers can spread it.
 */
export function faqFromMarkdown(body: string, url: string): Record<string, unknown>[] {
  const faqs: { q: string; a: string }[] = [];
  const re = /\*\*([^*\n]+\?)\*\*\s*\n([\s\S]*?)(?=\n\s*\n\*\*|\s*$)/g;
  for (const m of body.matchAll(re)) {
    const a = plainText(m[2], 1500);
    if (a) faqs.push({ q: m[1].trim(), a });
  }
  return faqs.length ? [faqLd(faqs, `${url}#faq`)] : [];
}

export function howToLd(input: {
  name: string;
  description: string;
  steps: { name: string; text: string; url?: string }[];
  totalTime?: string;
  id?: string;
}) {
  return {
    "@type": "HowTo",
    ...(input.id ? { "@id": input.id } : {}),
    name: input.name,
    description: input.description,
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: abs(s.url) } : {}),
    })),
  };
}

const DIFFICULTY_META: Record<string, { level: string; time: string }> = {
  easy: { level: "Beginner", time: "PT20M" },
  medium: { level: "Intermediate", time: "PT40M" },
  hard: { level: "Advanced", time: "PT1H" },
};

const difficultyMeta = (d: string) => DIFFICULTY_META[d.toLowerCase()] ?? DIFFICULTY_META.medium;

/** Strip markdown down to plain prose for schema text fields. */
export function plainText(md: string, max = 5000): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/**
 * Everything search engines can learn about one practice problem:
 *  - a WebPage whose main entity is the coding Quiz/Question
 *  - a LearningResource/TechArticle describing the problem as study material
 *  - SoftwareSourceCode for each starter template
 *  - a BreadcrumbList that includes the topic category
 *
 * Solutions, editorials and hidden tests are deliberately never emitted.
 */
export function problemGraph(q: QuestionDetail, summary: string) {
  const url = `${SITE_URL}/problems/${q.slug}`;
  const meta = difficultyMeta(q.difficulty);
  const keywords = problemKeywords(q);
  const prompt = plainText(q.description);
  const orgRef = { "@id": ids.org };

  const question = {
    "@type": "Question",
    "@id": `${url}#question`,
    name: q.title,
    text: prompt,
    eduQuestionType: "Programming",
    educationalLevel: meta.level,
    inLanguage: "en",
    about: q.tags.map((t) => ({ "@type": "DefinedTerm", name: t })),
    ...(q.examples.length
      ? {
          // The first worked example doubles as the expected-answer shape
          // without revealing the algorithm.
          comment: q.examples.slice(0, 3).map((ex, i) => ({
            "@type": "Comment",
            name: `Example ${i + 1}`,
            text: `Input: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`,
          })),
        }
      : {}),
    ...(q.constraints.length ? { additionalProperty: q.constraints.map((c) => ({ "@type": "PropertyValue", name: "Constraint", value: c })) } : {}),
  };

  const quiz = {
    "@type": "Quiz",
    "@id": `${url}#quiz`,
    name: `${q.title} — ${q.difficulty} coding problem`,
    educationalLevel: meta.level,
    educationalAlignment: {
      "@type": "AlignmentObject",
      alignmentType: "teaches",
      educationalFramework: "Data Structures and Algorithms",
      targetName: q.category,
    },
    assesses: q.tags.length ? q.tags : [q.category],
    hasPart: { "@id": `${url}#question` },
    isAccessibleForFree: true,
  };

  const resource = {
    "@type": ["LearningResource", "TechArticle"],
    "@id": `${url}#problem`,
    name: q.title,
    headline: q.title,
    url,
    description: summary,
    abstract: summary,
    learningResourceType: ["Coding practice problem", "Practice exercise"],
    interactivityType: "active",
    educationalLevel: meta.level,
    educationalUse: ["Interview preparation", "Practice"],
    proficiencyLevel: meta.level,
    timeRequired: meta.time,
    teaches: q.tags.length ? q.tags : [q.category],
    about: [q.category, ...q.tags].map((t) => ({ "@type": "Thing", name: t })),
    mentions: q.companies.map((c) => ({ "@type": "Organization", name: c })),
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: "Software engineers preparing for technical interviews",
    },
    genre: q.category,
    articleSection: q.category,
    inLanguage: "en",
    isAccessibleForFree: true,
    keywords: keywords.join(", "),
    author: orgRef,
    publisher: orgRef,
    isPartOf: { "@id": ids.website },
    mainEntityOfPage: { "@id": `${url}#webpage` },
    ...(q.acceptanceRate != null
      ? { additionalProperty: { "@type": "PropertyValue", name: "Acceptance rate", value: q.acceptanceRate, unitText: "percent" } }
      : {}),
  };

  const code = Object.entries(q.starterCode ?? {})
    .filter(([, src]) => typeof src === "string" && src.trim())
    .slice(0, 12)
    .map(([lang, src]) => ({
      "@type": "SoftwareSourceCode",
      "@id": `${url}#code-${lang}`,
      name: `${q.title} — ${LANGUAGE_NAMES[lang] ?? lang} starter code`,
      programmingLanguage: LANGUAGE_NAMES[lang] ?? lang,
      codeSampleType: "template",
      text: String(src).slice(0, 4000),
      isPartOf: { "@id": `${url}#problem` },
    }));

  return graph(
    ...pageNodes({
      url,
      name: `${q.title} — ${q.difficulty} Coding Problem`,
      description: summary,
      keywords,
      mainEntity: { "@id": `${url}#quiz` },
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Problems", url: "/problems" },
        { name: q.category, url: `/problems?category=${encodeURIComponent(q.category)}` },
        { name: q.title, url },
      ],
    }),
    quiz,
    question,
    resource,
    ...code,
  );
}

/** Pricing page: one Product per plan with INR offers and a trial note. */
export function pricingGraph() {
  const url = `${SITE_URL}/pricing`;
  const plans = Object.values(PLANS);
  const validThrough = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  const products = plans.map((p) => ({
    "@type": "Product",
    "@id": `${url}#plan-${p.id}`,
    name: `${APP_NAME} ${p.name} plan`,
    description: `${p.tagline}. ${p.features.filter((f) => f.included).map((f) => f.text).join(", ")}.`,
    brand: { "@type": "Brand", name: APP_NAME },
    category: "Coding interview preparation software",
    url,
    image: `${SITE_URL}/icon-512.png`,
    isRelatedTo: { "@id": ids.app },
    offers: (["monthly", "yearly"] as const).map((cycle) => ({
      "@type": "Offer",
      name: `${p.name} — ${cycle}`,
      url,
      price: String(p.price[cycle]),
      priceCurrency: "INR",
      priceValidUntil: validThrough,
      availability: "https://schema.org/InStock",
      seller: { "@id": ids.org },
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: p.price[cycle],
        priceCurrency: "INR",
        billingDuration: cycle === "monthly" ? "P1M" : "P1Y",
        unitCode: cycle === "monthly" ? "MON" : "ANN",
      },
    })),
  }));

  return graph(
    ...pageNodes({
      url,
      name: `Pricing — ${APP_NAME}`,
      description: "Simple, transparent pricing. Start free, upgrade to Go or Plus with a 7-day free trial.",
      type: "WebPage",
      mainEntity: { "@id": `${url}#catalog` },
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Pricing", url },
      ],
    }),
    {
      "@type": "OfferCatalog",
      "@id": `${url}#catalog`,
      name: `${APP_NAME} plans`,
      itemListElement: products.map((p) => ({ "@id": p["@id"] })),
    },
    ...products,
  );
}

// ── Courses (LMS) ──────────────────────────────────────────────────────

/** Seconds -> ISO 8601 duration ("PT1H20M"); null when there is no duration. */
export function isoDuration(totalSeconds: number): string | null {
  const s = Math.round(totalSeconds);
  if (!(s > 0)) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${!h && !m ? `${sec}S` : ""}`;
}

/** Keywords for a course page: title variants, topic, level, tags, instructor. */
export function courseKeywords(c: Pick<CourseDetail, "title" | "category" | "level" | "tags" | "instructorName" | "seoKeywords">): string[] {
  return mergeKeywords(
    c.seoKeywords?.split(","),
    [
      c.title,
      `${c.title} course`,
      `${c.title} online course`,
      `${c.title} tutorial`,
      c.category ? `${c.category} course` : null,
      c.category ? `learn ${c.category}` : null,
      c.level ? `${c.level} ${c.category ?? ""} course`.replace(/\s+/g, " ").trim() : null,
      c.instructorName ? `${c.instructorName} course` : null,
    ],
    c.tags,
    c.tags.map((t) => `${t} course`),
    BRAND_KEYWORDS,
    ["online course", "video course", "coding course"],
  );
}

/**
 * One public course page: WebPage + breadcrumb, a schema.org Course with a
 * priced Offer, an online CourseInstance, the syllabus and (only when real
 * reviews exist) an AggregateRating. Video refs never appear here: lessons
 * are listed by title only.
 */
export function courseGraph(c: CourseDetail, reviews: { authorName: string; rating: number; body: string | null; createdAt: Date }[] = []) {
  const url = `${SITE_URL}/courses/${c.slug}`;
  const summary = plainText(c.description, 300) || c.subtitle || c.title;
  const keywords = courseKeywords(c);
  const workload = isoDuration(c.durationS);
  const orgRef = { "@id": ids.org };

  const offer = {
    "@type": "Offer",
    "@id": `${url}#offer`,
    url,
    price: String(c.priceInr),
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    category: c.isFree ? "Free" : "Paid",
    seller: orgRef,
  };

  const instructor = c.instructorName
    ? {
        "@type": "Person",
        name: c.instructorName,
        ...(c.instructorBio ? { description: c.instructorBio } : {}),
        ...(c.instructorImage ? { image: c.instructorImage } : {}),
      }
    : null;

  const course = {
    "@type": "Course",
    "@id": `${url}#course`,
    name: c.title,
    description: summary,
    url,
    provider: orgRef,
    inLanguage: c.language,
    isAccessibleForFree: c.isFree,
    keywords: keywords.join(", "),
    ...(c.thumbnailUrl ? { image: c.thumbnailUrl } : {}),
    ...(c.level ? { educationalLevel: c.level } : {}),
    ...(c.category ? { about: [c.category, ...c.tags].map((t) => ({ "@type": "Thing", name: t })) } : {}),
    ...(c.outcomes.length ? { teaches: c.outcomes } : {}),
    ...(c.requirements.length ? { coursePrerequisites: c.requirements } : {}),
    ...(workload ? { timeRequired: workload } : {}),
    syllabusSections: c.sections.map((s) => ({
      "@type": "Syllabus",
      name: s.title,
      description: s.lessons.map((l) => l.title).join("; "),
    })),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: workload ?? undefined,
      ...(instructor ? { instructor } : {}),
    },
    offers: offer,
    // A finished course earns a certificate that anyone can verify.
    educationalCredentialAwarded: "Certificate of completion",
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
    ...(c.publishedAt ? { datePublished: c.publishedAt } : {}),
    dateModified: c.updatedAt,
    ...(c.ratingCount > 0 && reviews.length
      ? {
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.authorName },
            datePublished: r.createdAt.toISOString(),
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
    ...(c.ratingCount > 0 && c.ratingAvg != null
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: c.ratingAvg, ratingCount: c.ratingCount, bestRating: 5, worstRating: 1 } }
      : {}),
  };

  return graph(
    ...pageNodes({
      url,
      name: c.seoTitle || c.title,
      description: c.seoDescription || summary,
      keywords,
      mainEntity: { "@id": `${url}#course` },
      dateModified: c.updatedAt,
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Courses", url: "/courses" },
        { name: c.title, url },
      ],
    }),
    course,
  );
}

/** The public catalogue as a CollectionPage + ItemList. */
export function courseListGraph(items: CourseCard[], total: number) {
  return graph(
    ...pageNodes({
      url: "/courses",
      name: `Courses — ${APP_NAME}`,
      description: "Video courses on coding interviews, data structures and algorithms, and more.",
      type: "CollectionPage",
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Courses", url: "/courses" },
      ],
    }),
    items.length
      ? {
          ...itemListLd(
            "Courses",
            items.map((i) => ({ name: i.title, url: `/courses/${i.slug}`, description: i.subtitle ?? undefined, image: i.thumbnailUrl ?? undefined })),
            `${SITE_URL}/courses#list`,
          ),
          numberOfItems: total,
        }
      : null,
  );
}

/** A bundle page: a Product with one Offer whose parts are the courses, plus breadcrumbs. */
export function bundleGraph(b: BundleDetail) {
  const url = `${SITE_URL}/bundles/${b.slug}`;
  const summary = plainText(b.description, 300) || `${b.title}: ${b.courses.length} courses together at one price.`;
  const keywords = mergeKeywords([b.title, `${b.title} bundle`, "course bundle", "coding course bundle", "online courses bundle"], b.courses.map((c) => c.title), BRAND_KEYWORDS);
  const orgRef = { "@id": ids.org };

  return graph(
    ...pageNodes({
      url,
      name: `${b.title} — Course Bundle`,
      description: summary,
      keywords,
      mainEntity: { "@id": `${url}#bundle` },
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Courses", url: "/courses" },
        { name: b.title, url },
      ],
    }),
    {
      "@type": "Product",
      "@id": `${url}#bundle`,
      name: b.title,
      description: summary,
      url,
      brand: { "@type": "Brand", name: APP_NAME },
      category: "Online course bundle",
      keywords: keywords.join(", "),
      ...(b.thumbnailUrl ? { image: b.thumbnailUrl } : {}),
      isRelatedTo: b.courses.map((c) => ({ "@type": "Course", name: c.title, url: `${SITE_URL}/courses/${c.slug}`, provider: orgRef })),
      offers: {
        "@type": "Offer",
        "@id": `${url}#offer`,
        url,
        price: String(b.priceInr),
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        seller: orgRef,
      },
    },
    itemListLd(
      "Courses in this bundle",
      b.courses.map((c) => ({ name: c.title, url: `/courses/${c.slug}`, image: c.thumbnailUrl ?? undefined })),
      `${url}#courses`,
    ),
  );
}

/** A verifiable completion certificate as an EducationalOccupationalCredential. */
export function certificateGraph(cert: Certificate) {
  const url = `${SITE_URL}/certificate/${cert.code}`;
  return graph(
    ...pageNodes({
      url,
      name: `Certificate of completion — ${cert.courseTitle}`,
      description: `${cert.learnerName} completed ${cert.courseTitle} on ${APP_NAME}.`,
    }),
    {
      "@type": "EducationalOccupationalCredential",
      "@id": `${url}#credential`,
      name: `${cert.courseTitle} — Certificate of completion`,
      credentialCategory: "certificate",
      identifier: cert.code,
      dateCreated: cert.issuedAt.toISOString(),
      url,
      recognizedBy: { "@id": ids.org },
      about: { "@type": "Course", name: cert.courseTitle },
    },
  );
}
