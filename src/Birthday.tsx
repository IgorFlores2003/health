import { useEffect, useState } from "react";
import { RiCake2Fill, RiMusic2Line } from "react-icons/ri";
import { ageOn, dateKey, today } from "./domain";
import Sheet from "./Sheet";
import { playNotes } from "./sounds";

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
export function playHappyBirthday() {
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
  return playNotes([
    [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
    [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
    [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2],
    [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 3],
  ], 0.42);
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
        <RiCake2Fill
          className="size-[88px] animate-bounce text-brand-600"
          aria-hidden
        />
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
            <RiMusic2Line className="size-5" />
            {played ? "Tocar de novo" : "Tocar parabéns"}
          </button>
          <button className="btn-primary" onClick={onClose}>
            Obrigado!
          </button>
        </div>
      </div>
    </Sheet>
  );
}
