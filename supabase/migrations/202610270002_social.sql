-- Rede social só entre amigos: perfis com código de amigo, amizades,
-- posts, comentários, curtidas e denúncias. Tudo protegido por RLS.

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  photo text check (photo is null or char_length(photo) <= 200),
  -- Nível e medalhas (gamificação), mostrados aos amigos.
  level int not null default 1 check (level between 1 and 100000),
  medals int not null default 0 check (medals between 0 and 1000),
  friend_code text not null unique
    default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(text) <= 1000),
  photo text check (photo is null or char_length(photo) <= 200),
  -- post: escrito pela pessoa; medal/activity: publicados sozinhos ao
  -- conquistar uma medalha ou registrar um exercício (pode desligar no app).
  kind text not null default 'post' check (kind in ('post', 'medal', 'activity')),
  created_at timestamptz not null default now(),
  check (char_length(text) > 0 or photo is not null)
);
create index if not exists posts_author_time on public.posts (author, created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_post on public.comments (post_id, created_at);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

-- São amigos (amizade aceita)? Recebe texto para servir às regras do Storage.
create or replace function public.are_friends(a uuid, b text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and ((f.requester = a and f.addressee::text = b)
         or (f.addressee = a and f.requester::text = b))
  );
$$;

-- A pessoa logada pode ver o post (é dela ou de um amigo)?
create or replace function public.can_see_post(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts x
     where x.id = p
       and (x.author = auth.uid() or public.are_friends(auth.uid(), x.author::text))
  );
$$;

-- Busca pelo código exato de amigo (não lista ninguém).
create or replace function public.find_by_friend_code(code text)
returns table (user_id uuid, name text, photo text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, s.name, s.photo
    from public.social_profiles s
   where s.friend_code = upper(trim(code)) and s.user_id <> auth.uid();
$$;

alter table public.social_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;

-- Perfis: o próprio, e quem tem amizade ou pedido com a pessoa.
create policy "See own and connected profiles" on public.social_profiles for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.friendships f
     where (f.requester = (select auth.uid()) and f.addressee = social_profiles.user_id)
        or (f.addressee = (select auth.uid()) and f.requester = social_profiles.user_id)));
create policy "Create own profile" on public.social_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Update own profile" on public.social_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Amizades: só os dois envolvidos. Pedido nasce pendente; só quem recebeu aceita.
create policy "See own friendships" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));
create policy "Send friend request" on public.friendships for insert to authenticated
  with check (requester = (select auth.uid()) and status = 'pending');
create policy "Accept friend request" on public.friendships for update to authenticated
  using (addressee = (select auth.uid())) with check (addressee = (select auth.uid()) and status = 'accepted');
create policy "Remove friendship" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));

-- Posts: autor e amigos dele.
create policy "See own and friends posts" on public.posts for select to authenticated
  using (author = (select auth.uid()) or public.are_friends((select auth.uid()), author::text));
create policy "Create own posts" on public.posts for insert to authenticated
  with check (author = (select auth.uid()));
create policy "Delete own posts" on public.posts for delete to authenticated
  using (author = (select auth.uid()));

-- Comentários: em posts visíveis; apaga o autor do comentário ou do post.
create policy "See comments on visible posts" on public.comments for select to authenticated
  using (public.can_see_post(post_id));
create policy "Comment on visible posts" on public.comments for insert to authenticated
  with check (author = (select auth.uid()) and public.can_see_post(post_id));
create policy "Delete own comments or on own posts" on public.comments for delete to authenticated
  using (author = (select auth.uid()) or exists (
    select 1 from public.posts p where p.id = post_id and p.author = (select auth.uid())));

-- Curtidas em posts visíveis.
create policy "See likes on visible posts" on public.likes for select to authenticated
  using (public.can_see_post(post_id));
create policy "Like visible posts" on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_see_post(post_id));
create policy "Remove own like" on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Denúncias: só gravar (revisadas pelo responsável no painel do Supabase).
create policy "Report content" on public.reports for insert to authenticated
  with check (reporter = (select auth.uid()));

revoke all on public.social_profiles, public.friendships, public.posts,
  public.comments, public.likes, public.reports from anon;
grant select, insert, update on public.social_profiles to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, delete on public.posts, public.comments, public.likes to authenticated;
grant insert on public.reports to authenticated;
revoke all on function public.are_friends(uuid, text) from public, anon;
revoke all on function public.can_see_post(uuid) from public, anon;
revoke all on function public.find_by_friend_code(text) from public, anon;
grant execute on function public.are_friends(uuid, text) to authenticated;
grant execute on function public.can_see_post(uuid) to authenticated;
grant execute on function public.find_by_friend_code(text) to authenticated;

-- Fotos: amigos veem a foto de perfil (editada) e as fotos dos posts.
-- Fotos de peso, pressão, exercícios e a original do perfil continuam só do dono.
create policy "Friends read shared photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[2] in ('profile', 'posts')
    and name not like '%-original.jpg'
    and public.are_friends((select auth.uid()), (storage.foldername(name))[1])
  );
