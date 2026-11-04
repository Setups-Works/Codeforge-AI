-- Course coupons (Phase 9). Existing coupons keep working for plans only.
-- applies_to: which kind of purchase a coupon can discount.
-- course_ids: restrict a course coupon to specific courses (empty = every course).
alter table coupons add column if not exists applies_to text not null default 'plan'
  check (applies_to in ('plan', 'course', 'all'));
alter table coupons add column if not exists course_ids uuid[] not null default '{}';

-- What the buyer was charged is amount_inr; discount_inr is what the coupon took off.
alter table course_orders add column if not exists coupon_code text;
alter table course_orders add column if not exists discount_inr integer not null default 0
  check (discount_inr >= 0);
