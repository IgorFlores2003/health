-- Lontra com três modos: sozinho, com um amigo específico (os dois se
-- escolhem) ou aberta (qualquer amigo pode entrar para ajudar).

create table if not exists public.otter_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  mode text not null default 'solo' check (mode in ('solo', 'buddy', 'open')),
  buddy uuid references auth.users(id) on delete set null,
  check (buddy is null or buddy <> user_id),
  check ((mode = 'buddy') = (buddy is not null))
);

create table if not exists public.otter_helpers (
  owner uuid not null references auth.users(id) on delete cascade,
  helper uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (owner, helper),
  check (owner <> helper)
);

-- Escolhas de dupla já feitas viram o modo "com um amigo".
insert into public.otter_settings (user_id, mode, buddy)
  select user_id, 'buddy', buddy from public.otter_buddies
  on conflict (user_id) do nothing;

drop policy if exists "See own and buddy goals" on public.daily_goals;
drop table if exists public.otter_buddies;

alter table public.otter_settings enable row level security;
alter table public.otter_helpers enable row level security;

-- Modo da lontra: o próprio, quem escolheu a pessoa como dupla e as
-- lontras abertas dos amigos.
create policy "See relevant otter settings" on public.otter_settings for select to authenticated
  using (
    user_id = (select auth.uid())
    or buddy = (select auth.uid())
    or (mode = 'open' and public.are_friends((select auth.uid()), user_id::text))
  );
create policy "Create own otter settings" on public.otter_settings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (buddy is null or public.are_friends(user_id, buddy::text))
  );
create policy "Update own otter settings" on public.otter_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (buddy is null or public.are_friends(user_id, buddy::text))
  );

-- Ajudantes: entra quem é amigo e só em lontra aberta; sai quem ajuda ou
-- quem é dono.
create policy "See own otter helpers" on public.otter_helpers for select to authenticated
  using ((select auth.uid()) in (owner, helper));
create policy "Help a friend's open otter" on public.otter_helpers for insert to authenticated
  with check (
    helper = (select auth.uid())
    and public.are_friends(helper, owner::text)
    and exists (
      select 1 from public.otter_settings s
       where s.user_id = owner and s.mode = 'open'
    )
  );
create policy "Leave or remove helper" on public.otter_helpers for delete to authenticated
  using ((select auth.uid()) in (owner, helper));

-- Metas do dia (só cumpriu ou não): a própria; a de quem escolheu a pessoa
-- como dupla; e a de quem ajuda a lontra da pessoa.
create policy "See own, buddy and helper goals" on public.daily_goals for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.otter_settings s
       where s.user_id = daily_goals.user_id
         and s.mode = 'buddy'
         and s.buddy = (select auth.uid())
         and public.are_friends(s.user_id, s.buddy::text)
    )
    or exists (
      select 1 from public.otter_helpers h
       where h.helper = daily_goals.user_id
         and h.owner = (select auth.uid())
         and public.are_friends(h.owner, h.helper::text)
    )
  );

revoke all on public.otter_settings, public.otter_helpers from anon;
grant select, insert, update on public.otter_settings to authenticated;
grant select, insert, delete on public.otter_helpers to authenticated;
