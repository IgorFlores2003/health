import { PhotoStrip, removePhotos } from "./photos";
import CalorieBudget from "./CalorieBudget";
import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  RiAddLine,
  RiChat3Line,
  RiDeleteBin6Line,
  RiFootprintLine,
  RiHeartPulseLine,
  RiPencilLine,
  RiRestaurant2Line,
} from "react-icons/ri";
import { confirmDialog } from "./confirm";
import FoodSheet from "./FoodSheet";
import { WaterCard } from "./Water";
import { dailyEnergy, foodCalories, reopenDay } from "./energy";
import {
  durationLabel,
  foodUnit,
  kcal,
  today,
  type State,
  type Food,
} from "./domain";
export const balanceLabels = {
  incomplete: "Registros incompletos",
  deficit: "Déficit estimado",
  surplus: "Superávit estimado",
  near_balance: "Próximo do equilíbrio",
};
export default function DailyDiary({
  state,
  setState,
  date,
  setDate,
  onExercise,
  onPressure,
  onAnalyze,
  onProfile,
  onWeight,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  date: string;
  setDate: (s: string) => void;
  onExercise: (id?: string) => void;
  onPressure: (id?: string) => void;
  onAnalyze: () => void;
  onProfile: () => void;
  onWeight: () => void;
}) {
  const day = dailyEnergy(state, date);
  const pressures = state.pressures.filter((p) => p.date === date);
  const [foodSheet, setFoodSheet] = useState<{ food?: Food } | null>(null);
  const open = (food?: Food) => setFoodSheet({ food });
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">
            Diário do dia
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Registre o que comeu e os exercícios para ver o balanço estimado.
          </p>
        </div>
        <label className="block sm:w-52">
          <span className="label">Data</span>
          <input
            className="input"
            aria-label="Dia do diário"
            type="date"
            max={today()}
            value={date}
            onChange={(e) => {
              if (e.target.value && e.target.value <= today()) {
                setDate(e.target.value);
                setFoodSheet(null);
              }
            }}
          />
        </label>
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CalorieBudget
          state={state}
          date={date}
          onProfile={onProfile}
          onWeight={onWeight}
        />
        <WaterCard state={state} setState={setState} date={date} />
      </div>
      <section className="card mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2 text-sm text-ink-500">
          <h2 className="text-base font-semibold text-ink-900">
            {balanceLabels[day.status]}
          </h2>
          <p>
            {day.complete
              ? `Diferença estimada: ${kcal(Math.abs(day.balance!))}. Valores aproximados; "próximo do equilíbrio" é uma diferença de até 100 kcal.`
              : "Ainda não dá para dizer se houve déficit. Registre todas as refeições, bebidas e exercícios e marque o dia como completo."}
          </p>
          {!state.profileReviewed && (
            <button className="btn-ghost -ml-2" onClick={onProfile}>
              Revise e salve seu perfil para calcular o gasto
            </button>
          )}
          {!day.weight && <p>Falta um registro de peso nessa data ou antes.</p>}
          {day.aiFoods > 0 && (
            <p>
              {day.aiFoods} alimento(s) usam estimativa da IA. Preparo, marca e
              ingredientes podem mudar as calorias.
            </p>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={onAnalyze}>
          <RiChat3Line size={18} /> Analisar meu dia
        </button>
      </section>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <DiaryCard
          title="Alimentação"
          text="Inclua preparo, marca, molhos e bebidas."
          addLabel="Alimento"
          onAdd={() => open()}
          icon={<RiRestaurant2Line size={20} />}
          empty="Nenhum alimento nesse dia."
        >
          {day.foods.map((food) => (
            <DiaryRow
              key={food.id}
              title={food.name}
              detail={`${food.grams.toLocaleString("pt-BR")} ${foodUnit(food)} · ${
                foodCalories(food) === null
                  ? "calorias pendentes"
                  : kcal(foodCalories(food))
              } · ${
                food.source === "ai"
                  ? "estimativa IA"
                  : food.source === "label"
                    ? "informado"
                    : "a preencher"
              }`}
              onEdit={() => open(food)}
              onDelete={async () => {
                if (
                  await confirmDialog({
                    title: "Excluir alimento?",
                    message: `"${food.name}" sai do diário deste dia.`,
                    confirmLabel: "Excluir",
                    danger: true,
                  })
                )
                  setState((s) => ({
                    ...s,
                    foods: (s.foods ?? []).filter((f) => f.id !== food.id),
                    completedDays: reopenDay(s, date),
                  }));
              }}
            />
          ))}
        </DiaryCard>
        {foodSheet && (
          <FoodSheet
            key={foodSheet.food?.id ?? "new"}
            state={state}
            setState={setState}
            date={date}
            food={foodSheet.food}
            onClose={() => setFoodSheet(null)}
          />
        )}
        <div className="grid min-w-0 content-start gap-4">
          <DiaryCard
            title="Exercícios"
            text="Calorias informadas ou estimadas pela atividade."
            addLabel="Exercício"
            onAdd={() => onExercise()}
            icon={<RiFootprintLine size={20} />}
            empty="Nenhum exercício nesse dia."
          >
            {day.exercises.map((ex) => (
              <DiaryRow
                key={ex.id}
                title={ex.type}
                detail={`${ex.minutes ? `${durationLabel(ex.minutes)} · ` : ""}${
                  ex.distanceKm ? `${ex.distanceKm} km · ` : ""
                }${ex.calories === null ? "calorias pendentes" : kcal(ex.calories)} · ${ex.source}`}
                onEdit={() => onExercise(ex.id)}
                onDelete={async () => {
                  if (
                    !(await confirmDialog({
                      title: "Excluir exercício?",
                      message:
                        "O exercício e as fotos dele serão apagados da sua conta.",
                      confirmLabel: "Excluir",
                      danger: true,
                    }))
                  )
                    return;
                  void removePhotos(
                    state.exercises.find((x) => x.id === ex.id)?.photos,
                  );
                  setState((s) => ({
                    ...s,
                    exercises: s.exercises.filter((x) => x.id !== ex.id),
                    completedDays: reopenDay(s, date),
                  }));
                }}
              >
                <PhotoStrip
                  paths={state.exercises.find((x) => x.id === ex.id)?.photos}
                />
                {ex.calories === null && (
                  <small className="mt-1 block text-[13px] text-brand-700">
                    Informe as calorias ativas, ou um tipo compatível com peso e
                    duração.
                  </small>
                )}
              </DiaryRow>
            ))}
          </DiaryCard>
          <DiaryCard
            title="Pressão arterial"
            text="Medições do dia, com a foto do aparelho se quiser."
            addLabel="Pressão"
            onAdd={() => onPressure()}
            icon={<RiHeartPulseLine size={20} />}
            empty="Nenhuma medição nesse dia."
          >
            {pressures.map((p) => (
              <DiaryRow
                key={p.id}
                title={`${p.systolic}/${p.diastolic} mmHg`}
                detail={p.pulse ? `${p.pulse} bpm` : undefined}
                onEdit={() => onPressure(p.id)}
                onDelete={async () => {
                  if (
                    !(await confirmDialog({
                      title: "Excluir medição?",
                      message:
                        "A medição e as fotos dela serão apagadas da sua conta.",
                      confirmLabel: "Excluir",
                      danger: true,
                    }))
                  )
                    return;
                  void removePhotos(p.photos);
                  setState((s) => ({
                    ...s,
                    pressures: s.pressures.filter((x) => x.id !== p.id),
                  }));
                }}
              >
                <PhotoStrip paths={p.photos} />
              </DiaryRow>
            ))}
          </DiaryCard>
        </div>
      </div>
      <section className="card space-y-3 text-sm text-ink-500">
        <label className="flex cursor-pointer items-start gap-3 text-[15px] font-medium text-ink-900">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-brand-600"
            checked={day.completed}
            disabled={!day.foodCount}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                completedDays: e.target.checked
                  ? [...new Set([...(s.completedDays ?? []), date])]
                  : reopenDay(s, date),
              }))
            }
          />
          <span>
            Registrei todos os alimentos, bebidas e exercícios do dia.
          </span>
        </label>
        <p>
          Qualquer alteração em alimentos ou exercícios reabre o dia. Sem esse
          fechamento, a IA trata o saldo como parcial, e não como déficit
          confirmado.
        </p>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-brand-700">
            Como calculamos e quais são os limites
          </summary>
          <div className="space-y-3 pt-1">
            <p>
              Consumo = gramas × kcal por 100 g ÷ 100. Gasto do dia = o maior
              entre basal × seu nível de atividade e basal × 1,2 + exercícios
              registrados, para um treino nunca contar duas vezes. Exercícios
              estimados usam valores MET e descontam o repouso. Calorias ativas
              informadas substituem a estimativa do exercício, nunca são somadas
              a ela.
            </p>
            <p>
              A meta de calorias é esse gasto menos 500 kcal para emagrecer ou
              mais 300 kcal para ganhar peso, nunca abaixo do mínimo seguro.
              Distância e duração estimam a velocidade em caminhada, corrida e
              bicicleta em terreno plano; outras condições podem mudar bastante
              o gasto. Não são medições clínicas, não são diagnóstico e não
              garantem emagrecimento.
            </p>
            <a
              className="inline-block text-brand-700 underline underline-offset-2"
              href="https://pacompendium.com/adult-compendium/"
              target="_blank"
              rel="noreferrer"
            >
              Referência: Compêndio de Atividades Físicas 2024
            </a>
          </div>
        </details>
      </section>
    </>
  );
}

/**
 * Card de uma lista do diário (alimentos, exercícios, pressão): todos com o
 * mesmo cabeçalho, um só botão de adicionar e o mesmo aviso quando vazio.
 */
function DiaryCard({
  title,
  text,
  addLabel,
  onAdd,
  icon,
  empty,
  children,
}: {
  title: string;
  text: string;
  addLabel: string;
  onAdd: () => void;
  icon: ReactNode;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <section className="card min-w-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-500">{text}</p>
        </div>
        <button className="btn-secondary shrink-0" onClick={onAdd}>
          <RiAddLine size={18} /> {addLabel}
        </button>
      </div>
      {children.length ? (
        <div>{children}</div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-4 text-sm text-ink-500">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </span>
          {empty}
        </div>
      )}
    </section>
  );
}

function DiaryRow({
  title,
  detail,
  onEdit,
  onDelete,
  children,
}: {
  title: string;
  detail?: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <strong className="block truncate text-sm font-medium">{title}</strong>
        {detail && (
          <small className="mt-0.5 block text-[13px] text-ink-500">
            {detail}
          </small>
        )}
        {children}
      </div>
      <div className="-my-1 flex shrink-0">
        <button
          className="icon-btn size-11"
          aria-label={`Editar ${title}`}
          onClick={onEdit}
        >
          <RiPencilLine size={18} />
        </button>
        <button
          className="icon-btn size-11 hover:text-brand-600"
          aria-label={`Excluir ${title}`}
          onClick={onDelete}
        >
          <RiDeleteBin6Line size={18} />
        </button>
      </div>
    </div>
  );
}
