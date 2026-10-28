-- Comentários e respostas com foto (galeria ou câmera) e reação com ícone
-- (no lugar de emoji). O comentário precisa ter texto, GIF, foto ou reação.
alter table public.comments
  add column if not exists photo text
    check (photo is null or (char_length(photo) <= 200 and photo like author::text || '/comments/%')),
  add column if not exists sticker text
    check (sticker is null or sticker in (
      'heart', 'fire', 'thumbs', 'trophy', 'strong', 'star', 'flash',
      'water', 'rocket', 'party', 'happy', 'laugh', 'check'));
alter table public.comments drop constraint if exists comments_text_or_gif;
alter table public.comments drop constraint if exists comments_has_content;
alter table public.comments
  add constraint comments_has_content check (
    char_length(text) > 0 or gif is not null or photo is not null or sticker is not null);
create index if not exists comments_photo on public.comments (photo) where photo is not null;

-- A foto de um comentário é vista por quem vê o comentário (mesmo quem não
-- é amigo de quem comentou, só do dono do post).
create policy "Read photos of visible comments" on storage.objects for select to authenticated
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[2] = 'comments'
    and exists (
      select 1 from public.comments c
       where c.photo = storage.objects.name and public.can_see_post(c.post_id))
  );
