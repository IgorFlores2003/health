import { useEffect, useMemo, useRef, useState } from "react";
import {
  RiCameraLine,
  RiCloseLine,
  RiCropLine,
  RiImageAddLine,
  RiSparkling2Line,
} from "react-icons/ri";
import CameraCapture from "./CameraCapture";
import PhotoEditor from "./PhotoEditor";
import { confirmDialog } from "./confirm";
import { openImages } from "./ImageViewer";
import { downloadPhoto, usePhotoUrls } from "./photos";

/** Uma ação de IA sobre a foto escolhida (ex.: ler o peso, estimar gordura). */
export type PhotoReader = {
  label: string;
  run: (file: File, form: HTMLFormElement | null) => Promise<string>;
};

/**
 * Campo de fotos do formulário. As fotos novas vão em name="photos" e, ao
 * editar, as salvas que continuam vão em name="keptPhotos". Com onRead (ou
 * readers), oferece ler a foto escolhida com a IA para preencher os campos.
 */
export default function PhotoField({
  label,
  hint,
  max,
  onRead,
  readers,
  saved = [],
}: {
  label: string;
  hint: string;
  max: number;
  onRead?: (file: File, form: HTMLFormElement | null) => Promise<string>;
  /** Várias ações de IA; com mais de uma foto, vale a selecionada. */
  readers?: PhotoReader[];
  /** Caminhos das fotos já salvas no registro em edição. */
  saved?: string[];
}) {
  const field = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [kept, setKept] = useState(saved);
  const [reading, setReading] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [camera, setCamera] = useState(false);
  // Foto usada pela IA: chave da miniatura (caminho salvo ou índice novo).
  const [selected, setSelected] = useState<string | null>(null);
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
  const actions: PhotoReader[] =
    readers ?? (onRead ? [{ label: "Preencher com a IA", run: onRead }] : []);

  function add(list: File[]) {
    if (list.length > free)
      setMessage({
        text: `Máximo de ${max} fotos por registro. Entraram as primeiras ${Math.max(free, 0)}.`,
        error: true,
      });
    else setMessage(undefined);
    const added = list.slice(0, Math.max(free, 0));
    // A foto que acabou de entrar é a que a IA vai ler.
    if (added.length) setSelected(`new-${files.length}`);
    setFiles((f) => [...f, ...added]);
  }

  const thumbs = [
    ...kept.map((p) => ({
      key: p,
      src: savedUrls[p],
      file: async () =>
        new File([await downloadPhoto(p)], "foto.jpg", { type: "image/jpeg" }),
      remove: async () => {
        if (
          await confirmDialog({
            title: "Remover foto?",
            message: "A foto será apagada quando você salvar o registro.",
            confirmLabel: "Remover",
            danger: true,
          })
        ) {
          setKept((k) => k.filter((x) => x !== p));
          if (selected === p) setSelected(null);
        }
      },
    })),
    ...files.map((f, i) => ({
      key: `new-${i}`,
      src: previews[i],
      file: async () => f,
      edit: () => setEditing(i),
      remove: () => {
        setFiles((list) => list.filter((_, j) => j !== i));
        setSelected(null);
        setMessage(undefined);
      },
    })),
  ];
  const current =
    thumbs.find((t) => t.key === selected) ?? thumbs.at(-1) ?? null;

  async function read(action: PhotoReader) {
    if (!current) return;
    setReading(action.label);
    setMessage(undefined);
    try {
      setMessage({
        text: await action.run(await current.file(), field.current!.form),
      });
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Não foi possível ler a imagem.",
        error: true,
      });
    } finally {
      setReading("");
    }
  }

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
          {thumbs.map((t, i) => (
            <li key={t.key} className="relative aspect-square">
              {t.src ? (
                <button
                  type="button"
                  className={`block size-full overflow-hidden rounded-lg border ${actions.length && thumbs.length > 1 && current?.key === t.key ? "border-brand-600 ring-2 ring-brand-600" : "border-line"}`}
                  aria-label="Abrir foto"
                  onClick={() => {
                    setSelected(t.key);
                    openImages(
                      thumbs.map((x) => x.src ?? ""),
                      i,
                    );
                  }}
                >
                  <img src={t.src} alt="" className="size-full object-cover" />
                </button>
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
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCamera(true)}
            >
              <RiCameraLine size={18} /> Câmera
            </button>
            <label className="btn-secondary relative overflow-hidden">
              <RiImageAddLine size={18} />
              Galeria
              <input
                className="absolute inset-0 cursor-pointer opacity-0"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  add([...(e.target.files || [])]);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}
        {current &&
          actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="btn-secondary text-brand-700"
              disabled={!!reading}
              onClick={() => void read(a)}
            >
              <RiSparkling2Line size={18} />
              {reading === a.label ? "Lendo imagem…" : a.label}
            </button>
          ))}
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
        {thumbs.length > 0 && " Toque numa foto para ver em tela cheia."}
        {actions.length > 0 &&
          thumbs.length > 1 &&
          " A IA usa a foto destacada."}
        {files.length > 0 && " O ícone de recorte enquadra a foto."}
      </p>
      {camera && (
        <CameraCapture
          title={label.replace(/ · opcional$/, "")}
          facing="environment"
          onClose={() => setCamera(false)}
          onCapture={(file) => {
            setCamera(false);
            add([file]);
          }}
        />
      )}
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
