import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiAlarmWarningLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCameraLine,
  RiChat3Line,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEmotionLine,
  RiFileGifLine,
  RiFlagLine,
  RiHeart3Fill,
  RiHeart3Line,
  RiImageAddLine,
  RiImageLine,
  RiLifebuoyFill,
  RiLifebuoyLine,
  RiMedalFill,
  RiReplyLine,
  RiRunFill,
  RiShareLine,
  RiUserAddLine,
  RiWifiOffLine,
} from "react-icons/ri";
import { confirmDialog } from "./confirm";
import Sheet from "./Sheet";
import {
  Avatar,
  downloadPhoto,
  PhotoStrip,
  removePhotos,
  toBase64,
  uploadPhoto,
} from "./photos";
import CameraCapture from "./CameraCapture";
import GifPicker from "./GifPicker";
import { STICKERS } from "./stickers";
import { gifsEnabled } from "./giphy";
import PhotoEditor from "./PhotoEditor";
import {
  acceptFriend,
  addComment,
  createPost,
  deleteComment,
  deletePost,
  findByCode,
  loadFeed,
  loadNetwork,
  postText,
  removeFriend,
  report,
  requestFriend,
  setLike,
  type Comment,
  type CommentExtra,
  type Friendship,
  type Post,
  type SocialProfile,
} from "./social";
import { ago, Panel } from "./ui";
import { inviteLink } from "./invite";
import OtterCard from "./Otter";
import { petStage, type DayGoals } from "./gamification";
import { PetArt } from "./Pet";
import {
  askForHelp,
  HELP_MESSAGES,
  helpRequests,
  nudgeMessage,
  sendNudge,
  type Nudge,
} from "./nudges";

/** Lista de ids guardada neste aparelho (as últimas 300). */
function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function saveList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(-300)));
  } catch {
    /* só não lembra */
  }
}

/** Última versão do Social, para mostrar sem internet. */
type SocialCache = Awaited<ReturnType<typeof loadNetwork>> & { feed: Post[] };
function readCache(key: string): SocialCache | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function writeCache(key: string, cache: SocialCache) {
  try {
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    /* só não fica guardado para usar sem internet */
  }
}

/**
 * Compartilha fora do app (WhatsApp etc.) ou copia o texto. Com foto, ela
 * vai junto quando o aparelho permite enviar arquivos.
 */
export async function shareText(text: string, photo?: Blob) {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import("@capacitor/share");
    if (photo) {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const file = await Filesystem.writeFile({
        path: "ritmo-post.jpg",
        data: toBase64(new Uint8Array(await photo.arrayBuffer())),
        directory: Directory.Cache,
      });
      await Share.share({ text, files: [file.uri] });
    } else await Share.share({ text });
  } else if (navigator.share) {
    const files = photo
      ? [new File([photo], "ritmo-post.jpg", { type: "image/jpeg" })]
      : [];
    await navigator.share(
      files.length && navigator.canShare?.({ files })
        ? { text, files }
        : { text },
    );
  } else {
    await navigator.clipboard.writeText(text);
    return "copied";
  }
  return "shared";
}

/** Aba Amigos: código de amigo, pedidos, publicar e o feed dos amigos. */
export default function Community({
  userId,
  draft,
  onDraftUsed,
  onNotice,
  shareActivity,
  onShareActivity,
  myGoals,
  ensureProfile,
  invite,
  section,
  onXp,
  focus,
  onFocused,
}: {
  /** Post a abrir (veio de uma notificação). */
  focus?: string | null;
  onFocused: () => void;
  /** Ganha XP por curtir/comentar posts de amigos e por publicar. */
  onXp: (kind: "like" | "comment" | "post", id: string) => void;
  /** Tela dentro de Social: amigos (feed) ou a lontra. */
  section: "friends" | "otter";
  /** Código de amigo vindo de um link de convite. */
  invite?: string | null;
  userId: string;
  /** Cria/atualiza o perfil social com os dados do perfil do app. */
  ensureProfile: () => Promise<void>;
  /** Metas da pessoa nos últimos 7 dias (para a lontra da dupla). */
  myGoals: DayGoals[];
  /** Publicar sozinho exercícios e medalhas para os amigos. */
  shareActivity: boolean;
  onShareActivity: (on: boolean) => void;
  /** Texto vindo de "Compartilhar" numa medalha. */
  draft: string;
  onDraftUsed: () => void;
  onNotice: (text: string) => void;
}) {
  // Última versão carregada, guardada neste aparelho: sem internet, o feed
  // e os amigos continuam aparecendo.
  const cacheKey = `ritmo-social-cache-${userId}`;
  const [cache] = useState(() => readCache(cacheKey));
  const [me, setMe] = useState<SocialProfile | null>(cache?.me ?? null);
  const [friendships, setFriendships] = useState<Friendship[]>(
    cache?.friendships ?? [],
  );
  const [people, setPeople] = useState<SocialProfile[]>(cache?.people ?? []);
  const [feed, setFeed] = useState<Post[]>(cache?.feed ?? []);
  const [loading, setLoading] = useState(!cache);
  const [offline, setOffline] = useState(false);
  // A primeira busca no servidor terminou (deu certo ou não).
  const [fetched, setFetched] = useState(false);
  // Pedidos de ajuda dos amigos ainda não respondidos (some ao puxar a orelha).
  const answeredKey = `ritmo-help-answered-${userId}`;
  const [help, setHelp] = useState<Nudge[]>([]);
  const answerHelp = (id: string) => {
    setHelp((h) => h.filter((x) => x.id !== id));
    saveList(answeredKey, [...readList(answeredKey), id]);
  };
  const [asking, setAsking] = useState(false);
  // Perfil de amigo aberto.
  const [profile, setProfile] = useState<string | null>(null);
  // Posts minimizados, lembrados neste aparelho.
  const collapsedKey = `ritmo-collapsed-posts-${userId}`;
  const [collapsed, setCollapsed] = useState(() => readList(collapsedKey));
  const collapse = (id: string, on: boolean) =>
    setCollapsed((c) => {
      const next = on ? [...c, id] : c.filter((x) => x !== id);
      saveList(collapsedKey, next);
      return next;
    });

  const refresh = useCallback(async () => {
    try {
      const [first, posts] = await Promise.all([
        loadNetwork(userId),
        loadFeed(),
      ]);
      let net = first;
      // Sem perfil (ex.: o app abriu antes da migração): cria agora.
      if (!net.me) {
        await ensureProfile();
        net = await loadNetwork(userId);
      }
      setMe(net.me);
      setFriendships(net.friendships);
      setPeople(net.people);
      setFeed(posts);
      setOffline(false);
      writeCache(cacheKey, { ...net, feed: posts });
      const answered = readList(answeredKey);
      setHelp(
        (await helpRequests(userId).catch(() => [])).filter(
          (h) => !answered.includes(h.id),
        ),
      );
    } catch (e) {
      if (!navigator.onLine) setOffline(true);
      else onNotice(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
      setFetched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, onNotice]);
  useEffect(() => {
    void refresh();
    const online = () => void refresh();
    const lost = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", lost);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", lost);
    };
  }, [refresh]);

  // Minimizar o feed inteiro (lembrado neste aparelho).
  const feedHiddenKey = `ritmo-feed-hidden-${userId}`;
  const [feedHidden, setFeedHiddenState] = useState(
    () => readList(feedHiddenKey).length > 0,
  );
  const setFeedHidden = (on: boolean) => {
    setFeedHiddenState(on);
    saveList(feedHiddenKey, on ? ["1"] : []);
  };
  // Post aberto por uma notificação: mostra o feed, abre e desce até ele.
  const [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    if (!focus || !fetched) return;
    onFocused();
    if (!feed.some((p) => p.id === focus)) {
      onNotice("Esse post não está mais disponível.");
      return;
    }
    setFeedHidden(false);
    collapse(focus, false);
    setFocused(focus);
    requestAnimationFrame(() =>
      document
        .getElementById(`post-${focus}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, fetched]);

  /** Executa e recarrega; devolve se deu certo (o erro vira aviso). */
  const run = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      if (done) onNotice(done);
      await refresh();
      return true;
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Não foi possível concluir.");
      return false;
    }
  };
  const patchPost = (id: string, change: (p: Post) => Post) =>
    setFeed((f) => f.map((p) => (p.id === id ? change(p) : p)));
  /**
   * Muda a tela na hora e só depois fala com o servidor. Se falhar, avisa e
   * recarrega o feed para desfazer o que foi mostrado.
   */
  const optimistic = async (
    change: () => void,
    action: () => Promise<unknown>,
  ) => {
    change();
    try {
      await action();
      return true;
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Não foi possível concluir.");
      await refresh();
      return false;
    }
  };
  const like = (p: Post, on: boolean) =>
    optimistic(
      () =>
        patchPost(p.id, (x) => ({
          ...x,
          likes: on
            ? [...x.likes.filter((u) => u !== userId), userId]
            : x.likes.filter((u) => u !== userId),
        })),
      async () => {
        await setLike(p.id, userId, on);
        if (on && p.author !== userId) onXp("like", p.id);
      },
    );
  const comment = (
    p: Post,
    text: string,
    extra: CommentExtra = {},
    photo?: Blob,
  ) => {
    // Id provisório até o servidor devolver o comentário salvo.
    const tmp = `tmp-${Date.now()}`;
    return optimistic(
      () =>
        patchPost(p.id, (x) => ({
          ...x,
          comments: [
            ...x.comments,
            {
              id: tmp,
              post_id: p.id,
              parent_id: extra.parent ?? null,
              author: userId,
              text: text.trim(),
              gif: extra.gif ?? null,
              photo: null,
              sticker: extra.sticker ?? null,
              created_at: new Date().toISOString(),
            },
          ],
        })),
      async () => {
        const saved = await addComment(p.id, text, {
          ...extra,
          photo: photo ? await uploadPhoto(userId, "comments", photo) : null,
        });
        if (p.author !== userId) onXp("comment", saved.id);
        patchPost(p.id, (x) => ({
          ...x,
          comments: x.comments.map((c) => (c.id === tmp ? saved : c)),
        }));
      },
    );
  };
  const removeComment = (p: Post, c: Comment) =>
    optimistic(
      () =>
        patchPost(p.id, (x) => ({
          ...x,
          comments: x.comments.filter(
            (y) => y.id !== c.id && y.parent_id !== c.id,
          ),
        })),
      async () => {
        await deleteComment(c.id);
        // A foto é apagada só pelo dono (o bucket só deixa ele).
        if (c.photo && c.author === userId)
          await removePhotos([c.photo]).catch(() => undefined);
      },
    );
  const person = (id: string) =>
    id === userId ? me : people.find((p) => p.user_id === id);
  const friends = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee === userId,
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester === userId,
  );
  const other = (f: Friendship) =>
    f.requester === userId ? f.addressee : f.requester;
  // Amigos e pedidos enviados: 5 no painel, todos em "Ver todos".
  const network = [...friends, ...outgoing];
  const [allFriends, setAllFriends] = useState(false);
  const friendRows = (list: Friendship[]) =>
    list.map((f) => (
      <PersonRow
        key={f.id}
        person={person(other(f))}
        onOpen={
          f.status === "accepted" ? () => setProfile(other(f)) : undefined
        }
        detail={
          f.status === "pending"
            ? "Pedido enviado"
            : (([p]) =>
                p
                  ? `Nível ${p.level ?? 1} · ${p.medals ?? 0} medalha${p.medals === 1 ? "" : "s"}`
                  : undefined)([person(other(f))])
        }
      >
        <button
          className="btn-ghost text-sm text-ink-500"
          onClick={async () => {
            if (
              await confirmDialog({
                title:
                  f.status === "pending"
                    ? "Cancelar pedido?"
                    : "Desfazer amizade?",
                message:
                  f.status === "pending"
                    ? undefined
                    : "Vocês deixam de ver os posts um do outro.",
                confirmLabel:
                  f.status === "pending" ? "Cancelar pedido" : "Desfazer",
                danger: true,
              })
            )
              void run(() => removeFriend(f.id));
          }}
        >
          {f.status === "pending" ? "Cancelar" : "Remover"}
        </button>
      </PersonRow>
    ));

  /** Compartilha fora do app com o autor, o texto e a foto do post. */
  const sharePost = async (p: Post) => {
    const author = p.author === userId ? null : person(p.author)?.name;
    const text = [
      author ? `${author} no Ritmo:` : null,
      postText(p),
      "Compartilhado do Ritmo",
    ]
      .filter(Boolean)
      .join("\n\n");
    const photo = p.photo
      ? await downloadPhoto(p.photo).catch(() => undefined)
      : undefined;
    await shareText(text, photo).then(
      (r) => r === "copied" && onNotice("Texto copiado para compartilhar."),
      (e) => {
        if (!(e instanceof Error && /cancel|abort/i.test(e.message + e.name)))
          onNotice("Não foi possível compartilhar agora.");
      },
    );
  };
  return (
    <>
      {section === "otter" ? (
        <div className="grid max-w-3xl gap-4">
          <OtterCard
            userId={userId}
            myGoals={myGoals}
            friends={friends.map((f) => ({
              id: other(f),
              person: person(other(f)),
            }))}
            onNotice={onNotice}
          />
        </div>
      ) : (
        // Celular: ajuda e amigos, depois o feed e, no fim, adicionar amigos.
        // Computador: feed à esquerda e o resto na coluna da direita.
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] lg:grid-rows-[auto_1fr]">
          <div className="grid min-w-0 content-start gap-4 lg:col-start-2 lg:row-start-1">
            {help.length > 0 && (
              <section className="card min-w-0 border-red-300 bg-red-500/5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-red-700">
                  <RiLifebuoyFill className="size-5" /> Seus amigos pedem ajuda
                </h2>
                <ul className="mt-2 divide-y divide-line">
                  {help.map((h) => (
                    <PersonRow
                      key={h.id}
                      person={person(h.sender)}
                      detail={`${h.message} · ${ago(h.created_at)}`}
                      onOpen={() => setProfile(h.sender)}
                    >
                      <button
                        className="btn-primary min-h-9 px-3 text-sm"
                        onClick={() =>
                          run(async () => {
                            await sendNudge(h.sender, nudgeMessage(undefined));
                            answerHelp(h.id);
                          }, "Orelha puxada! Seu amigo vai receber agora.")
                        }
                      >
                        <RiAlarmWarningLine className="size-4" /> Puxar orelha
                      </button>
                    </PersonRow>
                  ))}
                </ul>
              </section>
            )}
            {incoming.length > 0 && (
              <Panel>
                <h2 className="text-base font-semibold">Pedidos recebidos</h2>
                <ul className="mt-2 divide-y divide-line">
                  {incoming.map((f) => (
                    <PersonRow key={f.id} person={person(other(f))}>
                      <button
                        className="btn-primary min-h-9 px-3 text-sm"
                        onClick={() =>
                          run(
                            () => acceptFriend(f.id),
                            "Agora vocês são amigos!",
                          )
                        }
                      >
                        Aceitar
                      </button>
                      <button
                        className="btn-ghost text-sm"
                        onClick={() => run(() => removeFriend(f.id))}
                      >
                        Recusar
                      </button>
                    </PersonRow>
                  ))}
                </ul>
              </Panel>
            )}
            <Panel>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  Amigos{friends.length ? ` · ${friends.length}` : ""}
                </h2>
                {friends.length > 0 && (
                  <button
                    className="btn-secondary min-h-9 px-3 text-sm text-red-700"
                    onClick={() => setAsking(true)}
                  >
                    <RiLifebuoyLine className="size-4" /> Pedir ajuda
                  </button>
                )}
              </div>
              {!friends.length && !outgoing.length ? (
                <p className="py-4 text-sm text-ink-500">
                  Você ainda não adicionou ninguém. Use o código lá embaixo, em
                  "Adicionar amigos".
                </p>
              ) : (
                <>
                  <ul className="mt-2 divide-y divide-line">
                    {friendRows(network.slice(0, 5))}
                  </ul>
                  {network.length > 5 && (
                    <button
                      className="btn-ghost mt-1 -ml-2 text-sm"
                      onClick={() => setAllFriends(true)}
                    >
                      Ver todos os {network.length} amigos
                    </button>
                  )}
                </>
              )}
            </Panel>
          </div>
          <div className="grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Composer
              userId={userId}
              draft={draft}
              onDraftUsed={onDraftUsed}
              onPost={(text, photo) =>
                // Entra no topo do feed sem recarregar tudo.
                createPost(text, photo).then(
                  (post) => {
                    setFeed((f) => [post, ...f]);
                    onXp("post", post.id);
                    onNotice("Publicado para seus amigos.");
                    return true;
                  },
                  (e) => {
                    onNotice(
                      e instanceof Error ? e.message : "Falha ao publicar.",
                    );
                    return false;
                  },
                )
              }
              onNotice={onNotice}
            />
            {offline && (
              <p className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm text-ink-500">
                <RiWifiOffLine className="size-5 shrink-0" />
                Sem conexão. Mostrando o que foi carregado por último; curtir,
                comentar e publicar voltam com a internet.
              </p>
            )}
            {feed.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  Feed · {feed.length} post{feed.length === 1 ? "" : "s"}
                </h2>
                <button
                  className="btn-ghost text-sm text-ink-500"
                  aria-expanded={!feedHidden}
                  onClick={() => setFeedHidden(!feedHidden)}
                >
                  {feedHidden ? (
                    <>
                      <RiArrowDownSLine className="size-5" /> Mostrar feed
                    </>
                  ) : (
                    <>
                      <RiArrowUpSLine className="size-5" /> Minimizar feed
                    </>
                  )}
                </button>
              </div>
            )}
            {loading ? (
              <p className="py-10 text-center text-sm text-ink-500">
                Carregando…
              </p>
            ) : !feed.length ? (
              <Panel>
                <p className="py-6 text-center text-sm text-ink-500">
                  {friends.length
                    ? "Ainda não há posts. Que tal compartilhar uma conquista?"
                    : "Adicione amigos pelo código para ver os posts deles aqui."}
                </p>
              </Panel>
            ) : (
              !feedHidden &&
              feed.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  focused={focused === p.id}
                  userId={userId}
                  person={person}
                  collapsed={collapsed.includes(p.id)}
                  onCollapse={(on) => collapse(p.id, on)}
                  onOpenPerson={setProfile}
                  onLike={(on) => void like(p, on)}
                  onComment={(text, extra, photo) =>
                    void comment(p, text, extra, photo)
                  }
                  onDeleteComment={(c) => void removeComment(p, c)}
                  onDelete={() =>
                    optimistic(
                      () => setFeed((f) => f.filter((x) => x.id !== p.id)),
                      () => deletePost(p.id),
                    ).then((ok) => ok && onNotice("Post apagado."))
                  }
                  onReport={(target, reason) =>
                    run(
                      () => report(target, reason),
                      "Denúncia enviada. Obrigado por avisar.",
                    )
                  }
                  onShare={() => sharePost(p)}
                />
              ))
            )}
          </div>
          <div className="grid min-w-0 content-start gap-4 lg:col-start-2 lg:row-start-2">
            <AddFriend
              code={me?.friend_code}
              invite={invite}
              onNotice={onNotice}
              onAdd={(id) =>
                run(
                  () => requestFriend(userId, id),
                  "Pedido de amizade enviado.",
                )
              }
            />
            <Panel>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-brand-600"
                  checked={shareActivity}
                  onChange={(e) => onShareActivity(e.target.checked)}
                />
                <span>
                  <strong className="block font-medium">
                    Mostrar minhas atividades aos amigos
                  </strong>
                  <span className="text-[13px] text-ink-500">
                    Exercícios registrados e medalhas novas aparecem no feed dos
                    seus amigos. Peso, pressão e alimentação nunca são
                    publicados sozinhos.
                  </span>
                </span>
              </label>
            </Panel>
          </div>
          {allFriends && (
            <Sheet title="Amigos" onClose={() => setAllFriends(false)}>
              <ul className="divide-y divide-line">{friendRows(network)}</ul>
            </Sheet>
          )}
          {asking && (
            <AskHelp
              friends={friends
                .map((f) => person(other(f)))
                .filter((p): p is SocialProfile => !!p)}
              onClose={() => setAsking(false)}
              onSend={async (ids, message) => {
                const sent = await askForHelp(ids, message);
                onNotice(
                  sent
                    ? `Pedido de ajuda enviado para ${sent} amigo${sent > 1 ? "s" : ""}.`
                    : "Não foi possível enviar agora. Se já mandou algo há pouco, tente daqui a 1 hora.",
                );
                if (sent) setAsking(false);
              }}
            />
          )}
          {profile && (
            <FriendProfile
              person={person(profile)}
              me={profile === userId}
              posts={feed.filter((p) => p.author === profile)}
              friendship={friendships.find((f) => other(f) === profile)}
              onClose={() => setProfile(null)}
              onNudge={() =>
                run(
                  () => sendNudge(profile, nudgeMessage(undefined)),
                  "Orelha puxada! Seu amigo vai receber agora.",
                )
              }
              onRemove={async (f) => {
                if (
                  await confirmDialog({
                    title: "Desfazer amizade?",
                    message: "Vocês deixam de ver os posts um do outro.",
                    confirmLabel: "Desfazer",
                    danger: true,
                  })
                ) {
                  setProfile(null);
                  void run(() => removeFriend(f.id));
                }
              }}
            />
          )}
        </div>
      )}
    </>
  );
}

function PersonRow({
  person,
  detail,
  onOpen,
  children,
}: {
  person: SocialProfile | null | undefined;
  detail?: string;
  /** Toque na pessoa abre o perfil dela. */
  onOpen?: () => void;
  children?: React.ReactNode;
}) {
  const who = (
    <>
      <Avatar path={person?.photo ?? undefined} name={person?.name ?? "?"} />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-medium">
          {person?.name ?? "Pessoa"}
        </strong>
        {detail && (
          <small className="block text-[13px] text-ink-500">{detail}</small>
        )}
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 py-3">
      {onOpen ? (
        <button
          className="-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left hover:bg-surface"
          onClick={onOpen}
        >
          {who}
        </button>
      ) : (
        who
      )}
      {children && <span className="flex shrink-0 gap-1">{children}</span>}
    </li>
  );
}

function AddFriend({
  code,
  invite,
  onAdd,
  onNotice,
}: {
  code?: string;
  /** Código vindo de um link de convite: já busca a pessoa. */
  invite?: string | null;
  onAdd: (userId: string) => void;
  onNotice: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [found, setFound] = useState<SocialProfile | null>(null);
  const [busy, setBusy] = useState(false);
  // Fica minimizado; abre sozinho quando chega um convite.
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  async function search(c: string) {
    setBusy(true);
    try {
      const p = await findByCode(c);
      setFound(p);
      if (!p) onNotice("Nenhuma pessoa com esse código.");
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Falha na busca.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!invite || invite === code) return;
    setValue(invite);
    setOpen(true);
    void search(invite);
    box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite, code]);
  return (
    <div ref={box}>
      <Panel>
        <button
          className="-m-2 flex w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-lg p-2 text-left hover:bg-surface"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <RiUserAddLine className="size-5 text-brand-600" /> Adicionar amigos
          </span>
          {open ? (
            <RiArrowUpSLine className="size-5 text-ink-500" />
          ) : (
            <RiArrowDownSLine className="size-5 text-ink-500" />
          )}
        </button>
        {open && code && (
          <div className="mt-3 rounded-lg bg-surface p-3">
            <p className="text-[13px] text-ink-500">Seu código de amigo</p>
            <p className="mt-0.5 font-mono text-xl font-semibold tracking-widest">
              {code}
            </p>
            <button
              className="btn-ghost -ml-2 mt-1 text-sm"
              onClick={() =>
                shareText(
                  `Me adicione no Ritmo para a gente se motivar! Toque no link: ${inviteLink(code)} (ou use o código ${code} em Social → Amigos).`,
                )
                  .then((r) => r === "copied" && onNotice("Convite copiado."))
                  .catch(() => undefined)
              }
            >
              <RiShareLine className="size-4" /> Enviar convite
            </button>
          </div>
        )}
        {open && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void search(value);
            }}
          >
            <input
              className="input font-mono uppercase"
              aria-label="Código de amigo"
              placeholder="Código do amigo"
              maxLength={8}
              value={value}
              onChange={(e) => {
                setValue(
                  e.target.value.replace(/[^0-9a-f]/gi, "").toUpperCase(),
                );
                setFound(null);
              }}
            />
            <button
              className="btn-secondary shrink-0"
              disabled={busy || value.length < 8}
            >
              Buscar
            </button>
          </form>
        )}
        {open && found && (
          <ul className="mt-2">
            <PersonRow person={found}>
              <button
                className="btn-primary min-h-9 px-3 text-sm"
                onClick={() => {
                  onAdd(found.user_id);
                  setFound(null);
                  setValue("");
                }}
              >
                <RiUserAddLine className="size-4" /> Adicionar
              </button>
            </PersonRow>
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Composer({
  userId,
  draft,
  onDraftUsed,
  onPost,
  onNotice,
}: {
  userId: string;
  draft: string;
  onDraftUsed: () => void;
  onPost: (text: string, photo: string | null) => Promise<boolean>;
  onNotice: (text: string) => void;
}) {
  // Rascunho guardado no aparelho: não se perde se o celular fechar o app
  // (ex.: ao ir para o WhatsApp e voltar).
  const draftKey = `ritmo-post-draft-${userId}`;
  const [text, setTextState] = useState(() => {
    try {
      return localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const setText = (value: string) => {
    setTextState(value);
    try {
      if (value) localStorage.setItem(draftKey, value);
      else localStorage.removeItem(draftKey);
    } catch {
      /* só não guarda */
    }
  };
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [editing, setEditing] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  // Veio de "Compartilhar" numa medalha: desce até o post, já escrito.
  useEffect(() => {
    if (!draft) return;
    setText(draft);
    onDraftUsed();
    setTimeout(() => {
      box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      field.current?.focus({ preventScroll: true });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, onDraftUsed]);
  useEffect(() => {
    if (!photo) return setPreview("");
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  return (
    <div ref={box} className="scroll-mt-20">
      <Panel>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim() && !photo) return;
            setBusy(true);
            try {
              const path = photo
                ? await uploadPhoto(userId, "posts", photo)
                : null;
              // Só limpa o que foi escrito se a publicação deu certo.
              if (await onPost(text, path)) {
                setText("");
                setPhoto(null);
              }
            } catch (err) {
              onNotice(
                err instanceof Error ? err.message : "Falha ao publicar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <textarea
            ref={field}
            className="input min-h-20 py-2.5"
            placeholder="Conte uma conquista para seus amigos…"
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {preview && (
            <div className="relative mt-3 inline-block">
              <img src={preview} alt="" className="max-h-48 rounded-lg" />
              <button
                type="button"
                className="btn-secondary absolute top-2 right-2 min-h-8 px-2 text-xs"
                onClick={() => setPhoto(null)}
              >
                Remover
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="btn-ghost relative">
              <RiImageAddLine className="size-5" /> Foto
              <input
                className="absolute inset-0 cursor-pointer opacity-0"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setEditing(f);
                }}
              />
            </label>
            <button
              className="btn-primary"
              disabled={busy || (!text.trim() && !photo)}
            >
              {busy ? "Publicando…" : "Publicar"}
            </button>
          </div>
        </form>
        {editing && (
          <PhotoEditor
            source={editing}
            onClose={() => setEditing(null)}
            onSave={(file) => {
              setPhoto(file);
              setEditing(null);
            }}
          />
        )}
      </Panel>
    </div>
  );
}

function PostCard({
  post,
  focused,
  userId,
  person,
  collapsed,
  onCollapse,
  onOpenPerson,
  onLike,
  onComment,
  onDeleteComment,
  onDelete,
  onReport,
  onShare,
}: {
  post: Post;
  /** Aberto por uma notificação: comentários abertos e destaque. */
  focused?: boolean;
  userId: string;
  person: (id: string) => SocialProfile | null | undefined;
  /** Minimizado: só o autor e o começo do texto. */
  collapsed: boolean;
  onCollapse: (on: boolean) => void;
  onOpenPerson: (id: string) => void;
  onLike: (on: boolean) => void;
  onComment: (text: string, extra: CommentExtra, photo?: Blob) => void;
  onDeleteComment: (comment: Comment) => void;
  onDelete: () => void;
  onReport: (
    target: { post_id?: string; comment_id?: string },
    reason: string,
  ) => void;
  onShare: () => void;
}) {
  const [open, setOpen] = useState(!!focused);
  useEffect(() => {
    if (focused) setOpen(true);
  }, [focused]);
  const [comment, setComment] = useState("");
  // Comentário sendo respondido, foto anexada e o que está aberto para
  // escolher (reação, GIF ou câmera).
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [picking, setPicking] = useState<"" | "sticker" | "gif" | "camera">("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!photo) return setPreview("");
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const input = useRef<HTMLInputElement>(null);
  const send = (extra: Pick<CommentExtra, "gif" | "sticker"> = {}) => {
    if (!comment.trim() && !photo && !extra.gif && !extra.sticker) return;
    onComment(
      comment,
      { ...extra, parent: replyTo?.id ?? null },
      photo ?? undefined,
    );
    setComment("");
    setPhoto(null);
    setReplyTo(null);
    setPicking("");
  };
  // Respostas ficam sob o comentário de cima da conversa (um nível só).
  const byId = new Map(post.comments.map((c) => [c.id, c]));
  const root = (c: Comment): Comment | undefined => {
    let at: Comment | undefined = c;
    for (let i = 0; at?.parent_id && i < 20; i++) at = byId.get(at.parent_id);
    return at;
  };
  const threads = post.comments
    .filter((c) => !c.parent_id)
    .map((c) => ({
      comment: c,
      replies: post.comments.filter((r) => r.parent_id && root(r)?.id === c.id),
    }));
  const nameOf = (id: string) =>
    person(id)?.name ?? `Amigo(a) de ${author?.name ?? "alguém"}`;
  const rowProps = (c: Comment) => ({
    name: nameOf(c.author),
    canDelete: c.author === userId || mine,
    onReply: () => {
      setReplyTo(c);
      input.current?.focus();
    },
    onDelete: () => onDeleteComment(c),
    onReport: () => askReport({ comment_id: c.id }),
  });
  const KindIcon =
    post.kind === "medal"
      ? RiMedalFill
      : post.kind === "activity"
        ? RiRunFill
        : null;
  // Conta as curtidas feitas aqui, só para tocar a animação.
  const [pop, setPop] = useState(0);
  const author = person(post.author);
  const liked = post.likes.includes(userId);
  const mine = post.author === userId;
  const askReport = async (target: {
    post_id?: string;
    comment_id?: string;
  }) => {
    if (
      await confirmDialog({
        title: "Denunciar conteúdo?",
        message:
          "A denúncia vai para a equipe do Ritmo revisar. Você também pode desfazer a amizade.",
        confirmLabel: "Denunciar",
        danger: true,
      })
    )
      onReport(target, "Conteúdo impróprio");
  };
  return (
    <Panel
      className={`scroll-mt-20 ${focused ? "ring-2 ring-brand-300" : ""}`}
      id={`post-${post.id}`}
    >
      <div className="flex items-center gap-1">
        <button
          className="-my-1 -ml-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-surface"
          onClick={() => onOpenPerson(post.author)}
        >
          <Avatar
            path={author?.photo ?? undefined}
            name={author?.name ?? "?"}
          />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold">
              {author?.name ?? "Amigo"}
            </strong>
            <small className="block truncate text-[13px] text-ink-500">
              {collapsed && post.text
                ? postText(post)
                : `${ago(post.created_at)}${post.kind === "medal" ? " · conquista" : post.kind === "activity" ? " · atividade" : ""}`}
            </small>
          </span>
        </button>
        <button
          className="icon-btn"
          aria-label={collapsed ? "Mostrar post" : "Minimizar post"}
          aria-expanded={!collapsed}
          title={collapsed ? "Mostrar" : "Minimizar"}
          onClick={() => onCollapse(!collapsed)}
        >
          {collapsed ? (
            <RiArrowDownSLine className="size-5" />
          ) : (
            <RiArrowUpSLine className="size-5" />
          )}
        </button>
        <button
          className="icon-btn"
          aria-label={mine ? "Apagar post" : "Denunciar post"}
          onClick={async () =>
            mine
              ? (await confirmDialog({
                  title: "Apagar post?",
                  confirmLabel: "Apagar",
                  danger: true,
                })) && onDelete()
              : askReport({ post_id: post.id })
          }
        >
          {mine ? (
            <RiDeleteBin6Line className="size-[18px]" />
          ) : (
            <RiFlagLine className="size-[18px]" />
          )}
        </button>
      </div>
      {!collapsed && (
        <>
          {post.text && (
            <p className="mt-3 flex items-start gap-2 text-[15px] leading-relaxed whitespace-pre-wrap">
              {KindIcon && (
                <KindIcon
                  className="mt-0.5 size-5 shrink-0 text-brand-600"
                  aria-hidden
                />
              )}
              <span className="min-w-0">{postText(post)}</span>
            </p>
          )}
          {post.photo && (
            <div className="mt-3 [&_img]:size-auto [&_img]:max-h-96 [&_img]:w-full [&_img]:object-contain">
              <PhotoStrip paths={[post.photo]} />
            </div>
          )}
          <div className="mt-3 flex gap-1 border-t border-line pt-2">
            <button
              className={`btn-ghost text-sm ${liked ? "text-brand-600" : "text-ink-500"}`}
              aria-pressed={liked}
              onClick={() => {
                if (!liked) setPop((n) => n + 1);
                onLike(!liked);
              }}
            >
              {/* A key nova reinicia a animação a cada curtida. */}
              <span key={pop} className="relative inline-flex">
                {liked ? (
                  <RiHeart3Fill
                    className={`size-5 ${pop ? "animate-heart-pop" : ""}`}
                  />
                ) : (
                  <RiHeart3Line className="size-5" />
                )}
                {liked && pop > 0 && (
                  <span className="pointer-events-none absolute inset-0 animate-heart-ring rounded-full border-2 border-brand-500" />
                )}
              </span>
              {post.likes.length || ""}
            </button>
            <button
              className="btn-ghost text-sm text-ink-500"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <RiChat3Line className="size-5" />
              {post.comments.length || ""}
            </button>
            <button
              className="btn-ghost text-sm text-ink-500"
              onClick={onShare}
            >
              <RiShareLine className="size-5" /> Compartilhar
            </button>
          </div>
          {open && (
            <div className="mt-2 space-y-2">
              {threads.map(({ comment: c, replies }) => (
                <div key={c.id} className="space-y-1.5">
                  <CommentRow comment={c} {...rowProps(c)} />
                  {replies.length > 0 && (
                    <div className="ml-6 space-y-1.5 border-l-2 border-line pl-2">
                      {replies.map((r) => (
                        <CommentRow key={r.id} comment={r} {...rowProps(r)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {replyTo && (
                <p className="flex items-center gap-2 text-[13px] text-ink-500">
                  <RiReplyLine className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    Respondendo a {nameOf(replyTo.author)}
                  </span>
                  <button
                    className="icon-btn size-8"
                    aria-label="Cancelar resposta"
                    onClick={() => setReplyTo(null)}
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </p>
              )}
              {preview && (
                <div className="relative inline-block">
                  <img src={preview} alt="" className="max-h-32 rounded-lg" />
                  <button
                    type="button"
                    className="icon-btn absolute top-1 right-1 size-8 bg-white/90"
                    aria-label="Remover foto"
                    onClick={() => setPhoto(null)}
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  ref={input}
                  className="input"
                  placeholder={
                    replyTo ? "Escreva uma resposta" : "Escreva um comentário"
                  }
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  className="btn-secondary shrink-0"
                  disabled={!comment.trim() && !photo}
                >
                  Enviar
                </button>
              </form>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={`btn-ghost min-h-9 px-2 text-sm ${picking === "sticker" ? "text-brand-600" : "text-ink-500"}`}
                  aria-expanded={picking === "sticker"}
                  onClick={() =>
                    setPicking(picking === "sticker" ? "" : "sticker")
                  }
                >
                  <RiEmotionLine className="size-5" /> Reagir
                </button>
                {gifsEnabled() && (
                  <button
                    type="button"
                    className="btn-ghost min-h-9 px-2 text-sm text-ink-500"
                    onClick={() => setPicking("gif")}
                  >
                    <RiFileGifLine className="size-5" /> GIF
                  </button>
                )}
                <label className="btn-ghost relative min-h-9 px-2 text-sm text-ink-500">
                  <RiImageLine className="size-5" /> Galeria
                  <input
                    className="absolute inset-0 cursor-pointer opacity-0"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) setPhoto(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn-ghost min-h-9 px-2 text-sm text-ink-500"
                  onClick={() => setPicking("camera")}
                >
                  <RiCameraLine className="size-5" /> Câmera
                </button>
              </div>
              {picking === "sticker" && (
                <ul
                  className="grid grid-cols-7 gap-1 rounded-lg bg-surface p-2"
                  aria-label="Reações"
                >
                  {Object.entries(STICKERS).map(
                    ([key, [Icon, label, color]]) => (
                      <li key={key}>
                        <button
                          type="button"
                          className="grid size-10 place-items-center rounded-lg hover:bg-white"
                          aria-label={label}
                          title={label}
                          onClick={() => send({ sticker: key })}
                        >
                          <Icon className={`size-7 ${color}`} />
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              )}
              {picking === "gif" && (
                <GifPicker
                  onClose={() => setPicking("")}
                  onPick={(url) => send({ gif: url })}
                />
              )}
              {picking === "camera" && (
                <CameraCapture
                  title="Foto do comentário"
                  onClose={() => setPicking("")}
                  onCapture={(file) => {
                    setPhoto(file);
                    setPicking("");
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/** Um comentário (ou resposta): texto e/ou GIF, responder e apagar/denunciar. */
function CommentRow({
  comment: c,
  name,
  canDelete,
  onReply,
  onDelete,
  onReport,
}: {
  comment: Comment;
  name: string;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  // Ainda indo para o servidor (ver comment() em Community).
  const sending = c.id.startsWith("tmp-");
  const [Sticker, stickerLabel, stickerColor] =
    (c.sticker && STICKERS[c.sticker]) || [];
  return (
    <div
      className={`flex items-start gap-2 rounded-lg bg-surface p-2.5 ${sending ? "opacity-60" : ""}`}
    >
      <span className="min-w-0 flex-1 text-sm">
        <strong className="font-medium">{name}</strong> {c.text}
        {Sticker && (
          <Sticker
            className={`mt-1 block size-10 ${stickerColor}`}
            aria-label={stickerLabel}
          />
        )}
        {c.photo && (
          <span className="block [&_img]:size-auto [&_img]:max-h-48 [&_img]:max-w-full">
            <PhotoStrip paths={[c.photo]} />
          </span>
        )}
        {c.gif && (
          <img
            src={c.gif}
            alt="GIF"
            loading="lazy"
            className="mt-1.5 max-h-40 rounded-lg"
          />
        )}
        <span className="mt-0.5 flex items-center gap-3 text-xs text-ink-400">
          {ago(c.created_at)}
          {!sending && (
            <button
              className="font-medium text-ink-500 hover:text-ink-700"
              onClick={onReply}
            >
              Responder
            </button>
          )}
        </span>
      </span>
      <button
        className="icon-btn size-8"
        disabled={sending}
        aria-label={canDelete ? "Apagar comentário" : "Denunciar comentário"}
        onClick={canDelete ? onDelete : onReport}
      >
        {canDelete ? (
          <RiDeleteBin6Line className="size-4" />
        ) : (
          <RiFlagLine className="size-4" />
        )}
      </button>
    </div>
  );
}

/**
 * Pedir ajuda: a pessoa escolhe uma mensagem (ou escreve a sua) e para quais
 * amigos mandar. Chega como notificação importante para eles.
 */
function AskHelp({
  friends,
  onClose,
  onSend,
}: {
  friends: SocialProfile[];
  onClose: () => void;
  onSend: (ids: string[], message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState<string>(HELP_MESSAGES[0]);
  const [to, setTo] = useState(() => friends.map((f) => f.user_id));
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Pedir ajuda aos amigos" onClose={onClose}>
      <p className="text-sm text-ink-500">
        Seus amigos recebem uma notificação para puxar a sua orelha.
      </p>
      <h3 className="mt-4 text-sm font-semibold">Mensagem</h3>
      <div className="mt-2 grid gap-2">
        {HELP_MESSAGES.map((m) => (
          <button
            key={m}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm ${message === m ? "border-red-400 bg-red-500/10 font-medium" : "border-line hover:bg-surface"}`}
            aria-pressed={message === m}
            onClick={() => setMessage(m)}
          >
            {m}
          </button>
        ))}
        <textarea
          className="input min-h-16 py-2.5"
          placeholder="Ou escreva do seu jeito…"
          maxLength={200}
          value={HELP_MESSAGES.includes(message) ? "" : message}
          onChange={(e) => setMessage(e.target.value || HELP_MESSAGES[0])}
        />
      </div>
      <h3 className="mt-4 text-sm font-semibold">Para quem</h3>
      <ul className="mt-1 divide-y divide-line">
        {friends.map((f) => (
          <li key={f.user_id}>
            <label className="flex cursor-pointer items-center gap-3 py-2.5">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-brand-600"
                checked={to.includes(f.user_id)}
                onChange={(e) =>
                  setTo((t) =>
                    e.target.checked
                      ? [...t, f.user_id]
                      : t.filter((x) => x !== f.user_id),
                  )
                }
              />
              <Avatar path={f.photo ?? undefined} name={f.name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {f.name}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        className="btn-primary mt-4 w-full"
        disabled={busy || !to.length || !message.trim()}
        onClick={async () => {
          setBusy(true);
          await onSend(to, message).finally(() => setBusy(false));
        }}
      >
        <RiLifebuoyLine className="size-5" />
        {busy
          ? "Enviando…"
          : `Pedir ajuda${to.length ? ` a ${to.length} amigo${to.length > 1 ? "s" : ""}` : ""}`}
      </button>
    </Sheet>
  );
}

/** Perfil de um amigo: nível, bichinho, medalhas e os posts dele. */
function FriendProfile({
  person,
  me,
  posts,
  friendship,
  onClose,
  onNudge,
  onRemove,
}: {
  person: SocialProfile | null | undefined;
  /** É o próprio perfil (tocou no próprio post). */
  me: boolean;
  posts: Post[];
  friendship?: Friendship;
  onClose: () => void;
  onNudge: () => void;
  onRemove: (f: Friendship) => void;
}) {
  const level = person?.level ?? 1;
  const pet = petStage(level);
  return (
    <Sheet title={person?.name ?? "Perfil"} onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar
          path={person?.photo ?? undefined}
          name={person?.name ?? "?"}
          size={64}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">
            {person?.name ?? "Amigo"}
          </p>
          <p className="text-sm text-ink-500">
            Nível {level} · {person?.medals ?? 0} medalha
            {person?.medals === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 rounded-xl bg-surface p-3">
        <PetArt stage={pet} className="size-20" alive />
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-700">
            {pet.form === "egg" ? pet.name : `${pet.name} · ${pet.formLabel}`}
          </p>
          <p className="font-semibold">{pet.label}</p>
        </div>
      </div>
      {!me && friendship?.status === "accepted" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary flex-1" onClick={onNudge}>
            <RiAlarmWarningLine className="size-5" /> Puxar orelha
          </button>
          <button
            className="btn-ghost text-ink-500"
            onClick={() => onRemove(friendship)}
          >
            Desfazer amizade
          </button>
        </div>
      )}
      <h3 className="mt-5 text-sm font-semibold">Posts recentes</h3>
      {posts.length ? (
        <ul className="mt-1 divide-y divide-line">
          {posts.slice(0, 10).map((p) => (
            <li key={p.id} className="py-2.5 text-sm">
              <p className="line-clamp-3 whitespace-pre-wrap">
                {postText(p) || (
                  <span className="inline-flex items-center gap-1 text-ink-500">
                    <RiImageLine className="size-4" /> Foto
                  </span>
                )}
              </p>
              <small className="text-xs text-ink-500">
                {ago(p.created_at)} · {p.likes.length} curtida
                {p.likes.length === 1 ? "" : "s"} · {p.comments.length}{" "}
                comentário{p.comments.length === 1 ? "" : "s"}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink-500">Nenhum post recente.</p>
      )}
    </Sheet>
  );
}
