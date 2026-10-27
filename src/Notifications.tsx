import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  RiAlarmWarningLine,
  RiChat3Line,
  RiHandHeartLine,
  RiHeart3Line,
  RiNotification3Line,
  RiUserAddLine,
  RiUserFollowLine,
} from "react-icons/ri";
import {
  lastSeen,
  loadNotifications,
  markAllSeen,
  type Notice,
} from "./notificationFeed";
import { ago, PageTitle, Panel } from "./ui";

const ICONS: Record<Notice["kind"], IconType> = {
  nudge: RiAlarmWarningLine,
  friend_request: RiUserAddLine,
  friend_accepted: RiUserFollowLine,
  comment: RiChat3Line,
  like: RiHeart3Line,
  otter_invite: RiHandHeartLine,
  otter_helper: RiHandHeartLine,
};

/** Aba Notificações: o que os amigos fizeram, das mais novas às antigas. */
export default function Notifications({
  userId,
  onOpen,
  onSeen,
}: {
  userId: string;
  /** Leva para a aba da notificação (ex.: Amigos). */
  onOpen: (tab: Notice["tab"]) => void;
  /** Avisa que tudo foi visto (zera o número no sino). */
  onSeen: () => void;
}) {
  const [list, setList] = useState<Notice[] | null>(null);
  // Guarda o "visto até" de antes de abrir, para destacar as novas.
  const [seen] = useState(() => lastSeen(userId));
  useEffect(() => {
    loadNotifications(userId)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => {
        markAllSeen(userId);
        onSeen();
      });
  }, [userId, onSeen]);
  return (
    <>
      <PageTitle
        title="Notificações"
        text="Puxões de orelha, amigos, comentários, curtidas e a lontra."
      />
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
              const Icon = ICONS[n.kind];
              const fresh = !!n.at && n.at > seen;
              return (
                <li key={n.id}>
                  <button
                    className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-surface ${fresh ? "bg-brand-50" : ""}`}
                    onClick={() => onOpen(n.tab)}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
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
