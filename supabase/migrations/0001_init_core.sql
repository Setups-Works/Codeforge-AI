-- Setups Works Lab — Supabase/Postgres schema, Phase 1 (core tables).
-- Mapped from the Mongoose models. Embedded sub-documents become jsonb.
-- Every table keeps `legacy_mongo_id` so the later data-copy can remap the old
-- ObjectId references to the new uuid primary keys.
-- RLS is enabled with no policies: the Next.js backend uses the service-role
-- key (which bypasses RLS); anon/public gets nothing by default.

create extension if not exists pgcrypto;

-- updated_at trigger helper ---------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- users -----------------------------------------------------------------------
create table users (
  id                      uuid primary key default gen_random_uuid(),
  legacy_mongo_id         text unique,
  name                    text not null,
  username                text not null unique,
  email                   text not null unique,
  password                text,
  image                   text,
  role                    text not null default 'user' check (role in ('user','admin')),
  providers               text[] not null default '{}',
  banned                  boolean not null default false,
  email_opt_out           boolean not null default false,
  bio                     text,
  location                text,
  website                 text,
  github_url              text,
  linkedin_url            text,
  stats                   jsonb not null default '{}',
  preferences             jsonb not null default '{}',
  onboarding              jsonb not null default '{}',
  plan                    text not null default 'free' check (plan in ('free','go','plus')),
  plan_expires_at         timestamptz,
  trial_ends_at           timestamptz,
  billing_cycle           text check (billing_cycle in ('monthly','yearly')),
  razorpay_subscription_id text,
  subscription_status     text check (subscription_status in ('active','pending','halted','cancelled','completed')),
  cancel_at_period_end    boolean not null default false,
  billing                 jsonb,
  beta_user               boolean not null default false,
  password_reset_token    text,
  password_reset_expiry   timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index users_razorpay_sub_idx on users (razorpay_subscription_id);
create index users_email_opt_out_idx on users (email_opt_out);

-- questions -------------------------------------------------------------------
create table questions (
  id              uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  slug            text not null unique,
  title           text not null,
  difficulty      text not null,
  category        text not null,
  tags            text[] not null default '{}',
  companies       text[] not null default '{}',
  description     text not null,
  examples        jsonb not null default '[]',
  constraints     text[] not null default '{}',
  starter_code    jsonb not null default '{}',
  test_cases      jsonb not null default '[]',
  solution        text,
  editorial       text,
  hints           text[] not null default '{}',
  is_published    boolean not null default false,
  source          text not null default 'manual',
  created_by      uuid references users(id) on delete set null,
  stats           jsonb not null default '{"submissions":0,"accepted":0}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index questions_category_idx on questions (category);
create index questions_tags_idx on questions using gin (tags);

-- submissions -----------------------------------------------------------------
create table submissions (
  id              uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  user_id         uuid not null references users(id) on delete cascade,
  kind            text not null check (kind in ('dsa','frontend')),
  question_id     uuid references questions(id) on delete set null,
  challenge_id    uuid,
  contest_id      uuid,
  language        text,
  code            text,
  files           jsonb,
  status          text not null,
  test_results    jsonb not null default '[]',
  passed_count    integer not null default 0,
  total_count     integer not null default 0,
  runtime_ms      integer,
  memory_kb       integer,
  ai_review       jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index submissions_user_created_idx on submissions (user_id, created_at desc);
create index submissions_question_idx on submissions (question_id);

-- subscriptions (billing history / recurring) ---------------------------------
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  legacy_mongo_id         text unique,
  user_id                 uuid not null references users(id) on delete cascade,
  plan                    text not null check (plan in ('go','plus')),
  billing_cycle           text not null check (billing_cycle in ('monthly','yearly')),
  amount                  numeric not null,
  currency                text not null default 'INR',
  kind                    text not null default 'order' check (kind in ('order','subscription')),
  razorpay_order_id       text,
  razorpay_subscription_id text,
  razorpay_payment_id     text unique,
  razorpay_signature      text,
  coupon_code             text,
  discount                numeric not null default 0,
  status                  text not null default 'created' check (status in ('created','paid','failed','cancelled')),
  trial_ends_at           timestamptz,
  period_start            timestamptz,
  period_end              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index subscriptions_user_idx on subscriptions (user_id);
create index subscriptions_razorpay_sub_idx on subscriptions (razorpay_subscription_id);

-- coupons ---------------------------------------------------------------------
create table coupons (
  id              uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  code            text not null unique,
  type            text not null check (type in ('percent','flat')),
  value           numeric not null,
  active          boolean not null default true,
  expires_at      timestamptz,
  max_redemptions integer not null default -1,
  used_count      integer not null default 0,
  plans           text[] not null default '{}',
  min_amount      numeric not null default 0,
  once_per_user   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  coupon_id       uuid references coupons(id) on delete cascade,
  code            text,
  user_id         uuid references users(id) on delete cascade,
  discount        numeric,
  created_at      timestamptz not null default now(),
  unique (coupon_id, user_id)
);

-- feedback --------------------------------------------------------------------
create table feedback (
  id              uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  type            text not null check (type in ('feature','bug','issue')),
  title           text,
  description     text,
  email           text,
  user_id         uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- razorpay plan-id cache (id = "<plan>_<cycle>[_<amount>]") --------------------
create table razorpay_plans (
  id         text primary key,
  plan_id    text not null,
  plan       text,
  cycle      text,
  amount     integer,
  created_at timestamptz not null default now()
);

-- webhook idempotency (id = razorpay event id) --------------------------------
create table webhook_events (
  id         text primary key,
  event      text,
  created_at timestamptz not null default now()
);

-- singleton site config (id = 'global'); secrets live in jsonb ----------------
create table site_config (
  id         text primary key default 'global',
  config     jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- updated_at triggers ---------------------------------------------------------
create trigger t_users_updated       before update on users        for each row execute function set_updated_at();
create trigger t_questions_updated    before update on questions     for each row execute function set_updated_at();
create trigger t_submissions_updated  before update on submissions   for each row execute function set_updated_at();
create trigger t_subscriptions_updated before update on subscriptions for each row execute function set_updated_at();
create trigger t_coupons_updated      before update on coupons       for each row execute function set_updated_at();
create trigger t_feedback_updated     before update on feedback      for each row execute function set_updated_at();
create trigger t_site_config_updated  before update on site_config   for each row execute function set_updated_at();

-- Lock everything to the service-role key (backend). Anon/public get nothing.
alter table users              enable row level security;
alter table questions          enable row level security;
alter table submissions        enable row level security;
alter table subscriptions      enable row level security;
alter table coupons            enable row level security;
alter table coupon_redemptions enable row level security;
alter table feedback           enable row level security;
alter table razorpay_plans     enable row level security;
alter table webhook_events     enable row level security;
alter table site_config        enable row level security;
