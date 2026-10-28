/**
 * Busca de GIFs no GIPHY para os comentários. A chave é pública (feita para
 * ficar no app); sem ela, o botão de GIF não aparece.
 */
const KEY = import.meta.env.VITE_GIPHY_KEY as string | undefined;

export const gifsEnabled = () => !!KEY;

export type Gif = { id: string; title: string; url: string; preview: string };

/** O banco só aceita GIFs servidos pelo GIPHY (ver migração de respostas). */
const ALLOWED = /^https:\/\/media[0-9]*\.giphy\.com\//;

type GiphyItem = {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string };
    fixed_height_small?: { url: string };
  };
};

/** Em alta (sem busca) ou resultados da busca, em português. */
export async function searchGifs(query: string): Promise<Gif[]> {
  if (!KEY) return [];
  const q = query.trim();
  const params = new URLSearchParams({
    api_key: KEY,
    limit: "24",
    rating: "pg",
    lang: "pt",
    ...(q ? { q } : {}),
  });
  const res = await fetch(
    `https://api.giphy.com/v1/gifs/${q ? "search" : "trending"}?${params}`,
  );
  if (!res.ok) throw Error("Não foi possível buscar GIFs agora.");
  const { data } = (await res.json()) as { data: GiphyItem[] };
  return data
    .map((g) => ({
      id: g.id,
      title: g.title,
      url: g.images.fixed_height.url,
      preview: g.images.fixed_height_small?.url ?? g.images.fixed_height.url,
    }))
    .filter((g) => ALLOWED.test(g.url) && g.url.length <= 500);
}
