import { useState } from "react";
import { RiExternalLinkLine, RiPlayFill } from "react-icons/ri";
import { VIDEOS, type Video } from "./videoList";

const TOPICS = ["Todos", ...new Set(VIDEOS.map((v) => v.topic))];

/** Aba de vídeos educativos: miniatura primeiro, o player só carrega ao tocar. */
export default function Videos() {
  const [topic, setTopic] = useState("Todos");
  const list = VIDEOS.filter((v) => topic === "Todos" || v.topic === topic);
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Vídeos
        </h1>
        <p className="mt-1 text-ink-500">
          Conteúdo educativo de fontes de saúde reconhecidas.
        </p>
      </div>
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Tema"
      >
        {TOPICS.map((t) => (
          <button
            key={t}
            role="radio"
            aria-checked={topic === t}
            className="min-h-9 rounded-full border border-line px-3 text-sm text-ink-700 aria-checked:border-brand-500 aria-checked:bg-brand-50 aria-checked:font-medium aria-checked:text-brand-700"
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
      <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
        Os vídeos são de terceiros e servem para informação geral; não
        substituem a orientação do seu médico ou nutricionista.
      </p>
    </>
  );
}

function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  const watch = `https://www.youtube.com/watch?v=${video.id}`;
  return (
    <article className="card min-w-0 overflow-hidden p-0">
      <div className="relative aspect-video bg-ink-900">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            className="group absolute inset-0"
            aria-label={`Assistir: ${video.title}`}
            onClick={() => setPlaying(true)}
          >
            <img
              src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30">
              <span className="grid size-14 place-items-center rounded-full bg-white/95 text-brand-600 shadow">
                <RiPlayFill className="size-8" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="p-4">
        <span className="text-xs font-medium text-brand-700">
          {video.topic}
        </span>
        <h2 className="mt-1 text-[15px] leading-snug font-semibold">
          {video.title}
        </h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate text-[13px] text-ink-500">
            {video.channel}
          </span>
          <a
            href={watch}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost -mr-2 shrink-0 text-sm"
          >
            YouTube <RiExternalLinkLine className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
