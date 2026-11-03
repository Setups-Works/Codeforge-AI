-- LMS engagement (Phase 7): reviews, wishlist, lesson notes, lesson Q&A, certificates.
-- user_id columns are text, matching the rest of the LMS tables.
-- Service-role backend only: RLS on, no policies.

create table if not exists course_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  course_id uuid not null references courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists course_reviews_course_idx on course_reviews(course_id, status, created_at desc);

create table if not exists course_wishlist (
  user_id text not null,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  at_seconds integer check (at_seconds is null or at_seconds >= 0),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists lesson_notes_user_lesson_idx on lesson_notes(user_id, lesson_id, created_at);
create index if not exists lesson_notes_user_course_idx on lesson_notes(user_id, course_id);

-- Questions are top-level rows (parent_id null); answers/replies point at a question.
create table if not exists lesson_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  user_id text not null,
  parent_id uuid references lesson_questions(id) on delete cascade,
  body text not null,
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lesson_questions_lesson_idx on lesson_questions(lesson_id, created_at);

-- Name and title are snapshotted so a certificate stays valid if either changes later.
create table if not exists course_certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id text not null,
  course_id uuid not null references courses(id) on delete restrict,
  learner_name text not null,
  course_title text not null,
  instructor_name text,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists course_certificates_user_idx on course_certificates(user_id, issued_at desc);

alter table course_reviews enable row level security;
alter table course_wishlist enable row level security;
alter table lesson_notes enable row level security;
alter table lesson_questions enable row level security;
alter table course_certificates enable row level security;
