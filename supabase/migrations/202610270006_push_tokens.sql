-- Endereços de push (Firebase Cloud Messaging) de cada aparelho. Só a
-- própria pessoa vê os seus; a função "notify" lê com a chave de serviço.

create table if not exists public.push_tokens (
  token text primary key check (char_length(token) between 10 and 4096),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "See own push tokens" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Save own push token" on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Update own push token" on public.push_tokens for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Remove own push token" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_tokens from anon;
grant select, insert, update, delete on public.push_tokens to authenticated;

-- Grava o endereço deste aparelho para a pessoa logada (o mesmo celular
-- pode trocar de conta: o endereço passa para a conta atual).
create or replace function public.save_push_token(t text, p text default 'android')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (t, auth.uid(), p, now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;
revoke all on function public.save_push_token(text, text) from public, anon;
grant execute on function public.save_push_token(text, text) to authenticated;
