import { useState, type FormEvent } from "react";
import { RiArrowRightLine, RiPulseLine } from "react-icons/ri";
import { today, type State } from "./domain";

const activities = [
  {
    value: 1.2,
    label: "Pouco ativo",
    text: "Trabalho sentado, quase sem exercício",
  },
  {
    value: 1.375,
    label: "Levemente ativo",
    text: "Exercício leve 1 a 3 vezes por semana",
  },
  {
    value: 1.55,
    label: "Moderadamente ativo",
    text: "Exercício 3 a 5 vezes por semana",
  },
  {
    value: 1.725,
    label: "Muito ativo",
    text: "Treino intenso 6 ou 7 vezes por semana",
  },
];
const genders = [
  "Mulher",
  "Homem",
  "Não binário",
  "Outro",
  "Prefiro não informar",
];

/**
 * Última etapa do cadastro: sem os dados do perfil não há como calcular
 * basal, gasto do dia nem calorias disponíveis.
 */
export default function Onboarding({
  state,
  onDone,
}: {
  state: State;
  onDone: (next: State) => void;
}) {
  const p = state.profile;
  const [gender, setGender] = useState(
    genders.includes(p.gender) ? p.gender : "",
  );
  const [error, setError] = useState("");
  const askFormula = gender !== "" && gender !== "Mulher" && gender !== "Homem";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const weight = Number(f.get("weight"));
    const activity = Number(f.get("activity"));
    if (!activity) {
      setError("Escolha seu nível de atividade.");
      return;
    }
    const formulaSex =
      gender === "Homem"
        ? "male"
        : gender === "Mulher"
          ? "female"
          : (String(f.get("formulaSex")) as "female" | "male");
    const date = today();
    onDone({
      ...state,
      goal: Number(f.get("goal")) || 0,
      intake: 0,
      profileReviewed: true,
      profile: {
        ...p,
        name: String(f.get("name")).trim(),
        age: Number(f.get("age")),
        height: Number(f.get("height")),
        gender,
        formulaSex,
        activity,
      },
      weights: [
        ...state.weights.filter((x) => x.date !== date),
        { id: crypto.randomUUID(), date, value: weight },
      ],
    });
  }

  return (
    <div className="min-h-dvh bg-surface px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2 font-semibold text-brand-600">
          <RiPulseLine className="size-6" /> Ritmo
        </div>
        <div className="mb-5">
          <div className="mb-3 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1 flex-1 rounded-full bg-brand-600" />
            ))}
          </div>
          <p className="text-sm text-ink-500">Última etapa do cadastro</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Seu perfil
          </h1>
          <p className="mt-1 text-ink-500">
            Usamos esses dados para calcular quantas calorias você gasta e pode
            consumir por dia. Você pode alterar depois em Perfil.
          </p>
        </div>
        <form className="card space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="label">Nome</span>
            <input
              className="input"
              name="name"
              required
              maxLength={60}
              autoComplete="name"
              defaultValue={p.name}
              placeholder="Como quer ser chamado(a)"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Idade (anos)</span>
              <input
                className="input"
                name="age"
                type="number"
                inputMode="numeric"
                min="18"
                max="100"
                required
                defaultValue={state.profileReviewed ? p.age : undefined}
              />
            </label>
            <label className="block">
              <span className="label">Peso (kg)</span>
              <input
                className="input"
                name="weight"
                type="number"
                inputMode="decimal"
                min="20"
                max="400"
                step="0.1"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="label">Peso desejado (kg) · opcional</span>
            <input
              className="input"
              name="goal"
              type="number"
              inputMode="decimal"
              min="20"
              max="400"
              step="0.1"
              defaultValue={state.goal || undefined}
            />
            <span className="hint block">
              Abaixo do seu peso, as calorias do dia miram emagrecer; acima,
              ganhar peso. Sem ele, miram manter.
            </span>
          </label>
          <label className="block">
            <span className="label">Altura (cm)</span>
            <input
              className="input"
              name="height"
              type="number"
              inputMode="decimal"
              min="100"
              max="250"
              step="0.1"
              required
              defaultValue={state.profileReviewed ? p.height : undefined}
            />
          </label>
          <label className="block">
            <span className="label">Gênero</span>
            <select
              className="input"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="" disabled>
                Selecione
              </option>
              {genders.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          {askFormula && (
            <label className="block">
              <span className="label">Coeficiente para o cálculo</span>
              <select
                className="input"
                name="formulaSex"
                defaultValue={p.formulaSex}
              >
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
              </select>
              <span className="hint block">
                A fórmula Mifflin–St Jeor só tem coeficientes feminino e
                masculino. Escolha o mais próximo da sua fisiologia.
              </span>
            </label>
          )}
          <fieldset>
            <legend className="label">Nível de atividade</legend>
            <div className="grid gap-2">
              {activities.map((a) => (
                <label
                  key={a.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-checked:border-brand-500 has-checked:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="activity"
                    value={a.value}
                    defaultChecked={
                      state.profileReviewed && p.activity === a.value
                    }
                    className="mt-1 accent-brand-600"
                  />
                  <span>
                    <span className="block text-sm font-medium">{a.label}</span>
                    <span className="block text-[13px] text-ink-500">
                      {a.text}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p className="text-sm text-brand-700" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary w-full">
            Concluir cadastro <RiArrowRightLine className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
