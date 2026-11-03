-- LMS foundation (Phase 0): courses, curriculum, enrollments, lesson progress.
-- Later phases add orders, reviews, wishlist, certificates, notes and bundles.
--
-- user_id columns are text, not uuid: live accounts still carry Mongo ObjectIds
-- until the users backfill lands (see lib/data-backend.ts toUuidOrNull).
-- Service-role backend only, like the rest of the schema: RLS on, no policies.

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null default '',
  thumbnail_url text,
  promo_video jsonb,                       -- { provider, ref } preview video
  level text,
  language text not null default 'en',
  category text,
  tags text[] not null default '{}',
  price_inr integer not null default 0 check (price_inr >= 0),
  compare_at_inr integer check (compare_at_inr is null or compare_at_inr >= 0),
  is_free boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  instructor_name text,
  instructor_bio text,
  instructor_image text,
  outcomes text[] not null default '{}',
  requirements text[] not null default '{}',
  seo_title text,
  seo_description text,
  seo_keywords text,
  stats jsonb not null default '{}'::jsonb, -- students, rating_avg, rating_count, duration_s, lesson_count
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_status_published_idx on courses(status, published_at desc);
create index if not exists courses_category_idx on courses(category);

create table if not exists course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists course_sections_course_idx on course_sections(course_id, position);

create table if not exists course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  section_id uuid not null references course_sections(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  kind text not null default 'video' check (kind in ('video', 'text', 'quiz', 'problem')),
  video jsonb,                             -- { provider, ref }; never a raw URL
  duration_s integer not null default 0 check (duration_s >= 0),
  body_md text,
  is_free_preview boolean not null default false,
  resources jsonb not null default '[]'::jsonb,
  problem_slug text,
  drip_days integer check (drip_days is null or drip_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_lessons_course_idx on course_lessons(course_id, position);
create index if not exists course_lessons_section_idx on course_lessons(section_id, position);

-- The entitlement. One row per (user, course); orders attach in Phase 4.
create table if not exists course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  course_id uuid not null references courses(id) on delete cascade,
  source text not null default 'purchase' check (source in ('purchase', 'free', 'grant', 'plan', 'bundle')),
  order_id uuid,
  granted_by text,
  enrolled_at timestamptz not null default now(),
  expires_at timestamptz,
  last_lesson_id uuid references course_lessons(id) on delete set null,
  last_accessed_at timestamptz,
  completed_at timestamptz,
  unique (user_id, course_id)
);

create index if not exists course_enrollments_user_idx on course_enrollments(user_id, last_accessed_at desc);
create index if not exists course_enrollments_course_idx on course_enrollments(course_id);

create table if not exists lesson_progress (
  user_id text not null,
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  seconds_watched integer not null default 0 check (seconds_watched >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists lesson_progress_user_course_idx on lesson_progress(user_id, course_id);

alter table courses enable row level security;
alter table course_sections enable row level security;
alter table course_lessons enable row level security;
alter table course_enrollments enable row level security;
alter table lesson_progress enable row level security;
