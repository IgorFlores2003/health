-- Limite de tamanho do snapshot: evita que uma conta grave JSON gigante.
-- 2 MB de texto cobrem anos de registros (as fotos ficam no Storage).
alter table public.health_snapshots
  add constraint health_snapshots_payload_size
  check (octet_length(payload::text) <= 2000000) not valid;

-- Uso da IA por pessoa, para limitar custo e abuso da chave do Gemini.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
-- Sem políticas: ninguém lê nem altera a tabela pela API; só a função abaixo.
revoke all on public.ai_usage from anon, authenticated;

-- Registra um uso e diz se a pessoa ainda está dentro do limite
-- (20 por minuto, 200 por dia). Roda como dono da tabela.
create or replace function public.consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  last_minute int;
  last_day int;
begin
  if uid is null then
    return false;
  end if;
  select count(*) filter (where created_at > now() - interval '1 minute'),
         count(*)
    into last_minute, last_day
    from public.ai_usage
   where user_id = uid and created_at > now() - interval '1 day';
  if last_minute >= 20 or last_day >= 200 then
    return false;
  end if;
  insert into public.ai_usage (user_id) values (uid);
  -- Limpeza: guarda só as últimas 24 h dessa pessoa.
  delete from public.ai_usage
   where user_id = uid and created_at < now() - interval '1 day';
  return true;
end;
$$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
