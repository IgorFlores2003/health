-- Lontra da dupla: cada pessoa escolhe um amigo; a lontra fica mais magra e
-- forte conforme os dois cumprem as metas do dia. Só o resultado (cumpriu ou
-- não) é compartilhado, nunca os valores.

create table if not exists public.otter_buddies (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  buddy uuid not null references auth.users(id) on delete cascade,
  check (user_id <> buddy)
);

create table if not exists public.daily_goals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  water boolean not null,
  calories boolean not null,
  exercise boolean not null,
  primary key (user_id, date)
);

alter table public.otter_buddies enable row level security;
alter table public.daily_goals enable row level security;

-- Escolha da dupla: a própria e quem escolheu a pessoa. Só amigos.
create policy "See own and incoming buddy choice" on public.otter_buddies for select to authenticated
  using ((select auth.uid()) in (user_id, buddy));
create policy "Choose a friend as buddy" on public.otter_buddies for insert to authenticated
  with check (user_id = (select auth.uid()) and public.are_friends(user_id, buddy::text));
create policy "Change buddy" on public.otter_buddies for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.are_friends(user_id, buddy::text));
create policy "Leave buddy" on public.otter_buddies for delete to authenticated
  using (user_id = (select auth.uid()));

-- Metas do dia: a própria e as de quem escolheu a pessoa como dupla
-- (e continua amigo).
create policy "See own and buddy goals" on public.daily_goals for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.otter_buddies b
       where b.user_id = daily_goals.user_id
         and b.buddy = (select auth.uid())
         and public.are_friends(b.user_id, b.buddy::text)
    )
  );
create policy "Write own goals" on public.daily_goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Update own goals" on public.daily_goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.otter_buddies, public.daily_goals from anon;
grant select, insert, update, delete on public.otter_buddies to authenticated;
grant select, insert, update on public.daily_goals to authenticated;
