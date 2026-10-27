/** Aba de vídeos educativos: o vídeo vai dentro do app (public/videos). */
export default function Videos() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Vídeos
        </h1>
        <p className="mt-1 text-ink-500">Dicas para cuidar da sua saúde.</p>
      </div>
      <article className="card max-w-3xl overflow-hidden p-0">
        <video
          className="aspect-video w-full bg-ink-900"
          src="videos/5-dicas-para-beber-mais-agua.mp4"
          controls
          playsInline
          preload="metadata"
        />
        <div className="p-4">
          <span className="text-xs font-medium text-brand-700">Hidratação</span>
          <h2 className="mt-1 text-[15px] leading-snug font-semibold">
            5 dicas para beber mais água
          </h2>
        </div>
      </article>
      <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
        Conteúdo para informação geral; não substitui a orientação do seu
        médico ou nutricionista.
      </p>
    </>
  );
}
