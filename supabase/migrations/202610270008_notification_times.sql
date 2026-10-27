-- Data das curtidas e de quando um amigo entrou para ajudar a lontra,
-- para a aba de notificações mostrar e ordenar por quando aconteceu.
alter table public.likes
  add column if not exists created_at timestamptz not null default now();
alter table public.otter_helpers
  add column if not exists created_at timestamptz not null default now();
alter table public.friendships
  add column if not exists accepted_at timestamptz;

-- Marca quando a amizade foi aceita (vira notificação para quem pediu).
create or replace function public.stamp_friendship_accepted()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    new.accepted_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists friendship_accepted on public.friendships;
create trigger friendship_accepted before update on public.friendships
  for each row execute function public.stamp_friendship_accepted();
