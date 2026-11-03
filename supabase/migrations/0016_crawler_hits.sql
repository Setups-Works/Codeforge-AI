-- Crawler visit log (was the CrawlerHit Mongo collection, with a 90-day TTL).
create table if not exists public.crawler_hits (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,
  user_agent  text not null default '',
  ip          text not null default '',
  crawler     text not null,
  verified    boolean not null default false,
  method      text not null default 'none' check (method in ('ip-range','dns','none')),
  created_at  timestamptz not null default now()
);

create index if not exists crawler_hits_created_at_idx on public.crawler_hits (created_at desc);
create index if not exists crawler_hits_crawler_idx on public.crawler_hits (crawler);

alter table public.crawler_hits enable row level security;

-- Aggregates for the admin dashboard, computed in the database.
create or replace function public.crawler_hit_summary(since timestamptz)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.crawler_hits where created_at >= since),
    'byCrawler', coalesce((
      select jsonb_agg(jsonb_build_object('_id', crawler, 'hits', hits, 'verified', verified) order by hits desc)
      from (
        select crawler, count(*) as hits, count(*) filter (where verified) as verified
        from public.crawler_hits where created_at >= since group by crawler
      ) c
    ), '[]'::jsonb),
    'topPaths', coalesce((
      select jsonb_agg(jsonb_build_object('_id', path, 'hits', hits) order by hits desc)
      from (
        select path, count(*) as hits
        from public.crawler_hits where created_at >= since
        group by path order by hits desc limit 10
      ) p
    ), '[]'::jsonb)
  );
$$;

-- Replaces the Mongo TTL index: call periodically (e.g. pg_cron) to drop old rows.
create or replace function public.prune_crawler_hits() returns void
language sql as $$ delete from public.crawler_hits where created_at < now() - interval '90 days'; $$;
