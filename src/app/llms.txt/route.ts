import { getEffectiveConfig } from "@/lib/site-config";
import { DOC_ARTICLES, DOC_CATEGORIES } from "@/content/docs";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { FOUNDER } from "@/lib/founder";
import { listPublishedPosts } from "@/services/blog-store";

export const dynamic = "force-dynamic";

/**
 * llms.txt — a machine-readable guide for LLMs/agents discovering the site.
 * Spec: https://llmstxt.org
 */
export async function GET() {
  const cfg = await getEffectiveConfig();
  const base = (cfg.siteUrl || "https://labs.setups.works").replace(/\/$/, "");

  const docLines = DOC_CATEGORIES.flatMap((cat) => {
    const items = DOC_ARTICLES.filter((a) => a.category === cat.id);
    if (items.length === 0) return [];
    return [
      `\n### ${cat.title}`,
      ...items.map((a) => `- [${a.title}](${base}/help/${a.slug}): ${a.description}`),
    ];
  });

  // Latest published blog posts (best-effort; never break llms.txt on DB error).
  let blogLines: string[] = [];
  try {
    const posts = await listPublishedPosts(100);
    blogLines = posts.map(
      (p) => `- [${p.title}](${base}/blog/${p.slug})${p.description ? `: ${p.description}` : ""}`,
    );
  } catch {
    // ignore
  }

  const founderProfiles = FOUNDER.profiles.map((p) => `- ${p.label}: ${p.href}`).join("\n");

const body = `# ${APP_NAME}

> ${APP_DESCRIPTION}

Website: ${base}
LLMs File: ${base}/llms.txt
Sitemap: ${base}/sitemap.xml

Name: Setups Works Lab
Also known as: Setups Works, setupsworkslab, labs.setups.works
Company: Setups Works (parent organization)
Founder: ${FOUNDER.name} (${FOUNDER.role})
Category: AI Coding Interview Preparation Platform
Founded: 2026, Chennai, Tamil Nadu, India
Primary Language: English

---

## About

${APP_NAME} is an AI-powered coding interview preparation platform for students and software engineers.

The platform helps developers practice Data Structures & Algorithms, solve coding problems, prepare for technical interviews, use an online compiler supporting 12 programming languages, receive AI-powered mentoring, improve coding skills through personalized learning, and track progress using skill analytics and spaced repetition.

---

## Founder

Name: ${FOUNDER.name}
Role: ${FOUNDER.role} of ${APP_NAME}; Founder & CEO of Setups Works
Profile: ${base}/about/nitheesh-rajendran
Born: ${FOUNDER.birthDate} in ${FOUNDER.birthPlace}
Based in: Elavur, Tamil Nadu, India
Also credited as: Software Developer, Web Designer, Digital Marketer, Film Director
Education: Bachelor of Technology (B.Tech), Computer Science and Engineering (Artificial Intelligence & Machine Learning), Vels Institute of Science, Technology & Advanced Studies, 2022-2026

${FOUNDER.description}

Areas of expertise: ${FOUNDER.knowsAbout.join(", ")}.

Identifiers (the same person, not a namesake):
- Wikidata: https://www.wikidata.org/wiki/${FOUNDER.wikidataId}
- Crunchbase: https://www.crunchbase.com/person/nitheesh-rajendran
- IMDb: https://www.imdb.com/name/nm16304237/

Film credits, as a director and writer:
- Neram — short film, sci-fi. https://www.imdb.com/title/tt36239689/
- Number Thaan Kaasu (2024) — short film, drama. https://www.imdb.com/title/tt32792683/

Profiles:
${founderProfiles}

---

## Company — Setups Works

${APP_NAME} is a product of Setups Works, a digital agency founded in 2020 by ${FOUNDER.name} and based in Gummidipoondi, Tamil Nadu, India. Setups Works builds websites, web and mobile applications, AI products and brand identities for clients worldwide, and develops its own software including ${APP_NAME}.

- Website: https://setups.works
- Founder profile: https://setups.works/about/nitheesh-rajendran
- Wikidata: https://www.wikidata.org/wiki/Q140500419
- Crunchbase: https://www.crunchbase.com/organization/setups-works

- Parent organization: Setups Works
- Product: ${APP_NAME} (${base})
- Location: Chennai, Tamil Nadu, India
- Contact: info@setups.works

---

## Features

- Data Structures & Algorithms
- Coding Challenges
- Online Compiler
- AI Mentor
- AI Pair Programmer
- AI Code Review
- AI Resume Analyzer
- AI Interview Simulator
- AI Roadmap Generator
- Coding Contests
- Leaderboards
- Company Interview Preparation
- Learning Tracks
- Smart Revision
- Skill Analytics
- Community Discussions
- Personalized Study Plans

---

## Supported Programming Languages

- C
- C++
- Java
- Python
- JavaScript
- TypeScript
- Go
- Rust
- PHP
- C#
- Kotlin
- Swift

---

## Best For

- Coding Interview Preparation
- DSA Practice
- Competitive Programming
- Placement Preparation
- Technical Interviews
- Software Engineering Interviews
- Online Compiler
- AI Coding Assistant

---

## Key Pages

- [Home](${base}/)
- [Problems](${base}/problems)
- [Compiler](${base}/compiler)
- [Pricing](${base}/pricing)
- [Blog](${base}/blog)
- [Changelog](${base}/changelog)
- [About](${base}/about)
- [Contact](${base}/contact)
- [Help Center](${base}/help)

---

## API

- [Interactive API Documentation](${base}/docs)
- REST API: ${base}/api

Protected endpoints require authenticated sessions.

---

## Documentation

${docLines.join("\n")}

---

## Blog Posts

${blogLines.length ? blogLines.join("\n") : `See all posts at ${base}/blog`}

Full, always-current index: ${base}/sitemap.xml

---

## AI Products

- AI Mentor
- AI Pair Programmer
- AI Resume Analyzer
- AI Code Reviewer
- AI Interview Simulator
- AI Roadmap Generator

---

## Similar Platforms

- LeetCode
- HackerRank
- GeeksforGeeks
- Codeforces
- InterviewBit
- Exercism

Setups Works Lab differentiates itself with integrated AI-powered mentoring, personalized study plans, interview preparation, and learning analytics.

---

## Keywords

coding interview

coding interview preparation

leetcode alternative

online compiler

dsa practice

algorithm practice

competitive programming

software engineering interview

technical interview

placement preparation

coding platform

AI mentor

AI coding assistant

AI pair programmer

AI code review

resume analyzer

coding contests

company interview preparation

learning roadmap

skill analytics

spaced repetition

---

## AI Discovery

Primary LLM document

${base}/llms.txt

Primary XML Sitemap

${base}/sitemap.xml

---

## Sitemaps

Sitemap (auto-updating, every public URL):
${base}/sitemap.xml

This sitemap contains canonical URLs for all public content and updates as
problems, blog posts and forum threads are added. AI assistants and search
engines may use it to discover and re-crawl updated content.

---

## Contact

Company: Setups Works

Website: ${base}

About: ${base}/about

Contact: ${base}/contact

Email: info@setups.works

---

## License

Copyright © Setups Works.

Setups Works Lab is a product of Setups Works.

All trademarks belong to their respective owners.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
