/**
 * Static content for the Setups Works Lab Documentation Center (/help).
 * Framework-free (no React/server imports) so it can be used on both the
 * server (pages, metadata, sitemap) and the client (search).
 */

export type DocCategoryId =
  | "getting-started"
  | "features"
  | "ai"
  | "api"
  | "guides"
  | "courses"
  | "billing"
  | "faq";

export interface DocCategory {
  id: DocCategoryId;
  title: string;
  description: string;
  icon: string; // resolves to an icon in @/components/icons
}

export interface DocArticle {
  slug: string;
  category: DocCategoryId;
  title: string;
  description: string;
  tags: string[];
  /** Markdown body. */
  body: string;
}

export const DOC_CATEGORIES: DocCategory[] = [
  { id: "getting-started", title: "Getting Started", description: "Create an account and solve your first problem.", icon: "Rocket" },
  { id: "features", title: "Platform Features", description: "Problems, revision, analytics, contests and more.", icon: "Layers" },
  { id: "ai", title: "AI Tools", description: "The AI Mentor, the tools suite, and credits.", icon: "Sparkles" },
  { id: "api", title: "API & SDKs", description: "Authenticate and call the REST API from your code.", icon: "Code2" },
  { id: "guides", title: "Guides & Tutorials", description: "Step-by-step walkthroughs for common workflows.", icon: "BookOpen" },
  { id: "courses", title: "Courses & Certificates", description: "Learn from video courses, track progress and earn certificates.", icon: "GraduationCap" },
  { id: "billing", title: "Plans & Billing", description: "Plans, subscriptions, coupons and invoices.", icon: "CreditCard" },
  { id: "faq", title: "FAQ", description: "Quick answers to common questions.", icon: "HelpCircle" },
];

export const DOC_ARTICLES: DocArticle[] = [
  // ── Getting Started ───────────────────────────────────────
  {
    slug: "what-is-setups-works-lab",
    category: "getting-started",
    title: "What is Setups Works Lab?",
    description: "An overview of the platform and what you can do with it.",
    tags: ["overview", "intro", "start"],
    body: `# What is Setups Works Lab?

![The Setups Works Lab workspace](/docs/dashboard.png)

Setups Works Lab is an AI-powered coding-interview preparation platform. It combines a
deep problem bank, an instant multi-language compiler, AI mentoring, spaced
repetition, skill analytics, contests, and a community — so you can practice
smarter and walk into interviews with confidence.

## What you can do

- **Solve DSA problems** in a VS Code-style editor across 12 languages.
- **Run code instantly** in the standalone [Compiler](/compiler) with custom input.
- **Get unstuck** with the AI Mentor — hints, debugging help and complexity analysis.
- **Retain what you learn** with SM-2 spaced repetition (Smart Revision).
- **Track your growth** with skill analytics and weakness detection.
- **Compete** in weekly contests and climb the leaderboard.
- **Prepare for companies** with curated question sets.

## Plans

The core platform is free. Paid **Go** and **Plus** plans unlock more AI credits
and advanced features — see [Plans & pricing](/help/plans-and-pricing).

> Ready to begin? Head to [Create your account](/help/create-your-account).`,
  },
  {
    slug: "create-your-account",
    category: "getting-started",
    title: "Create your account",
    description: "Sign up with email or a social provider and set up your profile.",
    tags: ["signup", "register", "account", "oauth"],
    body: `# Create your account

1. Go to [Sign up](/register).
2. Register with **email + password**, or continue with **Google** or **GitHub**
   (shown automatically when OAuth is configured).
3. Complete the short **onboarding** — pick your goal, level, focus topics and a
   daily target. This personalizes your dashboard and daily plan.

## Tips

- Use the **show/hide password** toggle to confirm your password as you type.
- Forgot your password later? Use [Forgot password](/forgot-password) to receive
  a reset link by email.
- You can edit your public profile any time in **Settings → Profile**.`,
  },
  {
    slug: "solve-your-first-problem",
    category: "getting-started",
    title: "Solve your first problem",
    description: "Open a problem, write code, run against examples, and submit.",
    tags: ["problems", "submit", "editor", "run"],
    body: `# Solve your first problem

![Solving a problem in the editor](/docs/problem.png)

1. Open [Problems](/problems) and pick an **Easy** one to start.
2. Choose your language in the editor (12 are supported).
3. Write your solution. Press **Run** to test against the sample cases — you'll
   see pass/fail per case plus runtime.
4. Press **Submit** to judge against the full hidden test suite. A passing
   submission awards **XP** and may unlock **badges**.

Stuck? Open the **AI Mentor** panel for a progressive hint that nudges you toward
the idea without spoiling the solution. See [AI Mentor](/help/ai-mentor).`,
  },
  {
    slug: "using-the-compiler",
    category: "getting-started",
    title: "Using the online compiler",
    description: "Run code in any language with custom stdin — no problem required.",
    tags: ["compiler", "run", "stdin", "languages"],
    body: `# Using the online compiler

![The online compiler with stdin and output](/docs/compiler.png)

The [Compiler](/compiler) is a blank-canvas editor that runs code in any of 12
languages with your own input — no problem or test cases needed.

1. Open [/compiler](/compiler).
2. Pick a language and write code.
3. Add **standard input** in the stdin box if your program reads input.
4. Press **Run** to see real \`stdout\`/\`stderr\`, the exit code, and runtime/memory.

It's perfect for quick experiments, snippets and debugging.`,
  },

  // ── Features ──────────────────────────────────────────────
  {
    slug: "problems-and-tracks",
    category: "features",
    title: "Problems, tracks & roadmaps",
    description: "Browse, filter and follow guided learning paths.",
    tags: ["problems", "tracks", "roadmaps", "filter"],
    body: `# Problems, tracks & roadmaps

![Browsing the problem bank](/docs/problems.png)

- **Problems** — filter by difficulty, category, tag or solve-status, and search
  the full bank from [/problems](/problems).
- **Tracks & Roadmaps** — follow structured paths (DSA, Frontend) that order
  topics and problems so you always know what to learn next.
- **Company prep** — curated sets for top companies (a paid feature).

Every solved problem feeds your analytics and can be added to **Smart Revision**.`,
  },
  {
    slug: "smart-revision",
    category: "features",
    title: "Smart Revision (spaced repetition)",
    description: "Review problems at the perfect moment using the SM-2 algorithm.",
    tags: ["revision", "spaced repetition", "sm-2", "memory"],
    body: `# Smart Revision

Smart Revision uses the **SM-2 spaced-repetition** algorithm to schedule reviews
right before you'd forget — locking solutions into long-term memory.

1. Add a problem to your revision deck.
2. Visit [Smart Revision](/revision) to see cards that are **due**.
3. After reviewing, rate how well you recalled it (0–5). The interval to the next
   review adjusts automatically.

Smart Revision is part of the **Go** and **Plus** plans.`,
  },
  {
    slug: "skill-analytics",
    category: "features",
    title: "Skill analytics & weakness detection",
    description: "See topic mastery and get a plan to fix weak areas.",
    tags: ["analytics", "weakness", "mastery", "insights"],
    body: `# Skill analytics & weakness detection

- **Skill Analytics** maps your mastery per topic and surfaces performance
  insights and readiness signals.
- **Weakness Detection** analyzes your acceptance rate per category and recommends
  exactly what to practice next, with a personalized plan.

These live under [Analytics](/analytics) and [Weakness](/weakness) and are part of
paid plans.`,
  },
  {
    slug: "contests-and-leaderboards",
    category: "features",
    title: "Contests & leaderboards",
    description: "Compete in timed contests and climb the rankings.",
    tags: ["contests", "leaderboard", "compete", "ranking"],
    body: `# Contests & leaderboards

- Join **weekly contests** and **daily challenges** from [Contests](/contests).
- Submissions during a contest count toward your contest score and the live
  **leaderboard**.
- Earn XP, badges and streaks as you go — see the global [Leaderboard](/leaderboard).`,
  },
  {
    slug: "mock-interviews",
    category: "features",
    title: "Mock interview simulator",
    description: "Practice timed interviews with AI feedback on your performance.",
    tags: ["interview", "mock", "feedback", "timed"],
    body: `# Mock interview simulator

The Mock Interview simulator gives you a **timed** question queue that mirrors a
real interview, then provides **AI feedback** on correctness, approach and time
management.

Open it at [Interview](/interview). It's part of the **Plus** plan.`,
  },
  {
    slug: "community-and-discussions",
    category: "features",
    title: "Community & discussions",
    description: "Discuss solutions, ask questions and learn from others.",
    tags: ["community", "forum", "discussions", "social"],
    body: `# Community & discussions

- The [Community hub](/community) brings together the forum, per-problem
  discussions and the leaderboard.
- Post solutions, ask questions, upvote helpful answers, and follow other members.
- Each discussion can get an **AI summary** to capture the key takeaways.`,
  },

  // ── AI ────────────────────────────────────────────────────
  {
    slug: "ai-mentor",
    category: "ai",
    title: "AI Mentor",
    description: "Contextual hints, debugging help and complexity analysis.",
    tags: ["ai", "mentor", "hints", "chat", "complexity"],
    body: `# AI Mentor

![The AI Mentor panel with quick actions](/docs/ai-mentor.png)

The AI Mentor is your in-workspace coding tutor. While solving a problem, open the
mentor panel to:

- Get **progressive hints** (gentle nudge → technique → algorithm outline) instead
  of spoilers.
- Ask **why your code fails**, referencing your current code and the failing case.
- Get **time and space complexity** with a one-line justification.

The mentor stays **on-topic** — it only answers programming, DSA and
interview-prep questions and politely declines anything unrelated.

Every AI message uses one **AI credit** — see [AI credits & limits](/help/ai-credits-and-limits).`,
  },
  {
    slug: "ai-tools-suite",
    category: "ai",
    title: "AI Tools suite",
    description: "Roadmaps, code review, resume analysis, pair programming and more.",
    tags: ["ai", "tools", "roadmap", "resume", "pair programmer"],
    body: `# AI Tools suite

![The AI Tools page](/docs/ai-tools.png)

The [AI Tools](/ai-tools) page bundles focused assistants:

- **Learning Coach** — guidance tuned to your weak areas.
- **Roadmap Generator** — a guided path to your target role.
- **Study Planner** — a structured plan toward your target date.
- **Code Review** — correctness, readability and best-practice feedback.
- **Complexity Visualizer** — Big-O breakdown for any snippet.
- **Generate Questions** — create practice problems from a prompt.
- **Pair Programmer**, **Contest Generator**, **Project Reviewer**,
  **Resume Analyzer** — available on the **Plus** plan.

Each run uses AI credits, and you can reload your saved runs from history.`,
  },
  {
    slug: "ai-credits-and-limits",
    category: "ai",
    title: "AI credits & monthly limits",
    description: "How AI usage is metered across plans.",
    tags: ["credits", "limits", "usage", "quota"],
    body: `# AI credits & monthly limits

![AI credits and usage in Settings](/docs/billing.png)

Every AI action (a mentor message or an AI tool run) costs **one AI credit**.
Credits reset monthly.

| Plan | AI credits / month | Problem generation / month |
| :--- | :--- | :--- |
| Free | 90  | 20 |
| Go   | 600 | 50 |
| Plus | Unlimited | Unlimited |

Track your usage in **Settings → Billing & Usage**. When you run out, you'll see a
clear message and a one-tap upgrade option. Some tools (Pair Programmer, Contest
Generator, Project Reviewer, Resume Analyzer, Mock Interview) require the **Plus**
plan regardless of credits.`,
  },

  // ── API ───────────────────────────────────────────────────
  {
    slug: "api-overview",
    category: "api",
    title: "API overview & authentication",
    description: "How the REST API works and how to authenticate.",
    tags: ["api", "rest", "auth", "session", "cookie"],
    body: `# API overview & authentication

Setups Works Lab ships a REST API under \`/api\`. An interactive **OpenAPI/Swagger**
explorer is available at \`/docs\` (admin access).

## Authentication

Protected endpoints use your **session cookie**, set after you sign in via
NextAuth. Call the API from the same origin (the browser sends the cookie
automatically), for example from your own dashboard scripts or the in-app client.

\`\`\`js
// Same-origin fetch — the session cookie is sent automatically
const res = await fetch("/api/billing/usage");
const data = await res.json();
console.log(data.usage); // { used, allowance, remaining, ... }
\`\`\`

Public endpoints (problem listing, search, discussions read) don't require a
session. Mutating requests must be **same-origin** (a CORS guard blocks
cross-site writes) and bodies are capped at 1 MB.`,
  },
  {
    slug: "api-endpoints-and-examples",
    category: "api",
    title: "Endpoints & examples",
    description: "Common endpoints with copy-paste examples.",
    tags: ["api", "endpoints", "examples", "fetch"],
    body: `# Endpoints & examples

A few of the most useful endpoints (see \`/docs\` for the full reference):

### List problems
\`\`\`http
GET /api/questions?difficulty=Easy&category=Arrays&page=1
\`\`\`

### Run code against sample cases
\`\`\`http
POST /api/execute
{ "questionId": "...", "language": "python", "code": "..." }
\`\`\`

### Run code in the standalone compiler
\`\`\`http
POST /api/compiler
{ "language": "javascript", "code": "console.log(1+1)", "stdin": "" }
\`\`\`

### Ask the AI Mentor (streaming)
\`\`\`http
POST /api/ai/chat
{ "questionId": "...", "message": "Give me a hint" }
\`\`\`
The response is a streamed text body — read it incrementally.

### Your AI usage
\`\`\`http
GET /api/billing/usage
\`\`\`

All examples assume an authenticated, same-origin request.`,
  },
  {
    slug: "api-rate-limits",
    category: "api",
    title: "Rate limits",
    description: "Per-endpoint request limits and how to handle 429s.",
    tags: ["api", "rate limit", "429", "throttle"],
    body: `# Rate limits

To keep the platform fast and fair, endpoints are rate-limited per user/IP:

| Bucket | Limit |
| :--- | :--- |
| Auth | 10 / 60s |
| Code execution | 12 / 60s |
| Submissions | 8 / 60s |
| AI chat/tools | 20 / 300s |
| AI generation | 5 / 300s |
| Payments | 10 / 60s |
| General API | 120 / 60s |

When you exceed a limit you'll get **HTTP 429** with a \`Retry-After\` header.
Back off for that many seconds and retry.`,
  },
  {
    slug: "razorpay-webhooks",
    category: "api",
    title: "Razorpay webhooks",
    description: "How subscription events are verified and processed.",
    tags: ["webhook", "razorpay", "subscription", "signature"],
    body: `# Razorpay webhooks

Recurring subscriptions are driven by Razorpay webhooks at
\`POST /api/subscription/webhook\`.

- The endpoint verifies the \`x-razorpay-signature\` against your
  \`RAZORPAY_WEBHOOK_SECRET\` using a constant-time comparison.
- Deliveries are **idempotent** — a duplicate event id is ignored.
- Handled events: \`subscription.charged\` (renew + record an invoice),
  \`subscription.activated\`, \`subscription.cancelled\`, \`subscription.halted\`,
  \`subscription.completed\`, and \`payment.failed\`.

Configure the webhook URL and secret in the Razorpay Dashboard. See
[Subscriptions & auto-pay](/help/subscriptions-and-auto-pay).`,
  },

  // ── Guides ────────────────────────────────────────────────
  {
    slug: "guide-first-dsa-problem",
    category: "guides",
    title: "Tutorial: solve a DSA problem end-to-end",
    description: "From reading the prompt to a green submission.",
    tags: ["tutorial", "dsa", "walkthrough"],
    body: `# Tutorial: solve a DSA problem end-to-end

1. **Read carefully.** Open a problem and use the mentor's *Explain problem* quick
   action to restate it and surface edge cases.
2. **Plan before coding.** Ask for a **level-1 hint** if you're unsure of the
   technique. Aim to name the data structure and approach first.
3. **Implement.** Write your solution and **Run** against the samples.
4. **Debug.** If a case fails, ask the mentor *why is this failing?* — it sees your
   code and the failing case.
5. **Check complexity.** Use *Complexity* to confirm your time/space is optimal.
6. **Submit** for the full suite, then **add it to Smart Revision** so you don't
   forget it.`,
  },
  {
    slug: "guide-study-plan",
    category: "guides",
    title: "Guide: build a study plan",
    description: "Generate a structured plan toward your target date.",
    tags: ["study plan", "guide", "ai tools", "roadmap"],
    body: `# Guide: build a study plan

1. Open [AI Tools](/ai-tools?tool=study) → **Study Planner**.
2. Enter your **goal**, the number of **weeks**, and **hours per day**.
3. Generate a week-by-week plan with daily tasks.
4. Pair it with a **Roadmap** for topic ordering and **Smart Revision** for
   retention.

Revisit and regenerate as your timeline changes.`,
  },
  {
    slug: "guide-company-prep",
    category: "guides",
    title: "Guide: prepare for a company interview",
    description: "Use company sets, mock interviews and analytics together.",
    tags: ["company", "interview prep", "guide"],
    body: `# Guide: prepare for a company interview

1. Open **Company Prep** and pick your target company's question set.
2. Work through problems; add tricky ones to **Smart Revision**.
3. Check **Skill Analytics** to find and fix weak topics.
4. Do a few **Mock Interviews** under time pressure and review the AI feedback.
5. Run your resume through the **Resume Analyzer** for ATS-style feedback.

Company Prep, Mock Interviews and the Resume Analyzer are part of paid plans.`,
  },

  // ── Billing ───────────────────────────────────────────────
  {
    slug: "how-courses-work",
    category: "courses",
    title: "How courses work",
    description: "Lessons, quizzes, coding problems, progress and resuming where you left off.",
    tags: ["course", "learn", "lesson", "video", "quiz", "progress"],
    body: `# How courses work

Courses are video lessons organised into sections. Switch between **Practice** and
**Learn** from the top bar to find them.

## Lesson types
- **Video** — your playback position is saved, so you resume exactly where you stopped.
- **Coding problem** — opens the same workspace you use for practice. Solve it and the lesson completes.
- **Quiz** — pass the required score to complete it. Quizzes may unlock the next lesson.
- **Reading** — notes and links from the instructor.

## Tracking progress
Finished lessons are ticked in the lesson list. **My courses** shows your progress and a
**Continue** button that jumps to your last lesson. Lessons and courses count toward your
streak, XP and badges.

## Notes, questions and the AI mentor
Take private, timestamped notes while you watch, ask the instructor a question under any lesson,
and ask the AI mentor about what you're watching. It never gives away quiz answers.

## Free previews and locked lessons
Some lessons are free previews you can watch before enrolling. A lesson may be locked until you
finish the previous required one, or until a set number of days after you enrol (a drip schedule).
The lesson list tells you which.`,
  },
  {
    slug: "course-access-and-refunds",
    category: "courses",
    title: "Course access, plans and refunds",
    description: "Buying a course, plan-included courses, access limits and the 14-day refund window.",
    tags: ["course", "refund", "access", "purchase", "plan", "expiry"],
    body: `# Course access, plans and refunds

## Getting a course
- **Buy it** from the course page. The price shown is final — no extra taxes or fees are added at checkout.
- **Included with your plan** — some courses come with the Go or Plus plan. The course page shows a one-click start; access lasts while your subscription does.
- **Bundles** group several courses at one price.

Every purchase creates an invoice you can open from **Settings → Billing & Usage**.

## Refunds
You can request a refund within **14 days of buying a course**. Email **info@setups.works** with
the email on your account and the course name. Once refunded, access to the course is removed.

## Access that ends
Some courses have an access period. If yours has expired, the course page says so and you can
renew from there. Your certificates stay valid and verifiable.

## Videos won't play?
Reload the page and make sure you're signed in to the account that bought the course. If it still
fails, contact **info@setups.works** with the course and lesson name.`,
  },
  {
    slug: "certificates-and-verification",
    category: "courses",
    title: "Certificates and how to verify them",
    description: "Earn a certificate, share it, and let anyone check it is genuine.",
    tags: ["certificate", "verify", "verification", "code", "share", "pdf"],
    body: `# Certificates and how to verify them

## Earning a certificate
Finish every lesson in a course and a certificate is issued automatically. Find all of yours under
**Learn → Certificates**. Your name and the course title are saved on the certificate when it is
issued, so it stays valid even if either changes later.

## Sharing and saving
Open a certificate and choose **Print / save as PDF**. Each certificate has a unique verification code
like \`SW-7K2M-9QXD-4TNB\` and its own link you can add to your résumé or LinkedIn.

## Verifying a certificate
Anyone — no account needed — can check a certificate:

1. Go to **[Verify certificate](/verify)** (also linked in the site footer).
2. Enter the code printed on the certificate.
3. You'll see the learner's name, the course and the issue date if the code is genuine.

To protect learners, lookups are rate-limited; if you're blocked, wait a minute and try again.

## Something looks wrong?
If your name or course title is misspelled, or a certificate is missing after you finished a course,
email **info@setups.works** with the code or the course name.`,
  },
  {
    slug: "plans-and-pricing",
    category: "billing",
    title: "Plans & pricing",
    description: "What Free, Go and Plus include.",
    tags: ["plans", "pricing", "free", "go", "plus"],
    body: `# Plans & pricing

![Plans and pricing](/docs/pricing.png)

| | Free | Go | Plus |
| :--- | :--- | :--- | :--- |
| AI credits / month | 90 | 600 | Unlimited |
| Problem generation / month | 20 | 50 | Unlimited |
| Unlimited problems & bookmarks | — | ✓ | ✓ |
| Smart Revision, Company Prep, Skill Analytics | — | ✓ | ✓ |
| Mock Interview, Pair Programmer, Contest/Project/Resume AI | — | — | ✓ |

See live pricing and start a trial on the [Pricing](/pricing) page. The exact
feature-to-plan mapping is configurable by the team and always reflected on the
pricing page.`,
  },
  {
    slug: "subscriptions-and-auto-pay",
    category: "billing",
    title: "Subscriptions & auto-pay",
    description: "How recurring billing and cancellation work.",
    tags: ["subscription", "auto-pay", "recurring", "cancel", "checkout"],
    body: `# Subscriptions & auto-pay

1. Choose **Go** or **Plus** on [Pricing](/pricing) → **Subscribe**.
2. On the **checkout page**, confirm your billing details (we prefill them so the
   payment step doesn't re-ask) and apply a [coupon](/help/coupons) if you have one.
3. Pay securely via Razorpay (UPI, cards, netbanking). The subscription **auto-renews**.

To stop renewing, open **Settings → Billing** and **cancel** — you keep access
until the end of the current period.`,
  },
  {
    slug: "coupons",
    category: "billing",
    title: "Coupon codes",
    description: "Apply a discount at checkout.",
    tags: ["coupon", "discount", "promo"],
    body: `# Coupon codes

If you have a coupon, enter it in the **Coupon code** box on the checkout page and
press **Apply**. The order summary updates instantly to show the discount and new
total before you pay.

Coupons may be **percentage** or **flat** discounts, and can have expiry dates,
usage limits or be once-per-user. A 100%-off code activates your plan with no
charge.`,
  },
  {
    slug: "invoices",
    category: "billing",
    title: "Downloading invoices",
    description: "Get a printable invoice for every payment.",
    tags: ["invoice", "receipt", "download", "billing"],
    body: `# Downloading invoices

![Billing & Usage with subscription history](/docs/billing.png)

Every successful payment (including each auto-renewal) creates an invoice.

1. Open **Settings → Billing & Usage**.
2. Find the payment in **Subscription history**.
3. Click **Invoice** to open a printable, branded invoice (use your browser's
   *Print → Save as PDF*). It includes your billing address and our contact,
   **info@setups.works**.`,
  },
  {
    slug: "delete-account",
    category: "billing",
    title: "Cancel or delete your account",
    description: "Stop billing or permanently remove your account.",
    tags: ["cancel", "delete", "account", "data"],
    body: `# Cancel or delete your account

- **Stop auto-renewal:** Settings → Billing → **Cancel**. You keep access until the
  period ends.
- **Delete your account:** Settings → Profile → **Delete account**. Type
  \`DELETE\` to confirm. This permanently removes your account and all your data
  (submissions, notes, bookmarks, progress) and cancels any active subscription.
  This cannot be undone.`,
  },

  // ── FAQ ───────────────────────────────────────────────────
  {
    slug: "faq",
    category: "faq",
    title: "Frequently asked questions",
    description: "Quick answers to the most common questions.",
    tags: ["faq", "help", "questions"],
    body: `# Frequently asked questions

**Is Setups Works Lab free?**
Yes — the core platform is free, including 90 AI credits per month. Paid plans add
more credits and advanced features.

**Which languages are supported?**
12: JavaScript, TypeScript, Python, Java, C, C++, C#, Go, PHP, Rust, Kotlin, Swift.

**Do I need a credit card to start?**
No. You can use the free plan and the 7-day trial on paid plans without a card.

**Why won't the AI Mentor answer my non-coding question?**
By design — the mentor is scoped to coding, DSA and interview-prep topics.

**What happens when I run out of AI credits?**
You'll see a message and an upgrade option. Credits reset monthly.

**How do I get an invoice?**
Settings → Billing & Usage → Subscription history → **Invoice**.

**Can I cancel anytime?**
Yes. Cancelling stops auto-renewal; you keep access until the period ends.

**Still need help?** [Contact us](/contact) at info@setups.works.`,
  },
];

// ── Helpers ─────────────────────────────────────────────────

export function getArticle(slug: string): DocArticle | undefined {
  return DOC_ARTICLES.find((a) => a.slug === slug);
}

export function getCategory(id: DocCategoryId): DocCategory | undefined {
  return DOC_CATEGORIES.find((c) => c.id === id);
}

export function articlesByCategory(id: DocCategoryId): DocArticle[] {
  return DOC_ARTICLES.filter((a) => a.category === id);
}

export interface DocSearchItem {
  slug: string;
  title: string;
  description: string;
  category: DocCategoryId;
  categoryTitle: string;
  tags: string[];
}

/** Lightweight index passed to the client search component. */
export function searchIndex(): DocSearchItem[] {
  return DOC_ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    category: a.category,
    categoryTitle: getCategory(a.category)?.title ?? "",
    tags: a.tags,
  }));
}
