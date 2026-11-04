-- LMS practice integration (Phase 8): quizzes, lesson gating, learning XP, lesson-aware AI chats.
-- Service-role backend only: RLS on, no policies.

-- Per-lesson options. gate_next: later lessons stay locked until this one is completed.
alter table course_lessons add column if not exists pass_percent integer not null default 70
  check (pass_percent between 1 and 100);
alter table course_lessons add column if not exists gate_next boolean not null default false;

-- Learning XP is awarded once per lesson, so undoing and redoing a lesson can't farm it.
alter table lesson_progress add column if not exists xp_awarded boolean not null default false;

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  position integer not null default 0,
  prompt text not null,
  options jsonb not null,                       -- array of 2..6 strings
  correct_index integer not null check (correct_index >= 0),
  explanation text
);
create index if not exists quiz_questions_lesson_idx on quiz_questions(lesson_id, position);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  score integer not null,
  total integer not null,
  percent integer not null,
  passed boolean not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_lesson_idx on quiz_attempts(user_id, lesson_id, created_at desc);

-- AI mentor conversations can now be scoped to a lesson.
alter table ai_chats add column if not exists lesson_id uuid references course_lessons(id) on delete cascade;
alter table ai_chats drop constraint if exists ai_chats_context_check;
alter table ai_chats add constraint ai_chats_context_check
  check (context in ('question', 'challenge', 'interview', 'general', 'lesson'));

alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;
