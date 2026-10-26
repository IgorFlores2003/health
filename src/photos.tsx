import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const BUCKET = "assets";
const MAX_SIDE = 1600;
const URL_TTL = 60 * 60;
const urls = new Map<string, { url: string; expires: number }>();

/** Reduz a foto no aparelho antes do envio (fotos de celular passam de 5 MB). */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/"))
    throw Error("Escolha um arquivo de imagem.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) =>
    canvas.toBlob(ok, "image/jpeg", 0.85),
  );
  if (!blob) throw Error("Não foi possível processar a imagem.");
  return blob;
}

/** Envia a foto e devolve somente o caminho, que é o que vai para o banco. */
export async function uploadPhoto(
  userId: string,
  folder: "profile" | `exercises/${string}`,
  file: File,
) {
  if (!supabase) throw Error("Conecte-se para enviar fotos.");
  const path = `${userId}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await compress(file), { contentType: "image/jpeg" });
  if (error) throw Error("Não foi possível enviar a foto. Tente novamente.");
  return path;
}

export async function removePhotos(paths: string[] | undefined) {
  if (!supabase || !paths?.length) return;
  paths.forEach((p) => urls.delete(p));
  await supabase.storage.from(BUCKET).remove(paths);
}

/** O bucket é privado: as imagens são exibidas por URLs assinadas temporárias. */
export function usePhotoUrls(paths: string[] | undefined) {
  const key = (paths || []).join("|");
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!supabase || !key) return;
    let active = true;
    const now = Date.now();
    const list = key.split("|");
    const missing = list.filter((p) => (urls.get(p)?.expires ?? 0) <= now);
    const publish = () =>
      active &&
      setMap(
        Object.fromEntries(
          list.flatMap((p) => (urls.has(p) ? [[p, urls.get(p)!.url]] : [])),
        ),
      );
    if (!missing.length) {
      publish();
      return;
    }
    void supabase.storage
      .from(BUCKET)
      .createSignedUrls(missing, URL_TTL)
      .then(({ data }) => {
        for (const item of data || [])
          if (item.path && item.signedUrl)
            urls.set(item.path, {
              url: item.signedUrl,
              expires: now + (URL_TTL - 60) * 1000,
            });
        publish();
      });
    return () => {
      active = false;
    };
  }, [key]);
  return map;
}

export function Avatar({
  path,
  name,
  size = 36,
}: {
  path?: string;
  name: string;
  size?: number;
}) {
  const src = usePhotoUrls(path ? [path] : undefined)[path || ""];
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : name.slice(0, 1).toUpperCase() || "V"}
    </span>
  );
}

export function PhotoStrip({ paths }: { paths?: string[] }) {
  const map = usePhotoUrls(paths);
  if (!paths?.length) return null;
  return (
    <span className="photo-strip">
      {paths.map((p) =>
        map[p] ? (
          <a key={p} href={map[p]} target="_blank" rel="noreferrer">
            <img src={map[p]} alt="Foto do exercício" loading="lazy" />
          </a>
        ) : (
          <span key={p} className="photo-placeholder" />
        ),
      )}
    </span>
  );
}
