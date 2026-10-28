import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  RiAlarmWarningFill,
  RiChat3Fill,
  RiHandHeartFill,
  RiHeart3Fill,
  RiLifebuoyFill,
  RiNotification3Line,
  RiQuillPenFill,
  RiReplyFill,
  RiTeamFill,
  RiUserAddFill,
  RiUserFollowFill,
  RiWifiOffLine,
} from "react-icons/ri";
import {
  cachedNotifications,
  lastSeen,
  loadNotifications,
  markAllSeen,
  type Notice,
} from "./notificationFeed";
import { ago, PageTitle, Panel } from "./ui";

/**
 * Cada tipo com um ícone e uma cor só dele, para reconhecer de relance (os
 * mesmos da barra de status do Android: res/drawable/ic_stat_*.xml).
 */
const ICONS: Record<Notice["kind"], [IconType, string]> = {
  nudge: [RiAlarmWarningFill, "bg-orange-500/15 text-orange-600"],
  help: [RiLifebuoyFill, "bg-red-500/15 text-red-600"],
  friend_request: [RiUserAddFill, "bg-pink-500/15 text-pink-600"],
  friend_accepted: [RiUserFollowFill, "bg-fuchsia-500/15 text-fuchsia-600"],
  post: [RiQuillPenFill, "bg-indigo-500/15 text-indigo-600"],
  comment: [RiChat3Fill, "bg-blue-500/15 text-blue-600"],
  reply: [RiReplyFill, "bg-sky-500/15 text-sky-600"],
  like: [RiHeart3Fill, "bg-rose-500/15 text-rose-600"],
  otter_invite: [RiHandHeartFill, "bg-emerald-500/15 text-emerald-600"],
  otter_helper: [RiTeamFill, "bg-teal-500/15 text-teal-600"],
};

/** Aba Notificações: o que os amigos fizeram, das mais novas às antigas. */
export default function Notifications({
  userId,
  onOpen,
  onSeen,
}: {
  userId: string;
  /** Leva para a tela da notificação (ex.: Social → Amigos). */
  onOpen: (notice: Notice) => void;
  /** Avisa que tudo foi visto (zera o número no sino). */
  onSeen: () => void;
}) {
  const [list, setList] = useState<Notice[] | null>(null);
  const [offline, setOffline] = useState(false);
  // Guarda o "visto até" de antes de abrir, para destacar as novas.
  const [seen] = useState(() => lastSeen(userId));
  useEffect(() => {
    loadNotifications(userId)
      .then(setList)
      // Sem internet: mostra a última lista carregada neste aparelho.
      .catch(() => {
        setOffline(true);
        setList(cachedNotifications(userId));
      })
      .finally(() => {
        markAllSeen(userId);
        onSeen();
      });
  }, [userId, onSeen]);
  return (
    <>
      <PageTitle
        title="Notificações"
        text="Puxões de orelha, amigos, posts, comentários, respostas, curtidas e a lontra."
      />
      {offline && (
        <p className="mb-3 flex max-w-3xl items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm text-ink-500">
          <RiWifiOffLine className="size-5 shrink-0" />
          Sem conexão. Mostrando as últimas notificações carregadas.
        </p>
      )}
      <Panel className="max-w-3xl p-2">
        {list === null ? (
          <p className="py-10 text-center text-sm text-ink-500">Carregando…</p>
        ) : !list.length ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <RiNotification3Line className="size-8 text-ink-400" />
            <p className="text-sm text-ink-500">
              Nada por aqui ainda. Quando seus amigos interagirem com você, vai
              aparecer aqui.
            </p>
          </div>
        ) : (
          <ul>
            {list.map((n) => {
              const [Icon, color] = ICONS[n.kind];
              const fresh = !!n.at && n.at > seen;
              return (
                <li key={n.id}>
                  <button
                    className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-surface ${fresh ? "bg-brand-50" : ""}`}
                    onClick={() => onOpen(n)}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full ${color}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">
                        {n.text}
                      </span>
                      {n.at && (
                        <span className="text-xs text-ink-500">
                          {ago(n.at)}
                        </span>
                      )}
                    </span>
                    {fresh && (
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-600"
                        aria-label="Nova"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
