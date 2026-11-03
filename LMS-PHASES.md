# LMS — Phased Delivery

Companion to [LMS-IMPLEMENTATION.md](LMS-IMPLEMENTATION.md) (design, data model,
decisions). We build **one phase at a time**; each phase ships behind
`LMS_ENABLED` and ends in something demoable. Status is updated here as we go.

| Phase | Theme | Outcome | State |
|---|---|---|---|
| 0 | Decisions & foundation | Flag + schema + video abstraction + access rules | ✅ done |
| 1 | Admin course CMS | Admin can create, structure and publish a course | 🟡 built, UI not yet clicked through |
| 2 | Learn mode shell | Toggle, LMS sidebar, catalogue, product detail | ⬜ |
| 3 | Player & progress | Watch lessons, continue watching, resume | ⬜ |
| 4 | Purchase & entitlement | Buy a course with Razorpay, get access | ⬜ |
| 5 | Unified billing | One Billing & Usage ledger in Settings | ⬜ |
| 6 | Public SEO pages | `/courses` indexed with rich schema | ⬜ |
| 7 | Engagement | Reviews, Q&A, notes, certificates | ⬜ |
| 8 | Practice integration | Problem lessons, quizzes, AI mentor, XP | ⬜ |
| 9 | Growth & commerce | Course coupons, bundles, referrals, emails | ⬜ |
| 10 | Analytics & hardening | Admin analytics, refunds, GST, video host upgrade, tests | ⬜ |

---

## Phase 0 — Decisions & foundation
**Goal:** remove ambiguity and lay rails everything else sits on.

- Answer the six assumptions in IMPLEMENTATION §11.
- `NEXT_PUBLIC_LMS_ENABLED` flag + `lmsEnabled()` helper (`src/lib/lms/flag.ts`). Nav/route gating that uses it lands with the UI in Phases 1–2.
- Migration `0015_lms.sql`: `courses`, `course_sections`, `course_lessons`,
  `course_enrollments`, `lesson_progress` (other tables arrive with their phase).
- `lib/lms/video.ts`: `VideoProvider` interface + **Drive** provider
  (`parseDriveLink`, `toEmbedUrl`), unit-tested against all Drive URL shapes.
- `canAccessLesson` skeleton + tests.

**Done when:** migration applied, Drive parser and access rules have passing tests.

**Delivered:** `src/lib/lms/{flag,video,access}.ts`, `supabase/migrations/0015_lms.sql`,
`tests/unit/lms-{video,access}.test.ts` (29 tests passing; typecheck and lint clean).
The six open questions are still unanswered; Phase 0 code does not depend on them
(they affect Phases 4, 5 and 9). **Applied:** `0015_lms.sql` is live on the Supabase project (5 tables, RLS on).

## Phase 1 — Admin course CMS
**Goal:** admin-only authoring.

- `/admin/courses` list + `/admin/courses/[id]` editor; add "Courses" to
  `admin-nav.tsx`.
- Course form: title, slug (auto), description (md), thumbnail upload via
  `uploadPublicFile`, level/category/tags, price/compare-at/free, outcomes,
  requirements, SEO fields.
- Curriculum builder: sections and lessons, drag-reorder, **paste Drive link →
  validated and stored as file id**, duration, free-preview toggle, text lessons.
- Bulk import: paste many Drive links → lessons created in order.
- Draft / publish / archive; `/api/admin/courses/**` with `requireAdmin`.

**Done when:** an admin builds and publishes a course end to end; a non-admin gets
403/404 on every admin route.

**Delivered:** `src/services/lms-courses.ts`, `src/schemas/course.ts`,
`/api/admin/courses/**` (CRUD, sections, lessons, bulk import `PUT …/lessons`, reorder,
thumbnail upload), `/admin/courses` list + editor (`courses-manager.tsx`,
`course-editor.tsx`), admin-nav entry (only when `NEXT_PUBLIC_LMS_ENABLED=true`).
Verified: 40 unit tests; a throwaway-course run of the whole service flow against the
live Supabase DB (create → sections → lessons → bulk → reorder → publish rules → slug
conflict → delete); unauthenticated requests get 401 / login redirect.
**Not yet verified:** clicking through the editor as a logged-in admin.
Reordering uses up/down buttons (no drag-and-drop library in the codebase).

## Phase 2 — Learn mode shell
**Goal:** the experience users see before they pay.

- Mode switch in `Topbar` + mobile "More"; mode derived from URL, cookie remembers
  last mode; "Go learn" card on `/dashboard`.
- `LEARN_NAV_ITEMS` and `SidebarNav` mode support; mobile bottom nav variant.
- `/learn` home (placeholder widgets), `/learn/courses` catalogue (search,
  category/level/price filters), `/learn/courses/[slug]` product detail
  (curriculum, outcomes, instructor, preview lesson, price + Buy button wired in
  Phase 4).
- `GET /api/courses[/slug]` returning published courses only, never video refs.

**Done when:** a user toggles into Learn mode, browses, and opens a course page;
toggling back restores the Practice sidebar.

## Phase 3 — Player & progress
**Goal:** watching works and remembers where you were.

- `/learn/watch/[courseSlug]/[lessonId]`: Drive iframe player, curriculum rail,
  prev/next, "Mark complete", auto-advance prompt.
- `GET /api/learn/lessons/[id]/play` — entitlement check, returns embed descriptor.
- `lesson_progress` upsert; course progress %; **Continue watching** rail on
  `/learn` and the dashboard; `/learn/my-courses`.
- Free-preview lessons playable without enrolment; admin can watch everything.
- Overlay over the Drive pop-out control; clear message when Drive throttles.

**Done when:** an enrolled user (granted manually by admin for now) watches,
completes lessons, leaves, and resumes from Continue watching.

## Phase 4 — Purchase & entitlement
**Goal:** money in, access out.

- `course_orders`; `POST …/checkout` (server-priced Razorpay order),
  `POST …/verify` (signature), enrolment + receipt email.
- Free course / 100% coupon direct enrolment.
- Webhook extension for `payment.captured` with `notes.type="course"`,
  idempotent via `webhook_events`.
- Buy button, checkout popup, success page that drops into the first lesson.
- Admin: manual access grant/revoke, orders list.

**Done when:** a Razorpay **test-mode** purchase grants access exactly once, even
if both the browser callback and the webhook fire; failed/abandoned orders grant
nothing.

## Phase 5 — Unified billing
**Goal:** every rupee visible in one place.

- `getBillingLedger(userId)` merging subscriptions and course orders into one row
  shape.
- Settings → Billing & Usage restructured: Plan · Orders & payments · My
  purchases · Coupons · Usage. Invoice download for course orders.
- LMS sidebar "Billing & orders" and `/pricing` deep-link to `#billing`.

**Done when:** a user with a plan and two courses sees all three in one table with
working invoices, and no other billing page exists.

## Phase 6 — Public SEO pages
**Goal:** the catalogue earns organic traffic.

- Public `/courses` and `/courses/[slug]` (server-rendered), added to middleware
  public prefixes and the sitemap.
- `lib/seo.ts`: `courseGraph` (`Course` + `Product`/`Offer`, `ItemList`,
  breadcrumbs, `VideoObject` for the preview only — never private ids),
  per-course keywords, OG images.
- `AggregateRating` only when real reviews exist (after Phase 7).

**Done when:** pages validate in Rich Results Test and appear in `sitemap.xml`.

## Phase 7 — Engagement
**Goal:** social proof and retention.

- Ratings/reviews (verified buyers), moderation in admin.
- Lesson Q&A on top of `discussions`; timestamped lesson notes.
- Wishlist; certificates on completion with public `/certificate/[code]` verify
  page and PDF.

**Done when:** a finisher receives a verifiable certificate; reviews update the
course rating counters.

## Phase 8 — Practice integration (our differentiator)
**Goal:** courses that connect to the coding platform.

- `problem` lessons that embed the workspace; completion on accepted submission.
- Quiz lessons (MCQ) with pass mark; unlock rules.
- AI mentor receives lesson context; AI summary/quiz generation from a transcript.
- XP, streaks and leaderboard credit for learning; notes → spaced-repetition cards.

**Done when:** a course can mix video, quiz and coding lessons and gate progress
on them.

## Phase 9 — Growth & commerce
**Goal:** convert and retain.

- Coupons scoped to courses; bundles; "included in Plus" access source.
- Referral/affiliate links with attribution; abandoned-checkout and drip emails;
  drip-released lessons.

**Done when:** a bundle and a referral purchase complete with correct pricing and
attribution.

## Phase 10 — Analytics & hardening
**Goal:** production-grade.

- Admin analytics: revenue, enrolments, completion and drop-off per lesson.
- Refund flow + access revocation; GST invoice fields.
- **Video host upgrade** (Bunny/Cloudflare/Mux) behind the provider interface,
  adding real watch-time events and signed URLs if Drive limits bite.
- Playwright E2E (browse → buy → watch), load/quota checks, rate limits,
  security review, accessibility pass.

**Done when:** E2E green in CI, refunds verified in test mode, host-upgrade path
proven with one course.

---

## Working agreement
- **No hardcoding.** Course content, prices, currency, labels that vary, limits and
  URLs come from the database, site config (`getEffectiveConfig`) or `lib/constants`
  — never literals in components. Nav entries live in `nav-items.ts` as data.
- **Reuse this codebase's components only** — `components/ui/*`, `components/shared/*`,
  the admin `*-manager` patterns, `PublicHeader`, `Markdown`, `uploadPublicFile`,
  `JsonLd`/`lib/seo.ts`, `lib/mailer.ts`. No new UI libraries; build new components
  from these primitives only when nothing existing fits.
- One phase per branch/PR; each ends with typecheck, lint, tests, and a manual
  demo of its "Done when".
- Update the status table above when a phase merges.
- Don't start a phase until the previous one's exit criteria hold.
