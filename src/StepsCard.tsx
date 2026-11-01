import { useState, type Dispatch, type SetStateAction } from "react";
import { RiCheckLine, RiFootprintLine, RiPencilLine } from "react-icons/ri";
import NumberField from "./NumberField";
import { kcal, num, today, type State } from "./domain";
import { stepEnergy, stepsOn, weightAtDate } from "./energy";
import { setSteps, type StepCounterState } from "./steps";
import { FoldToggle, Panel } from "./ui";

/** Referência de passos por dia mostrada na barra (não é uma meta do app). */
const REFERENCE = 8000;

/** Passos do dia com distância e calorias estimadas. */
export default function StepsCard({
  state,
  setState,
  date,
  counter,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  date: string;
  counter: StepCounterState;
}) {
  const count = stepsOn(state, date);
  const weight = weightAtDate(state, date);
  const est = stepEnergy(count, weight, state.profile);
  const record = (state.steps ?? []).find((s) => s.date === date);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const pct = Math.min(100, (count / REFERENCE) * 100);
  const isToday = date === today();
  return (
    <Panel fold="steps">
      <div className="flex items-center gap-2">
        <div className="mr-auto flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <RiFootprintLine className="size-[18px]" />
          </span>
          <h2 className="font-semibold">Passos</h2>
        </div>
        {!editing && (
          <button
            className="btn-ghost min-h-9 px-2 text-sm"
            onClick={() => {
              setValue(count || null);
              setEditing(true);
            }}
          >
            <RiPencilLine className="size-4" /> {count ? "Corrigir" : "Informar"}
          </button>
        )}
        <FoldToggle title="Passos" />
      </div>
      {editing ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setState((s) => ({
              ...s,
              steps: setSteps(s.steps, date, value ?? 0),
            }));
            setEditing(false);
          }}
        >
          <label className="block min-w-40 flex-1">
            <span className="label">Passos do dia</span>
            <NumberField
              unit="passos"
              min={0}
              max={200000}
              autoFocus
              value={value}
              onChange={setValue}
              placeholder="0"
            />
          </label>
          <button className="btn-primary">
            <RiCheckLine className="size-5" /> Salvar
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {count.toLocaleString("pt-BR")}
            </p>
            <p className="text-sm text-ink-500 tabular-nums">
              {count
                ? `${num(est.distanceKm)} km · ${est.calories === null ? "registre o peso para as calorias" : `~${kcal(est.calories)}`}`
                : "Nenhum passo registrado"}
            </p>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label={`Passos, referência de ${REFERENCE.toLocaleString("pt-BR")}`}
            aria-valuemin={0}
            aria-valuemax={REFERENCE}
            aria-valuenow={count}
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] text-ink-500">
            {record?.source === "manual"
              ? "Informado por você. "
              : ""}
            Calorias ativas estimadas pela caminhada (passada pela sua altura,
            ritmo moderado); não entram no saldo do dia, que já considera seu
            nível de atividade.
          </p>
        </>
      )}
      {isToday && counter.supported && !editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
          {counter.enabled ? (
            <>
              <span className="flex-1 text-ink-500">
                Contando pelo celular, mesmo com o app fechado. Abra o app de
                vez em quando para atualizar.
              </span>
              <button
                className="btn-ghost min-h-9 px-2 text-sm"
                onClick={() => void counter.refresh()}
              >
                Atualizar
              </button>
              <button
                className="btn-ghost min-h-9 px-2 text-sm text-ink-500"
                onClick={counter.disable}
              >
                Desligar
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-ink-500">
                O celular pode contar seus passos sozinho.
              </span>
              <button
                className="btn-secondary min-h-9 px-3 text-sm"
                onClick={() => void counter.enable()}
              >
                Ativar contagem
              </button>
            </>
          )}
        </div>
      )}
      {isToday && !counter.supported && !editing && (
        <p className="mt-2 text-[13px] text-ink-500">
          A contagem automática funciona no app Android. Aqui, informe os passos
          do relógio ou do celular.
        </p>
      )}
      {counter.error && isToday && (
        <p role="alert" className="mt-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          {counter.error}
        </p>
      )}
    </Panel>
  );
}
