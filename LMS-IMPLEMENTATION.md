# LMS — Implementation Plan

Sell video courses to every user on Setups Works Lab. **Only admins create and
manage courses**; everyone else browses, buys and watches. The LMS lives inside
the existing app (same auth, same Razorpay, same sidebar shell) rather than as a
separate product. Delivery order is in [LMS-PHASES.md](LMS-PHASES.md).

## 1. Goals

| # | Requirement | Where it lands |
|---|---|---|
| 1 | Admin-only course authoring | `/admin/courses` (existing admin shell, `role === "admin"`) |
| 2 | Dashboard toggle to switch into **Learn** mode | Mode switch in the topbar + dashboard |
| 3 | Course listing, continue watching, product detail, buy | `/learn/*` (signed-in) and `/courses/*` (public, SEO) |
| 4 | Full LMS sidebar | Second nav set swapped in when Learn mode is on |
| 5 | **All billing in one place** | Settings → Billing & Usage becomes the single ledger |
| 6 | Videos from **Google Drive links** | `VideoProvider` abstraction, Drive first (see §6) |
| 7 | Advanced features | §9 |

## 2. How it fits the current codebase

Findings that shape the design:

- **Shell**: `(platform)/layout.tsx` renders `AppSidebar` (`SidebarNav` reading
  `NAV_ITEMS` from `components/layout/nav-items.ts`) + `Topbar` + mobile bottom
  nav. Learn mode reuses this shell and swaps the nav items.
- **Roles**: `session.user.role === "admin"` already gates `/admin` and
  `requireAdmin`-style API routes. No new role is needed for v1.
- **Payments**: Razorpay is wired for *subscriptions* (`/api/subscription/*`,
  `lib/razorpay.ts`, `services/billing-activate.ts`, signed webhook at
  `/api/subscription/webhook`, invoices at `/api/billing/invoice/[id]`). Courses
  are **one-time orders**, so they reuse `razorpay.orders.create` and
  `verifyCheckoutSignature`, with a new `course_orders` table.
- **Billing UI** today: `features/subscription/billing-panel.tsx` +
  `usage-panel.tsx`, rendered under Settings → "Billing & Usage". We extend this
  rather than adding a second billing page.
- **Coupons**: `lib/coupons.ts` / `coupons` tables exist — extend for courses.
- **Data layer is mid-migration** (Mongo → Supabase, see `MIGRATION.md`). New
  LMS tables are **Supabase-only** (migration `0015_lms.sql`), accessed via
  `supabaseAdmin()` in new `services/lms-*.ts` files. No new Mongoose models.
  - ⚠️ `users.id` is still a Mongo ObjectId for live accounts, so LMS tables
    store `user_id text` (not a `uuid` FK) until the users backfill lands. A
    later migration can convert it. This is the same constraint `toUuidOrNull`
    documents in `lib/data-backend.ts`.
- **Reusable**: `lib/storage.ts` (thumbnails/covers), `lib/mailer.ts` +
  `email-templates.ts`, `services/gamification` (XP/streaks), `discussions`
  (lesson Q&A), `notes-store` (lesson notes), AI mentor (`features/ai-mentor`),
  `lib/seo.ts` + `JsonLd` (course/product/video schema), `sitemap-entries.ts`.

## 3. Information architecture

### Routes

| Route | Access | Purpose |
|---|---|---|
| `/courses` | public | SEO catalogue (filters, search) |
| `/courses/[slug]` | public | Product detail: curriculum, preview lesson, reviews, **Buy** |
| `/learn` | signed-in | Learn dashboard: continue watching, recommended, stats |
| `/learn/courses` | signed-in | Catalogue inside the app shell |
| `/learn/courses/[slug]` | signed-in | Same detail view, in-shell |
| `/learn/watch/[courseSlug]/[lessonId]` | entitled | Player + curriculum rail + notes/Q&A |
| `/learn/my-courses` | signed-in | Purchased / in-progress / completed |
| `/learn/wishlist` | signed-in | Saved courses |
| `/learn/certificates` | signed-in | Earned certificates |
| `/certificate/[code]` | public | Verifiable certificate page |
| `/admin/courses` | admin | Course list, create/edit |
| `/admin/courses/[id]` | admin | Curriculum builder, pricing, publish |
| `/admin/courses/orders` | admin | Orders, refunds |

`/courses` and `/courses/[slug]` go in the middleware `PUBLIC_PREFIXES` and
`allSitemapEntries`. Everything under `/learn` stays behind auth.

### Mode toggle ("Practice ⇄ Learn")

- A segmented switch in `Topbar` (desktop) and the mobile "More" sheet, plus a
  prominent "Go learn" card on `/dashboard`.
- Mode is derived from the URL (`/learn*` ⇒ Learn) so deep links just work and
  there is no hidden state; the last-used mode is remembered in a cookie so
  `/dashboard` can offer "Resume learning".
- `SidebarNav` takes a `mode` and renders `NAV_ITEMS` or `LEARN_NAV_ITEMS`.

### LMS sidebar (`LEARN_NAV_ITEMS`)

```
Learn
  Home                /learn
  Browse courses      /learn/courses
  My courses          /learn/my-courses
  Continue watching   (inline widget, not a page)
  Wishlist            /learn/wishlist
Progress
  Certificates        /learn/certificates
  Notes               /learn/notes        (lesson notes, filtered view of /notes)
  Q&A                 /learn/questions
Account
  Billing & orders    /settings#billing
  ← Back to Practice  /dashboard
```

Admins additionally see "Manage courses" → `/admin/courses`.

## 4. Data model (`supabase/migrations/0015_lms.sql`)

All tables: RLS enabled with no policies (service-role only), matching the
existing convention. `user_id text`, ids `uuid default gen_random_uuid()`.

```
courses
  id, slug unique, title, subtitle, description (md), thumbnail_url,
  promo_video_ref jsonb,           -- preview video (provider ref)
  level, language, category, tags text[],
  price_inr int, compare_at_inr int, is_free bool,
  status ('draft'|'published'|'archived'), published_at,
  instructor_name, instructor_bio, instructor_image,
  outcomes text[], requirements text[],
  seo_title, seo_description, seo_keywords,
  stats jsonb {students, rating_avg, rating_count, duration_s, lesson_count},
  created_by, created_at, updated_at

course_sections
  id, course_id → courses, title, position

course_lessons
  id, course_id, section_id, title, position, kind ('video'|'text'|'quiz'|'problem'),
  video jsonb {provider:'drive', ref:'<fileId>'},   -- never the raw URL
  duration_s, body_md, is_free_preview bool, resources jsonb[],
  problem_slug text null, drip_days int null

course_orders                         -- one row per purchase attempt
  id, user_id, course_id, amount_inr, currency, status
  ('created'|'paid'|'failed'|'refunded'), razorpay_order_id unique,
  razorpay_payment_id, coupon_code, discount_inr, gst_inr, invoice_no,
  created_at, paid_at, refunded_at

course_enrollments                    -- the entitlement
  id, user_id, course_id, source ('purchase'|'free'|'grant'|'plan'|'bundle'),
  order_id null, granted_by null, enrolled_at, expires_at null,
  last_lesson_id, last_accessed_at, completed_at null
  unique (user_id, course_id)

lesson_progress
  user_id, lesson_id, course_id, status ('started'|'completed'),
  seconds_watched, completed_at, updated_at, primary key (user_id, lesson_id)

course_reviews     user_id, course_id, rating 1-5, body, status, created_at  (unique pair)
course_wishlist    user_id, course_id, created_at
course_certificates id, code unique, user_id, course_id, issued_at
lesson_notes       id, user_id, lesson_id, at_seconds, body, created_at
course_bundles / course_bundle_items            -- phase 9
```

Counters (`students`, `rating_*`) are maintained by SQL functions called from
the purchase/review paths, as `0009`/`0010`/`0011` do for other counters.

## 5. Services and API

New files under `src/services/`: `lms-courses.ts` (CRUD, catalogue queries),
`lms-enrollment.ts` (entitlement checks, grant), `lms-progress.ts`,
`lms-orders.ts` (order create/verify/refund), `lms-reviews.ts`.

Key rule: **a single `canAccessLesson(userId, lesson)` function** decides access
(free preview ∥ enrolled ∥ admin ∥ plan-grant). Every video/resource endpoint
calls it; the UI never decides on its own.

| Endpoint | Notes |
|---|---|
| `GET /api/courses`, `GET /api/courses/[slug]` | public, only `published`; never returns video refs |
| `GET /api/learn/lessons/[id]/play` | entitlement-checked; returns the embed descriptor |
| `POST /api/learn/progress` | upsert lesson progress; awards XP on completion |
| `POST /api/learn/courses/[id]/checkout` | creates Razorpay order (or enrols directly if free / 100% coupon) |
| `POST /api/learn/courses/[id]/verify` | checks signature, marks paid, enrols, emails receipt |
| `POST /api/subscription/webhook` | extended: `notes.type === "course"` ⇒ idempotent enrol on `payment.captured` (safety net if the browser never returns) |
| `/api/admin/courses/**` | `requireAdmin`; CRUD, reorder, publish, grant access, refund |

Webhook idempotency reuses the existing `webhook_events` table keyed on the
Razorpay event id.

## 6. Video from Google Drive — design and honest limits

**Approach.** Admin pastes a Drive share link; the server extracts the file id
(`/file/d/<id>/…`, `open?id=<id>`, `uc?id=`) and stores only
`{provider:"drive", ref:"<id>"}`. The player renders
`https://drive.google.com/file/d/<id>/preview` in an iframe. Behind a
`VideoProvider` interface (`drive | youtube | bunny | mux | cloudflare`) so
switching host later is a data change, not a rewrite.

**What this setup can and cannot do** (decide knowingly):

| Concern | Reality with Drive | Mitigation |
|---|---|---|
| Paywall | The file must be shared "Anyone with the link", so anyone who learns the id can watch without paying | Never ship the id to non-entitled users; `/play` returns it only after the access check; keep ids out of HTML for the catalogue; accept residual leak risk |
| Progress / resume position | Cross-origin iframe: no play/pause/time events | Track **lesson completion** (manual "Mark complete" + auto-complete prompt), not seconds; resume = last lesson |
| Quotas | Drive throttles popular files ("too many users") | Keep files small, use separate files per lesson, monitor; this is the main reason to plan a host upgrade |
| Download / pop-out | Preview shows a pop-out button; downloads can't be fully blocked | Overlay to cover the pop-out control; set expectations — this is not DRM |
| Terms of service | Using Drive as a commercial video CDN may violate Google's terms | Flag as a business risk; treat Drive as the launch host, not the end state |
| Quality / UX | No custom speed controls, chapters, or captions we control | Provider upgrade in Phase 10 restores these |

Recommended migration target when the first paying cohort grows: **Bunny
Stream / Cloudflare Stream / Mux** (signed URLs, real analytics, watch-time
events). The abstraction exists from day one so that move is cheap.

## 7. Purchase and entitlement flow

```
Detail page → Buy → POST checkout
   free / 100% coupon ─────────────────────────────► enrol (source=free)
   paid → Razorpay order (course_orders: created) → Checkout popup
        → POST verify (signature) → order=paid → enrol → receipt email
        ↘ webhook payment.captured (same handler, idempotent) 
Refund (admin) → Razorpay refund → order=refunded → enrollment revoked
```

- Price is **always re-read server-side**; the client only sends a course id
  and optional coupon.
- Coupons: extend `coupons` with `applies_to ('plan'|'course'|'all')` and an
  optional `course_id`; redemption recorded in `coupon_redemptions`.
- No GST or other tax: the listed price is the amount charged. Refund window is 14
  days (`COURSE_REFUND_DAYS`).

## 8. Billing consolidated into Settings

Settings → **Billing & Usage** becomes the only billing surface:

1. **Plan** — current subscription, trial, cancel (existing `BillingPanel`).
2. **Orders & payments** — one table merging `subscriptions` and
   `course_orders` (date, item, amount, status, invoice download, refund state).
3. **My purchases** — courses owned with "Open" links.
4. **Coupons & credits** — redeem, history.
5. **Usage** — existing `UsagePanel`.

Built as a `getBillingLedger(userId)` service returning a normalised row type,
so the UI never branches on payment kind. `/pricing` and the LMS "Billing &
orders" sidebar link both deep-link to `/settings#billing`.

## 9. Advanced features (sequenced in the phases file)

**Learning**: curriculum sections, free-preview lessons, text/resource lessons,
drip release, course-completion certificates with a public verify page,
playback-agnostic progress, continue-watching rail, resume.

**Unique to this platform**: attach existing **coding problems** to a lesson
(solve in the workspace, completion unlocks the next lesson); **AI mentor with
lesson context** (the existing mentor receives lesson title/notes); AI-generated
quiz and summary from an admin-supplied transcript; XP/streak/leaderboard credit
for learning activity; spaced-repetition cards from lesson notes.

**Social proof & engagement**: ratings and reviews (verified purchasers only),
lesson Q&A threads (reusing `discussions`), timestamped notes, wishlist.

**Commerce**: coupons per course, bundles, "included in Plus" access source,
referral/affiliate links, drip emails, payment invoices,
refunds and revocation.

**Admin**: curriculum builder with drag-reorder, bulk Drive-link import (paste a
list of links → lessons), draft/publish/archive, manual enrolment grants,
revenue/enrolment/completion/drop-off analytics, per-course funnel.

**SEO** (builds on `src/lib/seo.ts`): `Course` + `Product`/`Offer`,
`VideoObject` for preview lessons (no private ids), `AggregateRating` only once
real reviews exist, `ItemList` for the catalogue, breadcrumbs, sitemap entries.

## 10. Security and quality checklist

- **Data-driven, built from existing components**: no hardcoded content, prices,
  currency or URLs in UI code; compose screens from the codebase's own `ui`,
  `shared`, `layout` and admin-manager components.
- Admin routes: `requireAdmin` on every handler; no client-trusted role checks.
- Entitlement checked server-side on every play/resource request; log denials.
- Never expose Drive ids, order secrets, or other users' progress.
- Rate-limit checkout/verify (`lib/rate-limit.ts`); webhook signature required.
- Money: integer rupees/paise, server-computed totals, idempotent enrol.
- Tests: Jest for `canAccessLesson`, price/coupon math, Drive-link parsing,
  ledger merge; Playwright smoke for browse → buy (Razorpay test mode) → watch.
- Feature flag `NEXT_PUBLIC_LMS_ENABLED` so it can ship dark and be enabled per environment.

## 11. Assumptions to confirm before Phase 1

1. ✅ Answered: no GST on any purchase.
2. Do Plus/Go subscribers get any courses included, or is every course sold
   separately?
3. ✅ Refund window: 14 days (whether a refund revokes access is still open; default: yes).
4. Free courses allowed (lead magnets)?
5. Accept Drive as launch host with the limits in §6?
6. Single instructor (the admin) for v1, or per-course instructor profiles?
