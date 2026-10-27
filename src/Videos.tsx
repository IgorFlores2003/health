import { useState } from "react";
import { RiPlayFill, RiTimeLine } from "react-icons/ri";
import Sheet from "./Sheet";
import { VIDEOS, type Video } from "./videoCatalog";
import Choice from "./Choice";

const TOPICS = ["Todos", ...new Set(VIDEOS.map((v) => v.topic))];
const length = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Aba de vídeos: cards pequenos com resumo; o player abre ao tocar. */
export default function Videos() {
  const [topic, setTopic] = useState("Todos");
  const [open, setOpen] = useState<Video | null>(null);
  const list = VIDEOS.filter((v) => topic === "Todos" || v.topic === topic);
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Vídeos
        </h1>
        <p className="mt-1 text-ink-500">Dicas curtas para cuidar da saúde.</p>
      </div>
      <Choice
        variant="chips"
        className="mb-5"
        label="Tema"
        value={topic}
        onChange={setTopic}
        options={TOPICS.map((t) => ({
          id: t,
          label: (
            <>
              {t}
              <span className="ml-1.5 text-ink-400">
                {t === "Todos"
                  ? VIDEOS.length
                  : VIDEOS.filter((v) => v.topic === t).length}
              </span>
            </>
          ),
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => (
          <button
            key={v.id}
            className="card group min-w-0 overflow-hidden p-0 text-left transition-shadow hover:shadow-md"
            onClick={() => setOpen(v)}
            aria-label={`Assistir: ${v.title}`}
          >
            <span className="relative block aspect-video bg-ink-900">
              <img
                src={`videos/${v.id}.jpg`}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
              <span className="absolute inset-0 grid place-items-center bg-black/10 group-hover:bg-black/25">
                <span className="grid size-12 place-items-center rounded-full bg-white/95 text-brand-600 shadow">
                  <RiPlayFill className="size-7" />
                </span>
              </span>
              <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
                {length(v.seconds)}
              </span>
            </span>
            <span className="block p-4">
              <span className="text-xs font-medium text-brand-700">
                {v.topic}
              </span>
              <span className="mt-1 block text-[15px] leading-snug font-semibold">
                {v.title}
              </span>
              <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-500">
                {v.summary}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
        Conteúdo para informação geral; não substitui a orientação do seu médico
        ou nutricionista.
      </p>
      {open && (
        <Sheet title={open.title} onClose={() => setOpen(null)}>
          <video
            className="aspect-video w-full rounded-xl bg-ink-900"
            src={`videos/${open.id}.mp4`}
            poster={`videos/${open.id}.jpg`}
            controls
            autoPlay
            playsInline
          />
          <div className="mt-4 flex items-center gap-3 text-[13px] text-ink-500">
            <span className="font-medium text-brand-700">{open.topic}</span>
            <span className="inline-flex items-center gap-1">
              <RiTimeLine className="size-4" /> {length(open.seconds)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            {open.summary}
          </p>
          <h3 className="mt-4 text-sm font-semibold">No vídeo</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-700 marker:text-brand-600">
            {open.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}
