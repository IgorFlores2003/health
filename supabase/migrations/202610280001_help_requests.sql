-- "Pedir ajuda": a pessoa pede para um amigo puxar a orelha dela. Usa a
-- mesma tabela dos puxões (mesmas regras: só amigos, 1 por hora por pessoa),
-- com o tipo separando um do outro.
alter table public.nudges
  add column if not exists kind text not null default 'nudge'
  check (kind in ('nudge', 'help'));
create index if not exists nudges_recipient_kind
  on public.nudges (recipient, kind, created_at desc);
