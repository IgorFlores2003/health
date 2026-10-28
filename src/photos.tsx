import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const BUCKET = "assets";
const MAX_SIDE = 1600;
const URL_TTL = 60 * 60;
const urls = new Map<string, { url: string; expires: number }>();

/**
 * Fotos salvas sem internet: ficam no IndexedDB deste aparelho com o caminho
 * definitivo e sobem em flushPhotos() quando a rede volta. Enquanto isso, o
 * app mostra a cópia local.
 */
const pending = new Map<string, Blob>();
function photoStore(mode: IDBTransactionMode) {
  return new Promise<IDBObjectStore>((ok, fail) => {
    const req = indexedDB.open("ritmo-photos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("pending");
    req.onsuccess = () =>
      ok(req.result.transaction("pending", mode).objectStore("pending"));
    req.onerror = () => fail(req.error);
  });
}
const done = (req: IDBRequest) =>
  new Promise<void>((ok, fail) => {
    req.onsuccess = () => ok();
    req.onerror = () => fail(req.error);
  });
const pendingReady: Promise<void> = photoStore("readonly")
  .then(
    (store) =>
      new Promise<void>((ok) => {
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return ok();
          pending.set(String(cursor.key), cursor.value as Blob);
          cursor.continue();
        };
        req.onerror = () => ok();
      }),
  )
  .catch(() => undefined);
async function keepPending(path: string, blob: Blob) {
  await done((await photoStore("readwrite")).put(blob, path));
  pending.set(path, blob);
}
async function dropPending(path: string) {
  pending.delete(path);
  await done((await photoStore("readwrite")).delete(path)).catch(
    () => undefined,
  );
}

/** Envia as fotos que ficaram guardadas sem internet. */
export async function flushPhotos() {
  await pendingReady;
  if (!supabase || !navigator.onLine) return;
  for (const [path, blob] of [...pending]) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/jpeg" });
    // Já existe: subiu numa tentativa anterior.
    if (!error || /exist|duplicate/i.test(error.message))
      await dropPending(path);
  }
}

/** Reduz a foto no aparelho antes do envio (fotos de celular passam de 5 MB). */
async function compress(file: Blob): Promise<Blob> {
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

/** Bytes em base64 (em blocos, para arquivos grandes não estourarem a pilha). */
export function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Imagem reduzida em base64, para a IA ler o print/foto. */
export async function photoBase64(file: File) {
  return toBase64(new Uint8Array(await (await compress(file)).arrayBuffer()));
}

/** Envia a foto e devolve somente o caminho, que é o que vai para o banco. */
export async function uploadPhoto(
  userId: string,
  folder:
    | "profile"
    | "posts"
    | "comments"
    | `exercises/${string}`
    | `pressures/${string}`
    | `weights/${string}`,
  file: Blob,
  /** Caminho fixo (ex.: a original de uma foto editada). */
  at?: string,
) {
  if (!supabase) throw Error("Conecte-se para enviar fotos.");
  const path = at ?? `${userId}/${folder}/${crypto.randomUUID()}.jpg`;
  const blob = await compress(file);
  // Sem internet: guarda no aparelho e envia quando a rede voltar.
  if (!navigator.onLine) {
    await keepPending(path, blob);
    return path;
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error && !navigator.onLine) await keepPending(path, blob);
  else if (error)
    throw Error("Não foi possível enviar a foto. Tente novamente.");
  return path;
}

/** Onde fica a foto original (sem edição) de uma foto de perfil editada. */
export const originalOf = (path: string) =>
  path.replace(/\.jpg$/, "-original.jpg");

/** Baixa uma foto salva (ex.: para editar a foto de perfil). */
export async function downloadPhoto(path: string) {
  await pendingReady;
  const local = pending.get(path);
  if (local) return local;
  if (!supabase) throw Error("Conecte-se para editar a foto.");
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw Error("Não foi possível abrir a foto salva.");
  return data;
}

export async function removePhotos(paths: string[] | undefined) {
  if (!supabase || !paths?.length) return;
  paths.forEach((p) => urls.delete(p));
  await Promise.all(paths.map(dropPending));
  await supabase.storage.from(BUCKET).remove(paths);
}

/** O bucket é privado: as imagens são exibidas por URLs assinadas temporárias. */
export function usePhotoUrls(paths: string[] | undefined) {
  const key = (paths || []).join("|");
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!supabase || !key) return;
    const db = supabase;
    let active = true;
    const list = key.split("|");
    const publish = () =>
      active &&
      setMap(
        Object.fromEntries(
          list.flatMap((p) => (urls.has(p) ? [[p, urls.get(p)!.url]] : [])),
        ),
      );
    void pendingReady.then(() => {
      const now = Date.now();
      // Foto ainda não enviada: mostra a cópia guardada no aparelho.
      for (const p of list)
        if (pending.has(p) && !urls.has(p))
          urls.set(p, {
            url: URL.createObjectURL(pending.get(p)!),
            expires: Infinity,
          });
      const missing = list.filter((p) => (urls.get(p)?.expires ?? 0) <= now);
      if (!missing.length) return publish();
      void db.storage
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
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase() || "V"
      )}
    </span>
  );
}

export function PhotoStrip({ paths }: { paths?: string[] }) {
  const map = usePhotoUrls(paths);
  if (!paths?.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {paths.map((p) =>
        map[p] ? (
          <a
            key={p}
            href={map[p]}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg"
          >
            <img
              src={map[p]}
              alt="Foto do exercício"
              loading="lazy"
              className="size-14 rounded-lg bg-surface object-cover"
            />
          </a>
        ) : (
          <span key={p} className="block size-14 rounded-lg bg-surface" />
        ),
      )}
    </span>
  );
}
