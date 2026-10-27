import { today } from "./domain";
import type {
  ExerciseReading,
  MealReading,
  PressureReading,
  ScaleReading,
} from "./readImage";
import { supabase } from "./supabase";

/** Limite da gravação: 60 s em WAV 16 kHz cabem no limite da função. */
export const MAX_SECONDS = 60;
const RATE = 16000;

export const voiceSupported = () =>
  typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** Começa a gravar o microfone; stop() devolve o áudio gravado. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
  });
  recorder.start();
  return {
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    },
  };
}

/**
 * O Gemini não aceita o WebM/Opus do navegador: decodifica e regrava em WAV
 * mono 16 kHz (16 bits), formato suportado e pequeno para voz.
 */
async function toWav(blob: Blob) {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  void ctx.close();
  const length = Math.ceil(decoded.duration * RATE);
  const offline = new OfflineAudioContext(1, length, RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const pcm = (await offline.startRendering()).getChannelData(0);
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const text = (at: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, i) =>
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true),
  );
  const bytes = new Uint8Array(view.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Envia o áudio para a IA extrair os campos do registro; nada é salvo. */
export async function readAudio(kind: "exercise", audio: Blob): Promise<ExerciseReading>;
export async function readAudio(kind: "pressure", audio: Blob): Promise<PressureReading>;
export async function readAudio(kind: "meal", audio: Blob): Promise<MealReading>;
export async function readAudio(kind: "scale", audio: Blob): Promise<ScaleReading>;
export async function readAudio(kind: "question", audio: Blob): Promise<{ text: string }>;
export async function readAudio(
  kind: "exercise" | "pressure" | "meal" | "scale" | "question",
  audio: Blob,
) {
  if (!supabase) throw Error("Conecte-se para usar o áudio com a IA.");
  const { data, error } = await supabase.functions.invoke("coach", {
    body: {
      action: "read-audio",
      kind,
      today: today(),
      audio: await toWav(audio),
    },
  });
  if (
    error ||
    !data ||
    (kind === "question" ? typeof data.text : typeof data.note) !== "string"
  )
    throw Error("Não foi possível entender o áudio. Tente de novo ou digite.");
  return data;
}
