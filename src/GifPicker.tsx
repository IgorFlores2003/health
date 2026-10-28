import { useEffect, useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { searchGifs, type Gif } from "./giphy";
import Sheet from "./Sheet";

/** Escolher um GIF do GIPHY: em alta ao abrir, busca enquanto digita. */
export default function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    const id = setTimeout(
      () =>
        searchGifs(query).then(
          (list) => current && (setGifs(list), setError("")),
          (e) =>
            current &&
            setError(
              navigator.onLine
                ? e instanceof Error
                  ? e.message
                  : "Falha na busca."
                : "Sem conexão. Os GIFs voltam quando a internet voltar.",
            ),
        ),
      query ? 400 : 0,
    );
    return () => {
      current = false;
      clearTimeout(id);
    };
  }, [query]);
  return (
    <Sheet title="Escolher GIF" onClose={onClose}>
      <label className="relative block">
        <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-10"
          placeholder="Buscar GIFs"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {error ? (
        <p className="py-10 text-center text-sm text-ink-500">{error}</p>
      ) : gifs === null ? (
        <p className="py-10 text-center text-sm text-ink-500">Carregando…</p>
      ) : !gifs.length ? (
        <p className="py-10 text-center text-sm text-ink-500">
          Nenhum GIF encontrado.
        </p>
      ) : (
        <ul className="mt-3 columns-2 gap-2 sm:columns-3">
          {gifs.map((g) => (
            <li key={g.id} className="mb-2 break-inside-avoid">
              <button
                className="block w-full overflow-hidden rounded-lg bg-surface"
                onClick={() => onPick(g.url)}
                aria-label={g.title || "GIF"}
              >
                <img src={g.preview} alt="" loading="lazy" className="w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Exigido pelos termos do GIPHY. */}
      <p className="mt-3 text-center text-xs text-ink-400">Powered by GIPHY</p>
    </Sheet>
  );
}
