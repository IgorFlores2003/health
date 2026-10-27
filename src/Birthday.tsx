import { useEffect, useState } from "react";
import { ageOn, dateKey, today } from "./domain";
import Sheet from "./Sheet";

/** Data limite para ter `years` anos completos hoje. */
function yearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return dateKey(d);
}

/**
 * Data de nascimento (name="birthDate") com a idade calculada ao lado.
 * O app é para adultos: de 18 a 100 anos.
 */
export function BirthDateField({ initial }: { initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const age = value ? ageOn(value, today()) : null;
  return (
    <label className="block">
      <span className="label flex justify-between gap-2">
        Data de nascimento
        {age !== null && (
          <span className="font-normal text-ink-500">{age} anos</span>
        )}
      </span>
      <input
        className="input"
        type="date"
        name="birthDate"
        required
        min={yearsAgo(100)}
        max={yearsAgo(18)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}

/**
 * "Parabéns pra você" só com som (melodia em domínio público), tocada com
 * Web Audio. Os navegadores só liberam o som depois de um toque: se ainda
 * não puder tocar, devolve false.
 */
export async function playHappyBirthday() {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();
  await ctx.resume().catch(() => undefined);
  if (ctx.state !== "running") {
    void ctx.close();
    return false;
  }
  const G4 = 392,
    A4 = 440,
    B4 = 493.88,
    C5 = 523.25,
    D5 = 587.33,
    E5 = 659.25,
    F5 = 698.46,
    G5 = 783.99;
  // [frequência, tempos] em compasso 3/4.
  // prettier-ignore
  const song: [number, number][] = [
    [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
    [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
    [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2],
    [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 3],
  ];
  const beat = 0.42;
  let t = ctx.currentTime + 0.1;
  for (const [freq, beats] of song) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const len = beats * beat;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + len);
    t += len;
  }
  setTimeout(() => void ctx.close(), (t - ctx.currentTime + 0.5) * 1000);
  return true;
}

/** Card de parabéns, com o bolo e o botão para tocar a música. */
export function BirthdayCard({
  name,
  age,
  onClose,
}: {
  name: string;
  age: number;
  onClose: () => void;
}) {
  const [played, setPlayed] = useState(false);
  // Tenta tocar ao abrir; se o aparelho pedir um toque antes, o botão toca.
  useEffect(() => {
    void playHappyBirthday().then(setPlayed);
  }, []);
  return (
    <Sheet title="Feliz aniversário!" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <span className="animate-bounce text-[88px] leading-none" aria-hidden>
          🎂
        </span>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight">
          Parabéns{name ? `, ${name}` : ""}!
        </h3>
        <p className="mt-2 max-w-sm text-ink-500">
          Hoje você completa {age} anos. Que seja um ano de muita saúde, energia
          e conquistas. Obrigado por cuidar de você com o Ritmo!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => void playHappyBirthday().then(setPlayed)}
          >
            {played ? "Tocar de novo" : "Tocar parabéns"} 🎵
          </button>
          <button className="btn-primary" onClick={onClose}>
            Obrigado!
          </button>
        </div>
      </div>
    </Sheet>
  );
}
