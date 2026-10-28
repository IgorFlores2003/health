-- Respostas a comentários e GIFs (GIPHY) nos comentários. Um comentário
-- pode ser só um GIF, sem texto.
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists gif text
    check (gif is null or (char_length(gif) <= 500 and gif ~ '^https://media[0-9]*\.giphy\.com/'));
alter table public.comments drop constraint if exists comments_text_check;
alter table public.comments
  add constraint comments_text_check check (char_length(text) <= 500),
  add constraint comments_text_or_gif check (char_length(text) > 0 or gif is not null);
create index if not exists comments_parent on public.comments (parent_id);

-- A resposta fica no mesmo post do comentário respondido.
create policy "Reply within the same post" on public.comments
  as restrictive for insert to authenticated
  with check (parent_id is null or exists (
    select 1 from public.comments c
     where c.id = parent_id and c.post_id = comments.post_id));

-- Pushes já enviados de comentários, curtidas e posts (a função notify só
-- envia uma vez cada um). Só a chave de serviço usa esta tabela.
create table if not exists public.push_sent (
  key text primary key check (char_length(key) <= 200),
  created_at timestamptz not null default now()
);
alter table public.push_sent enable row level security;
revoke all on public.push_sent from anon, authenticated;
