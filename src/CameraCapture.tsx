import { useEffect, useRef, useState } from "react";
import { RiCameraLine, RiCameraSwitchLine, RiRefreshLine } from "react-icons/ri";
import Sheet from "./Sheet";

/**
 * Tira uma foto com a câmera: webcam no computador, câmera frontal (ou
 * traseira) no celular. Mostra a imagem ao vivo e entrega um JPEG.
 */
export default function CameraCapture({
  title = "Tirar foto",
  onCapture,
  onClose,
}: {
  title?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameras, setCameras] = useState(0);
  const [error, setError] = useState("");
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);

  useEffect(() => {
    if (shot) return;
    let stream: MediaStream | null = null;
    let active = true;
    setError("");
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 } },
        audio: false,
      })
      .then(async (s) => {
        if (!active) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) video.current.srcObject = s;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((d) => d.kind === "videoinput").length);
      })
      .catch(() =>
        setError(
          "Não foi possível abrir a câmera. Permita o acesso à câmera para o Ritmo ou escolha uma foto da galeria.",
        ),
      );
    if (!navigator.mediaDevices?.getUserMedia)
      setError("Este aparelho não permite usar a câmera aqui.");
    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, shot]);
  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // A câmera frontal aparece espelhada na tela; a foto sai igual à prévia.
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => blob && setShot({ url: URL.createObjectURL(blob), blob }),
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-900">
        {shot ? (
          <img src={shot.url} alt="Foto tirada" className="size-full object-cover" />
        ) : (
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
          />
        )}
        {error && (
          <p
            role="alert"
            className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white"
          >
            {error}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {shot ? (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShot(null)}
            >
              <RiRefreshLine className="size-5" /> Tirar outra
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                onCapture(
                  new File([shot.blob], "foto.jpg", { type: "image/jpeg" }),
                )
              }
            >
              Usar esta foto
            </button>
          </>
        ) : (
          <>
            {cameras > 1 && (
              <button
                type="button"
                className="btn-secondary"
                aria-label="Trocar de câmera"
                onClick={() =>
                  setFacing((f) => (f === "user" ? "environment" : "user"))
                }
              >
                <RiCameraSwitchLine className="size-5" /> Trocar câmera
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              disabled={!!error}
              onClick={capture}
            >
              <RiCameraLine className="size-5" /> Tirar foto
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
