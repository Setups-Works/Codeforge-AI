-- LMS growth (Phase 9): plan-included courses, bundles, referrals, email log.
-- Service-role backend only: RLS on, no policies.

-- Courses included in a subscription plan: subscribers on any listed plan get access.
alter table courses add column if not exists included_in_plans text[] not null default '{}';

create table if not exists course_bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  thumbnail_url text,
  price_inr integer not null default 0 check (price_inr >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_bundle_items (
  bundle_id uuid not null references course_bundles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  position integer not null default 0,
  primary key (bundle_id, course_id)
);
create index if not exists course_bundle_items_course_idx on course_bundle_items(course_id);

-- An order is for exactly one thing: a single course or a bundle.
alter table course_orders alter column course_id drop not null;
alter table course_orders add column if not exists bundle_id uuid references course_bundles(id) on delete restrict;
alter table course_orders drop constraint if exists course_orders_target_check;
alter table course_orders add constraint course_orders_target_check check ((course_id is not null) <> (bundle_id is not null));

-- Referrals: a code per user, one referral per referee.
create table if not exists referral_codes (
  user_id text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id text not null,
  referee_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  order_id uuid,
  reward_coupon_code text,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);
create index if not exists referrals_referrer_idx on referrals(referrer_id, created_at desc);

-- One row per automated email, so a scheduled job can never send the same one twice.
create table if not exists lms_email_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  user_id text not null,
  ref_id text not null,
  sent_at timestamptz not null default now(),
  unique (kind, user_id, ref_id)
);

alter table course_bundles enable row level security;
alter table course_bundle_items enable row level security;
alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table lms_email_log enable row level security;
