create table if not exists public.health_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.health_snapshots enable row level security;
create policy "Users read their own snapshot" on public.health_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert their own snapshot" on public.health_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own snapshot" on public.health_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own snapshot" on public.health_snapshots for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.health_snapshots from anon;
grant select, insert, update, delete on public.health_snapshots to authenticated;
