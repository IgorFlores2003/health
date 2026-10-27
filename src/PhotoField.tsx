import { useEffect, useMemo, useRef, useState } from "react";
import {
  RiCloseLine,
  RiCropLine,
  RiImageAddLine,
  RiSparkling2Line,
} from "react-icons/ri";
import PhotoEditor from "./PhotoEditor";
import { confirmDialog } from "./confirm";
import { usePhotoUrls } from "./photos";

/**
 * Campo de fotos do formulário. As fotos novas vão em name="photos" e, ao
 * editar, as salvas que continuam vão em name="keptPhotos". Com onRead,
 * oferece ler a primeira foto com a IA para preencher os campos.
 */
export default function PhotoField({
  label,
  hint,
  max,
  onRead,
  saved = [],
}: {
  label: string;
  hint: string;
  max: number;
  onRead?: (file: File, form: HTMLFormElement | null) => Promise<string>;
  /** Caminhos das fotos já salvas no registro em edição. */
  saved?: string[];
}) {
  const field = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [kept, setKept] = useState(saved);
  const [reading, setReading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const savedUrls = usePhotoUrls(kept);
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  // O input com name="photos" reflete a lista atual (com as removidas fora).
  useEffect(() => {
    if (!field.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    field.current.files = dt.files;
  }, [files]);
  const free = max - kept.length - files.length;

  function add(list: FileList | null) {
    const chosen = [...(list || [])];
    if (chosen.length > free)
      setMessage({
        text: `Máximo de ${max} fotos por registro. Entraram as primeiras ${Math.max(free, 0)}.`,
        error: true,
      });
    else setMessage(undefined);
    setFiles((f) => [...f, ...chosen.slice(0, Math.max(free, 0))]);
  }
  async function read() {
    const file = files[0];
    if (!file || !onRead) return;
    setReading(true);
    setMessage(undefined);
    try {
      setMessage({ text: await onRead(file, field.current!.form) });
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Não foi possível ler a imagem.",
        error: true,
      });
    } finally {
      setReading(false);
    }
  }

  const thumbs = [
    ...kept.map((p) => ({
      key: p,
      src: savedUrls[p],
      remove: async () => {
        if (
          await confirmDialog({
            title: "Remover foto?",
            message: "A foto será apagada quando você salvar o registro.",
            confirmLabel: "Remover",
            danger: true,
          })
        )
          setKept((k) => k.filter((x) => x !== p));
      },
    })),
    ...files.map((f, i) => ({
      key: `${f.name}-${f.lastModified}-${i}`,
      src: previews[i],
      edit: () => setEditing(i),
      remove: () => {
        setFiles((list) => list.filter((_, j) => j !== i));
        setMessage(undefined);
      },
    })),
  ];

  return (
    <div>
      <span className="label">
        {label}
        <span className="font-normal text-ink-400">
          {" "}
          · {kept.length + files.length}/{max}
        </span>
      </span>
      <input ref={field} type="file" name="photos" multiple hidden />
      {saved.length > 0 && (
        <input type="hidden" name="keptPhotos" value={JSON.stringify(kept)} />
      )}
      {thumbs.length > 0 && (
        <ul className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {thumbs.map((t) => (
            <li key={t.key} className="relative aspect-square">
              {t.src ? (
                <img
                  src={t.src}
                  alt=""
                  className="size-full rounded-lg border border-line object-cover"
                />
              ) : (
                <span className="block size-full animate-pulse rounded-lg bg-surface" />
              )}
              {"edit" in t && (
                <button
                  type="button"
                  aria-label="Enquadrar foto"
                  title="Enquadrar"
                  className="absolute -right-1.5 -bottom-1.5 grid size-7 place-items-center rounded-full bg-ink-900 text-white shadow ring-2 ring-white hover:bg-brand-700"
                  onClick={t.edit}
                >
                  <RiCropLine className="size-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="Remover foto"
                className="absolute -top-1.5 -right-1.5 grid size-7 place-items-center rounded-full bg-ink-900 text-white shadow ring-2 ring-white hover:bg-brand-700"
                onClick={t.remove}
              >
                <RiCloseLine className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {free > 0 && (
          <label className="btn-secondary relative overflow-hidden">
            <RiImageAddLine size={18} />
            {thumbs.length ? "Adicionar mais" : "Escolher fotos"}
            <input
              className="absolute inset-0 cursor-pointer opacity-0"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {onRead && files.length > 0 && (
          <button
            type="button"
            className="btn-secondary text-brand-700"
            disabled={reading}
            onClick={read}
          >
            <RiSparkling2Line size={18} />
            {reading ? "Lendo imagem…" : "Preencher com a IA"}
          </button>
        )}
      </div>
      {message && (
        <p
          className={`mt-2 rounded-lg p-3 text-sm ${message.error ? "bg-brand-50 text-brand-800" : "border border-line bg-surface text-ink-700"}`}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
      <p className="hint">
        {hint}
        {files.length > 0 && " Toque no ícone de recorte para enquadrar."}
      </p>
      {editing !== null && files[editing] && (
        <PhotoEditor
          source={files[editing]}
          onClose={() => setEditing(null)}
          onSave={(file) => {
            const i = editing;
            setFiles((list) => list.map((f, j) => (j === i ? file : f)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
