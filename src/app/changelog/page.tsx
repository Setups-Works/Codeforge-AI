import { APP_NAME } from "@/lib/constants";
import { InfoLayout } from "@/components/shared/info-layout";
import { ChangelogView, type Release } from "./changelog-view";

export const metadata = {
  title: `Changelog — ${APP_NAME}`,
  description:
    "What's new in Setups Works Lab — release notes and version history.",
};

const RELEASES: Release[] = [
  {
    version: "3.6.0",
    date: "November 5, 2026",
    tag: "Latest",
    tagColor: "bg-green-500/15 text-green-500 border-green-500/30",
    changes: {
      new: [
        "Courses — a new Learn mode with a course catalogue, video lessons, progress tracking, Continue watching and a My courses page; switch between Practice and Learn from the top bar",
        "Buy a course with Razorpay, get it with your Go or Plus plan when it's included, or save with course bundles — all billing now lives in one place under Settings → Billing & Usage, with invoices for plans and courses",
        "Reviews, a wishlist, private timestamped lesson notes and per-lesson Q&A, plus a verifiable certificate when you finish a course",
        "Coding-problem lessons, quizzes with a pass mark, lessons that unlock in order or over time, XP for learning, and an AI mentor that knows the lesson you're on",
        "Course coupons, referral links (10% off a friend's first course, a reward coupon for you) and unlock notifications for scheduled lessons",
        "Admin course studio — curriculum builder, Google Drive video links, bundles, order refunds and analytics with a lesson-by-lesson completion funnel",
        "Course endpoints added to the public API reference",
      ],
      improved: [
        "Public course pages for search engines, with rich course details, ratings and a sitemap entry for every published course",
        "Richer structured data across the site: questions, pricing, docs, blog and the compiler",
        "Invoices now escape names and addresses, and the Billing page lists coupons you've used",
      ],
      fixed: [],
    },
  },
  {
    version: "3.5.0",
    date: "November 2, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "CodeForge AI is now Setups Works Lab — a new name, a new wordmark and a new home at labs.setups.works",
      ],
      improved: [
        "Emails, invoices, the status page, the API docs and every page's search and sharing details now carry the Setups Works Lab name and address",
        "Support and contact emails now go to info@setups.works",
      ],
      fixed: [],
    },
  },
  {
    version: "3.4.0",
    date: "October 30, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [],
      improved: [
        "AI mentor, question generation and discussion summaries now run on open-source models (OpenAI gpt-oss) for faster, more reliable responses",
        "Safer checkout — the payment window asks before closing so a stray click can't drop a payment, offers retries after a failed attempt, expires abandoned sessions after 15 minutes and remembers returning customers",
      ],
      fixed: [
        "AI features returned a “model not found” error after a model was retired — they now use a currently available model",
      ],
    },
  },
  {
    version: "3.3.0",
    date: "July 20, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Video tutorials in every problem's Editorial tab — a custom player with the language switcher built in: Tamil first, plus English, Hindi, Telugu, Kannada, Bengali, Spanish and Portuguese",
        "Tutorial playlist — the best video loads front and centre with a tap-to-play poster; switch videos from the playlist or reveal more with one tap",
      ],
      improved: [
        "Editorial tab pairs the written editorial with videos — and problems you generate with AI get the same tutorials automatically",
        "Privacy-enhanced playback (youtube-nocookie) that only loads YouTube when you press play, with heavy caching so the tab stays fast",
      ],
      fixed: [],
    },
  },
  {
    version: "3.2.0",
    date: "July 17, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Design Guidelines at /design-guidelines — the full brand system (logo, typography, color, illustration, motion, live component demos and voice) with click-to-copy color swatches",
        "Brand assets — download official wordmarks and icons individually, as a one-page bento poster, or as a complete .zip kit with usage notes",
        "Google One Tap sign-in — one tap in the corner logs you in with Google anywhere on the site, and returning users are signed back in automatically",
        "A redesigned multi-step checkout — billing details, a clear review screen with the exact auto-pay terms, live payment verification and an animated receipt with your payment reference",
        "Live System Status page at /status — real health checks for the website, database, auth, code execution, AI mentor, cache, storage, payments and email, plus every feature and AI tool, with 30-day uptime bars and auto-refresh",
        "Join offer page at /join — claim a full month of Go free with auto-pay: ₹1 refundable authorisation today, ₹0 for 30 days, cancel anytime; sign up and checkout on one page",
        "Admin Live Insights — realtime PostHog analytics in the admin panel: active users, sessions, pageview trends, top pages/events, referrers, countries, browsers and devices",
        "Admin Key Metrics — growth (DAU/WAU/MAU), retention, learning and business KPIs at a glance",
      ],
      improved: [
        "Much stronger SEO — per-content-type XML sitemaps (problems, blog, forum, help, careers) that update automatically, IndexNow pings on new content, rich structured data on problems and forum threads, and a smarter llms.txt for AI assistants",
        "/join now matches the homepage — same header, footer and stacked-cards feature walkthrough, full width on mobile and desktop",
        "Signing up from /join goes straight to checkout, then into onboarding after payment — the offer is never lost along the way",
        "Admin User Details got a full upgrade — quick actions (open profile, email, copy ID), flexible plan grants (Go/Plus for 7 days to lifetime), trial extend/reset controls, and a campaign badge showing who joined through an offer link",
      ],
      fixed: [
        "Sitemaps previously redirected crawlers to the login page, making Google report “Sitemap is HTML” — they now serve pure XML",
        "Brand-new accounts were bounced to onboarding before they could finish paying — checkout now completes first",
      ],
    },
  },
  {
    version: "3.1.0",
    date: "July 13, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Make your profile yours — upload a custom avatar and cover photo, with a live safe-zone guide so nothing important gets cropped, both shown on your public profile",
      ],
      improved: [
        "A completely reorganized Settings with seven focused tabs — Profile, Account, Security, Appearance, Editor, Notifications and Billing",
        "New Account controls — see your linked sign-in methods and change or set your password",
        "Pick your theme — Light, Dark or System — from Settings → Appearance",
        "Manage email preferences — opt in or out of product updates and the newsletter (account and billing emails always send)",
        "Refreshed dashboard and public profile with consistent brand accents and subtle hover polish",
        "Settings is now fully mobile-friendly — the section tabs stick to the top and scroll smoothly so you can switch tabs from anywhere on the page",
        "Redesigned the offline screen to match the app, with a live connection status that reloads automatically the moment you're back online",
      ],
      fixed: [
        "Fixed a crash that showed “Something went wrong” when opening Settings",
        "Profile edits now save reliably — a leftover write from the Supabase migration was persisting to the old database",
        "Cover and avatar uploads no longer fail on larger images",
      ],
    },
  },
  {
    version: "3.0.0",
    date: "July 13, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Passwordless sign-in with passkeys — add a passkey in Settings, then sign in with Face ID, Touch ID, Windows Hello or a security key. Nothing to type or remember, and it's phishing-resistant by design",
      ],
      improved: [
        "We rebuilt the entire backend on Supabase for a faster, more reliable platform — your problems, submissions, progress, badges, notes, bookmarks and billing all moved across with nothing lost",
        "A fresh, modern sign-in and sign-up experience — a clean split-screen design that looks great in both light and dark mode",
        "As part of the upgrade you'll be asked to sign in once more; your account, data and plan are exactly as you left them",
      ],
      fixed: [
        "Forgot-password now works end to end — the reset link reliably opens the ‘set a new password’ screen instead of erroring out",
      ],
    },
  },
  {
    version: "2.5.3",
    date: "July 12, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [],
      improved: [
        "Added invisible bot protection (reCAPTCHA v3) to the sign-up and feedback forms — no puzzles or checkboxes for you, just fewer spam accounts and messages",
      ],
      fixed: [],
    },
  },
  {
    version: "2.5.2",
    date: "July 12, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [],
      improved: [
        "The code visualizer now covers string and markup problems too — strings animate character by character, and HTML/JSX renders as an element tree",
      ],
      fixed: [],
    },
  },
  {
    version: "2.5.1",
    date: "July 12, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [],
      improved: [
        "The code visualizer now animates far more than arrays — grids and matrices, linked lists, and graphs and trees, each with colour-coded states (comparing, swapping, visited, done) and a legend, so almost any problem type comes to life",
      ],
      fixed: [],
    },
  },
  {
    version: "2.5.0",
    date: "July 12, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Watch your code run — a new Visualize tab on every problem animates your solution step by step after you run it. If your code is correct, you see how it works; if it's wrong, it highlights exactly where it breaks and explains why",
      ],
      improved: [
        "The landing page now showcases the visualizer in the workflow stack and features grid",
      ],
      fixed: [],
    },
  },
  {
    version: "2.4.0",
    date: "July 11, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Newsletter broadcasts from the admin panel — compose a rich email with formatting, an image and a call-to-action button, let AI write the first draft from a one-line prompt, then send it to every subscriber or a single address. One-click unsubscribe is built into every email",
      ],
      improved: [
        "You now get a clear, branded email at every billing moment — when your free trial starts, when a payment or renewal goes through, if a charge fails, and when you cancel",
      ],
      fixed: [],
    },
  },
  {
    version: "2.3.1",
    date: "July 11, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "7-day free trial with auto-pay — start any paid plan free for a week from the landing page, pricing, or onboarding. Your card is saved securely via Razorpay and the first charge only happens when the trial ends; cancel anytime before then and you pay nothing",
      ],
      improved: [
        "The landing code playground is now screen-reader accessible — every control has a clear label and program output is announced aloud as it runs",
        "Strengthened reliability behind the scenes with new automated tests around payments, coupon discounts and other security-sensitive logic",
      ],
      fixed: [
        "Structured-data (SEO) markup on the blog, careers and landing pages is now safely escaped, closing a content-injection gap",
        "Vercel Speed Insights and Google ad units were being blocked by our security policy — they now load correctly",
      ],
    },
  },
  {
    version: "2.3.0",
    date: "July 4, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Compiler Web mode — run HTML/CSS/JS with a live preview, build React with npm packages you add on the fly, and spin up Next.js on an in-browser Node runtime with a file explorer and a terminal streaming the dev-server output. Toggle between Language and Web at the top of /compiler",
        "A completely redesigned landing page — floating glass navbar, animated aurora and particle backgrounds, animated headlines, a magic bento feature grid, stacking workflow cards, glass stat bars, marquees and magnetic buttons — in full light and dark themes, tuned for mobile",
        "Smoother onboarding — springier step transitions and staggered, animated option cards throughout the setup wizard",
      ],
      improved: [
        "Landing headings, cards and grids now align consistently across every screen size",
      ],
      fixed: [
        "Frontend challenges and the compiler Web mode could show 'Couldn't connect to server' — the sandbox runtime was blocked by our security policy and is now allowed",
        "The compiler page no longer flashes a hydration error when your saved editor settings differ from the defaults",
      ],
    },
  },
  {
    version: "2.2.0",
    date: "June 28, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Careers at /careers — three open roles with detail pages and an application form; apply with your résumé (PDF/DOC), LinkedIn, GitHub, portfolio and experience. Applications appear in the admin panel with a full detail view, and every applicant gets a confirmation email",
        "QA Program at /qa — sign-in members apply to become QA contributors, then report and track bugs with structured details (severity, steps, expected vs actual, environment). Admins approve contributors and triage each bug through a workflow (new → triaged → in progress → fixed) from the admin panel",
        "API Reference with Swagger UI at /api-docs — interactive, try-it-out documentation of the public API, backed by an OpenAPI 3 spec served at /api/openapi",
      ],
      improved: [
        "Much faster homepage — the landing now renders statically from the edge, cutting time-to-first-byte and load time; ads and analytics load only after the page is interactive",
        "Snappier navigation — public pages show an instant loading skeleton instead of waiting on the server",
        "Footer links wrap neatly onto two lines on mobile",
      ],
      fixed: [
        "Résumé uploads now work reliably in Brave and behind ad-blockers — files upload through our own domain instead of a third-party host, so cross-origin blockers can't interrupt them",
      ],
    },
  },
  {
    version: "2.1.0",
    date: "June 26, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Documentation Center at /help — a searchable knowledge base with guides, tutorials, API examples, SDK usage and FAQs across 7 categories, with real product screenshots in each article",
        "Blog at /blog — admins upload a feature screenshot and AI writes the title, description, tags, SEO and full post body; the screenshot becomes the cover",
        "About Us and Contact Us pages with company and support details",
        "llms.txt — a machine-readable site guide for AI agents and crawlers",
      ],
      improved: [
        "Docs and Blog added to the header and footer navigation across the site",
        "Sitemap now includes the docs, blog posts and every published problem (including ones users generate)",
        "Cleaner footer layout — links wrap and align neatly on every screen size",
      ],
      fixed: [
        "Razorpay checkout no longer asks for your number/email twice — the custom checkout page prefills everything",
      ],
    },
  },
  {
    version: "2.0.0",
    date: "June 25, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Subscriptions with auto-pay — upgrade to Go or Plus with recurring Razorpay billing that renews automatically; cancel anytime to stop at period end",
        "Custom checkout page — enter your billing details once; payment opens straight to UPI apps, cards and netbanking without re-asking for your number or email",
        "Coupon codes — apply a discount code at checkout; admins can create percent or flat coupons with limits, expiry and per-user rules",
        "Plan-based feature access — Smart Revision, Company Prep, Skill Analytics and the Mock Interview simulator are now part of paid plans, with a clear upgrade screen when locked",
        "Monthly limits per plan — AI credits and AI problem generation (Free 20, Go 50, Plus unlimited) are metered fairly",
        "About Us and Contact Us pages with company and support details",
        "Show/hide password toggle on sign-in and sign-up",
        "Delete account — remove your account and all your data from Settings; admins can also delete a user from the panel",
      ],
      improved: [
        "AI Mentor now stays on topic — it only answers coding, DSA and interview-prep questions and politely declines anything off-topic",
        "Pricing reimagined around monthly AI credits, and the feature list now reflects exactly what each plan unlocks (admin-controlled)",
        "Admin dashboard — real revenue analytics plus new Billing & Usage, Coupons and Feature Access managers",
        "Invoices now include your billing address and Setups Works branding; support is info@setups.works",
        "Faster pages — analytics load lazily after first paint and sign-in/up ship ~68 kB less JavaScript",
        "Hardened payment security — constant-time signature checks, webhook verification with replay protection, request-size limits and login throttling",
      ],
      fixed: [
        "Razorpay checkout was blocked by the Content-Security-Policy — its script and iframe are now allowed (we still can't be framed)",
        "Pricing cards no longer repeat the plan name and price",
      ],
    },
  },
  {
    version: "1.8.0",
    date: "June 24, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "AI credit metering — every AI tool now counts against a monthly allowance based on your plan, with a clear 'out of credits' message when you hit the limit",
        "Billing & Usage in Settings — see AI credits used, remaining credits and your monthly limit at a glance, with a progress bar and a 'running low' warning",
        "Subscription history — a full record of your past payments, each with a downloadable, printable invoice (Setups Works Lab branded)",
        "Upgrade prompt right where it matters — free-plan users get a one-tap upgrade CTA on the credits card",
      ],
      improved: [
        "Completely redesigned Settings — a sidebar menu (Profile, Preferences, Billing & Usage) replaces the long single-column page, so each area has its own focused space",
        "Unlimited-plan members now see an 'Unlimited' credits state instead of an empty meter",
      ],
      fixed: [
        "Subscription model wasn't exported from the model barrel, which could break populate() on billing queries",
      ],
    },
  },
  {
    version: "1.7.0",
    date: "June 23, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Setups Works Lab now lives on its own domain — labs.setups.works",
        "Sharper SEO — richer structured data (Organization, web-app and FAQ schema) plus a canonical sitemap for better search visibility",
        "Google Analytics and LangSmith AI tracing for product and AI observability",
      ],
      improved: [
        "Refreshed logo across the whole app — the new fire wordmark on every page",
        "Better dark mode — lifted surface contrast so cards, the dashboard and sidebars stand out instead of blending into a flat black",
        "Feedback now arrives straight to our inbox by email, with a simpler form",
      ],
      fixed: [
        "Sitemap pointed at the preview deployment URL, which Google Search Console rejected — it now uses labs.setups.works",
        "Landing hero heading and CTA now match across the marketing pages and tests",
      ],
    },
  },
  {
    version: "1.6.0",
    date: "June 23, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Community hub at /community — one place for the forum, discussions and leaderboard, with live member & discussion counts, recent threads and a top-members list",
        "Horizontal feature slider on the landing page — swipe or click-and-drag through highlights, with a live social-share-card preview embedded in the bento",
        "Mobile bottom navigation — Dashboard, Problems, Challenges, Compiler and a More menu (Roadmaps, Contests) for quick thumb access",
      ],
      improved: [
        "Mobile-friendly landing page — eliminated horizontal overflow from 320px up, full-width hero CTAs, a more compact hero, and tighter section spacing on phones",
        "Redesigned changelog to match the brand theme — card-based releases, blue accent, and clearer New / Improved / Fixed sections",
        "Hidden the scrollbar on the feature slider for a cleaner look",
        "Leaderboard now uses a medal icon to make room for the new Community entry",
      ],
      fixed: [
        "Mobile More menu opening in the top-left corner instead of above the nav bar (invalid CSS calc dropped the positioning)",
        "Hero content getting clipped on narrow phones because the grid column didn't shrink to the viewport",
      ],
    },
  },
  {
    version: "1.5.0",
    date: "June 23, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Online Compiler — a standalone, blank-canvas editor at /compiler that runs code in any of 12 languages with custom stdin, real stdout/stderr and runtime + memory stats. No problem or test cases required",
        "Compiler is now in the main navigation and surfaced across the landing page (hero, a dedicated feature highlight with a live run preview, and the FAQ)",
      ],
      improved: [
        "New fire app icon — refreshed favicon, PWA icons (192/512 + maskable) and Apple touch icon on the brand-blue mark",
        "Refreshed social share cards — Open Graph and Twitter images now use the new icon and lead with the instant compiler",
        "Landing language strip now shows real brand logos (JavaScript, TypeScript, Python, Java, C, C++, C#, Go, PHP, Rust, Kotlin, Swift) instead of two-letter abbreviations",
        "Project-wide icon system migrated to Font Awesome for a consistent, crisp icon set across every page",
      ],
      fixed: [],
    },
  },
  {
    version: "1.4.0",
    date: "June 22, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Brand-new landing page — layered product mockups, animated accent cards, a bento feature grid with live UI previews, and an AI chat preview",
        "Light / dark theme toggle now everywhere the new design reaches",
      ],
      improved: [
        "Full visual redesign on the Geist design system — neutral surfaces, blue focus rings, refined typography, tighter radii, and consistent spacing across every page",
        "New blue app icon, favicon and PWA icons replacing the orange mark",
        "Cleaner auth screens and a redesigned beta/join page",
      ],
      fixed: [
        "Removed every leftover orange accent across the app in favor of the new blue/amber palette",
      ],
    },
  },
  {
    version: "1.3.0",
    date: "June 21, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Installable app (PWA) — add Setups Works Lab to your desktop or mobile home screen, with app icons and an offline fallback page",
        "PostHog product analytics — pageviews, events, and session insights",
        "PostHog error tracking — client and server-side exceptions are captured automatically",
        "PostHog server-side logs via OpenTelemetry",
        "Vercel Speed Insights — real-user performance metrics",
        "Light / dark theme toggle in the landing page header",
      ],
      improved: [
        "Much faster landing page — the hero now paints immediately instead of waiting for animations to load, fixing slow First/Largest Contentful Paint",
        "Hardened Content-Security-Policy to safely allow analytics, the Monaco editor CDN, and session replay",
      ],
      fixed: [
        "Code editor (Monaco) failing to load in production due to a Content-Security-Policy block",
        "Google Analytics and Microsoft Clarity beacons blocked by Content-Security-Policy",
      ],
    },
  },
  {
    version: "1.2.0",
    date: "June 18, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "GitHub authentication — sign in with your GitHub account; the button appears automatically once OAuth is configured",
        "Feedback now opens a GitHub issue — submissions from /feedback create a labelled issue in the repository, with email kept as a fallback",
      ],
      improved: [],
      fixed: [],
    },
  },
  {
    version: "1.1.1",
    date: "June 18, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [],
      improved: [
        "Forgot-password now fails gracefully — if the email can't be sent it returns a clear message and logs the real reason instead of an opaque 500 error",
        "Site URL for SEO, robots.txt, and sitemap.xml now resolves correctly in production instead of pointing at localhost",
        "Rewrote the README with a modern layout, the full feature set, the Setups Works logo, and a release history",
      ],
      fixed: [
        "Production build no longer crashes while prerendering /robots.txt and /sitemap.xml when the database is unreachable — both routes now render dynamically at request time",
        "Site config loading is resilient to a missing database connection and falls back to environment configuration",
      ],
    },
  },
  {
    version: "1.1.0",
    date: "June 17, 2026",
    tag: "Stable",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Admin Settings panel — configure SEO, Analytics, Email, AI, Code Runner, Database, Cache, OAuth, and Payments from the UI without touching .env files",
        "Google Analytics (GA4) integration — Measurement ID configurable from admin",
        "Microsoft Clarity integration — project ID configurable from admin",
        "Google Search Console verification meta tag — set verification code from admin",
        "Feedback page at /feedback — users can submit Feature Requests, Bug Reports, and Issues; emails delivered to info@setups.works",
        "Shared header + footer across all info pages (Terms, Privacy, Changelog, Feedback)",
        "GitHub repository link in footer, replacing X and YouTube icons",
        "Sitemap at /sitemap.xml — auto-generated with all static routes + every problem slug",
        "Robots.txt at /robots.txt — blocks admin/dashboard/API from indexing",
      ],
      improved: [
        "Advanced SEO: full Open Graph, Twitter Card, canonical URL, robots directives, and JSON-LD structured data (WebSite + Organization schema) on every page",
        "SEO metadata now reads from Admin Settings DB with env var fallback — change site name, description, keywords, OG image without a redeploy",
        "Test Connection buttons in admin for every service: SMTP (sends real email), Groq, MongoDB, Redis, Judge0, Piston, Paiza, Razorpay",
        "Footer Legal column now includes Feedback link",
      ],
      fixed: [
        "Build errors: unused lucide imports, unescaped JSX entities in Terms/Privacy pages",
        "Login Internal Server Error — rememberMe field caused NextAuth authorize() to always fail when schema required boolean",
        "Zod v4 literal errorMap renamed to message",
      ],
    },
  },
  {
    version: "1.0.1",
    date: "June 17, 2026",
    tag: "Security",
    tagColor: "bg-red-500/15 text-red-500 border-red-500/30",
    changes: {
      new: [],
      improved: [
        "Content-Security-Policy header added — restricts script/style/img/connect sources, blocks frame-ancestors, disallows object-src hijacking",
        "Strict-Transport-Security (HSTS) — 2-year max-age with includeSubDomains and preload",
        "X-Frame-Options upgraded to DENY (was SAMEORIGIN)",
        "Auth cookies: explicit httpOnly, secure, sameSite=lax; __Secure-/__Host- prefixes in production",
        "JWT session lifetime reduced from 30 days to 7 days",
        "CORS origin guard on all mutating API requests (POST/PUT/PATCH/DELETE)",
        "NoSQL regex injection fix: all $regex search queries now escape metacharacters",
        "Server-side user content sanitization: null bytes, javascript: URIs, inline event handlers stripped before DB write",
        "Password strength rule added: must contain uppercase, number, or symbol",
        "Cache-Control: no-store on /api/auth/* responses",
      ],
      fixed: [],
    },
  },
  {
    version: "1.0.0",
    date: "June 17, 2026",
    tag: "Launch",
    tagColor: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    changes: {
      new: [
        "Launched Setups Works Lab — AI-powered coding interview prep platform",
        "VS Code-style Monaco editor with full 12-language support: JavaScript, TypeScript, Python, Java, C, C++, C#, Go, PHP, Rust, Kotlin, Swift",
        "AI Mentor with progressive hints and complexity analysis",
        "AI Pair Programmer with real-time streaming suggestions",
        "AI Learning Coach with personalised study plans",
        "Spaced repetition (SM-2 algorithm) for problem reviews",
        "Skill analytics with mastery map and weakness detection",
        "Daily streaks, XP, badges, and leaderboard",
        "Weekly contests and daily challenges",
        "Company-specific question sets (Google, Meta, Amazon, Microsoft, Netflix, Uber)",
        "Community forum and discussion threads",
        "Frontend sandbox challenges with AI design review",
        "Roadmaps and study plans",
        "Google and GitHub OAuth sign-in",
        "Forgot password / reset password flow with branded email",
        "Fully responsive landing page with dark and light mode",
        "Terms & Conditions, Privacy Policy, and Changelog pages",
        "Terms & Privacy checkbox on sign-up form",
        "Remember me (30 days) checkbox on sign-in form",
        "Version badge and Legal footer column",
      ],
      improved: [
        "Code editor now shows all 12 languages regardless of per-question starter code — falls back to language default snippet",
        "Smooth 900 ms anchor navigation on landing page",
        "Landing page initial load faster — heavy components lazy-loaded",
      ],
      fixed: [],
    },
  },
  {
    version: "0.9.0",
    date: "June 10, 2026",
    tag: "Beta",
    tagColor: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    changes: {
      new: [
        "Beta launch with core problem-solving features",
        "JavaScript and Python code execution via secure sandbox",
        "Basic user profiles and submission history",
        "Initial AI hint integration",
      ],
      improved: [],
      fixed: [
        "Fixed session handling for OAuth sign-in edge cases",
        "Resolved code editor layout on mobile viewports",
      ],
    },
  },
  {
    version: "0.5.0",
    date: "June 10, 2026",
    tag: "Alpha",
    tagColor: "bg-purple-500/15 text-purple-500 border-purple-500/30",
    changes: {
      new: [
        "Private alpha release to early testers",
        "Core problem listing and detail pages",
        "Email + password authentication",
        "Basic code submission and verdict display",
      ],
      improved: [],
      fixed: [],
    },
  },
];

export default function ChangelogPage() {
  return (
    <InfoLayout>
      <ChangelogView releases={RELEASES} />
    </InfoLayout>
  );
}
