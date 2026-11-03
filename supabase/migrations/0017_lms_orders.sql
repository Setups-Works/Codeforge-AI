-- LMS purchases (Phase 4): one row per checkout attempt for a course.
-- No tax columns: course prices are final, no GST is applied.
-- Service-role backend only: RLS on, no policies.

create table if not exists course_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- restrict: a course with orders can be archived but never hard-deleted
  course_id uuid not null references courses(id) on delete restrict,
  amount_inr integer not null check (amount_inr >= 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz
);

create index if not exists course_orders_user_idx on course_orders(user_id, created_at desc);
create index if not exists course_orders_course_idx on course_orders(course_id, created_at desc);

alter table course_orders enable row level security;
