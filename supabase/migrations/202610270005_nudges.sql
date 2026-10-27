-- "Puxar orelha": mensagem motivacional para um amigo fora da meta.
-- Chega na hora pelo Realtime (app aberto) e fica guardada até ser vista.

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 200),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  -- O push já foi enviado (a função notify só envia uma vez por puxão).
  pushed boolean not null default false,
  check (sender <> recipient)
);
create index if not exists nudges_recipient on public.nudges (recipient, created_at desc);

alter table public.nudges enable row level security;

create policy "See own nudges" on public.nudges for select to authenticated
  using ((select auth.uid()) in (sender, recipient));
-- Só para amigos, e no máximo um puxão por hora para a mesma pessoa.
create policy "Nudge a friend once an hour" on public.nudges for insert to authenticated
  with check (
    sender = (select auth.uid())
    and public.are_friends(sender, recipient::text)
    and not exists (
      select 1 from public.nudges n
       where n.sender = (select auth.uid())
         and n.recipient = nudges.recipient
         and n.created_at > now() - interval '1 hour'
    )
  );
create policy "Mark own nudges as seen" on public.nudges for update to authenticated
  using (recipient = (select auth.uid())) with check (recipient = (select auth.uid()));

revoke all on public.nudges from anon;
grant select, insert on public.nudges to authenticated;
grant update (seen_at) on public.nudges to authenticated;

-- Entrega em tempo real (respeita as regras de acesso acima).
alter publication supabase_realtime add table public.nudges;
