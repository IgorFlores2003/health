-- A regra de envio consultava a própria tabela nudges, o que o Postgres
-- recusa ("infinite recursion detected in policy"). A checagem vai para
-- uma função que roda como dona da tabela.

create or replace function public.can_nudge(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.are_friends(auth.uid(), target::text)
     and not exists (
       select 1 from public.nudges n
        where n.sender = auth.uid()
          and n.recipient = target
          and n.created_at > now() - interval '1 hour'
     );
$$;
revoke all on function public.can_nudge(uuid) from public, anon;
grant execute on function public.can_nudge(uuid) to authenticated;

drop policy if exists "Nudge a friend once an hour" on public.nudges;
create policy "Nudge a friend once an hour" on public.nudges for insert to authenticated
  with check (sender = (select auth.uid()) and public.can_nudge(recipient));
