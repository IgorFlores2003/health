import DailyDiary, { balanceLabels } from "./DailyDiary";
import ExerciseFields from "./ExerciseFields";
import { dailyEnergy, reopenDay } from "./energy";
import type { User } from "@supabase/supabase-js";
import { userStorageKey } from "./access";
import AccountAccess from "./AccountAccess";
import { Avatar, PhotoStrip, removePhotos, uploadPhoto } from "./photos";
import {
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import type { IconType } from "react-icons";
import {
  RiAddLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiCameraLine,
  RiChat3Fill,
  RiChat3Line,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiFileList3Fill,
  RiFileList3Line,
  RiFireLine,
  RiFocus3Fill,
  RiFocus3Line,
  RiFootprintLine,
  RiHeartPulseLine,
  RiHome5Fill,
  RiHome5Line,
  RiLineChartLine,
  RiLogoutBoxRLine,
  RiPulseLine,
  RiRestaurant2Fill,
  RiRestaurant2Line,
  RiScales3Line,
  RiUpload2Line,
  RiUser3Fill,
  RiUser3Line,
} from "react-icons/ri";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  basal,
  byDate,
  currentWeight,
  initial,
  MAX_EXERCISE_PHOTOS,
  projection,
  today,
  validState,
  type State,
} from "./domain";
import { supabase } from "./supabase";
function readLocal(localKey: string): State {
  try {
    const s = JSON.parse(localStorage.getItem(localKey) || "null");
    return validState(s) ? s : structuredClone(initial);
  } catch {
    return structuredClone(initial);
  }
}
const fmt = (n: number) => n.toLocaleString("pt-BR");
const dateLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
const tabs: {
  id: string;
  label: string;
  short: string;
  icon: IconType;
  active: IconType;
}[] = [
  {
    id: "overview",
    label: "Início",
    short: "Início",
    icon: RiHome5Line,
    active: RiHome5Fill,
  },
  {
    id: "nutrition",
    label: "Diário",
    short: "Diário",
    icon: RiRestaurant2Line,
    active: RiRestaurant2Fill,
  },
  {
    id: "records",
    label: "Registros",
    short: "Registros",
    icon: RiFileList3Line,
    active: RiFileList3Fill,
  },
  {
    id: "goals",
    label: "Meta",
    short: "Meta",
    icon: RiFocus3Line,
    active: RiFocus3Fill,
  },
  {
    id: "insights",
    label: "Assistente",
    short: "Assistente",
    icon: RiChat3Line,
    active: RiChat3Fill,
  },
  {
    id: "settings",
    label: "Perfil",
    short: "Perfil",
    icon: RiUser3Line,
    active: RiUser3Fill,
  },
];
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={"card min-w-0 " + className}>{children}</section>;
}
function CardHeader({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {text && <p className="mt-0.5 text-sm text-ink-500">{text}</p>}
      </div>
      {children}
    </div>
  );
}
const note = "text-[13px] leading-relaxed text-ink-500";
const axisTick = { fontSize: 12, fill: "#a1a1aa" };
export default function App({ account }: { account: User }) {
  const localKey = userStorageKey(account.id);
  const user = account.email || "";
  const [state, setState] = useState<State>(() => readLocal(localKey));
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState("30");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [diaryDate, setDiaryDate] = useState(today);
  const aiRequest = useRef(0);
  useEffect(() => {
    aiRequest.current += 1;
    setAnswer("");
  }, [state, diaryDate]);
  useEffect(() => {
    try {
      localStorage.setItem(localKey, JSON.stringify(state));
    } catch {
      setNotice(
        "Não foi possível salvar no aparelho. Exporte seus dados antes de sair.",
      );
    }
  }, [state, localKey]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            "#record-dialog :is(button, input, select, textarea)",
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      previous?.focus();
    };
  }, [modal]);
  const weight = currentWeight(state);
  const bmr = basal(weight, state.profile);
  const expenditure = bmr ? Math.round(bmr * state.profile.activity) : 0;
  const day = dailyEnergy(state, diaryDate);
  const days = projection(weight, state.goal, expenditure, state.intake);
  const sorted = byDate(state.weights);
  const first = sorted[0]?.value || 0;
  const difference = weight - first;
  const progress =
    state.goal && first > state.goal
      ? Math.min(
          100,
          Math.max(0, ((first - weight) / (first - state.goal)) * 100),
        )
      : 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(period));
  const recent = state.weights.filter(
    (x) => new Date(x.date + "T23:59:59") >= cutoff,
  );
  const chart = byDate(recent).map((x) => ({
    date: dateLabel(x.date),
    peso: x.value,
  }));
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const week = state.exercises.filter(
    (x) => new Date(x.date + "T12:00:00") >= weekStart,
  );
  const minutes = week.reduce((s, x) => s + x.minutes, 0);
  const exerciseChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      dia: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      minutos: state.exercises
        .filter((x) => x.date === key)
        .reduce((s, x) => s + x.minutes, 0),
    };
  });
  async function submitRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const files = f
      .getAll("photos")
      .filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length > MAX_EXERCISE_PHOTOS) {
      setNotice(`Escolha até ${MAX_EXERCISE_PHOTOS} fotos por exercício.`);
      return;
    }
    const date = String(f.get("date"));
    if (date > today()) {
      setNotice("Escolha uma data até hoje.");
      return;
    }
    const id = crypto.randomUUID();
    let next: State;
    if (modal === "weight") {
      const value = Number(f.get("value"));
      next = {
        ...state,
        weights: [
          ...state.weights.filter((x) => x.date !== date),
          { id, date, value },
        ],
      };
    } else if (modal === "pressure") {
      next = {
        ...state,
        pressures: [
          ...state.pressures,
          {
            id,
            date,
            systolic: Number(f.get("systolic")),
            diastolic: Number(f.get("diastolic")),
          },
        ],
      };
    } else {
      next = {
        ...state,
        exercises: [
          ...state.exercises,
          {
            id,
            date,
            type: String(f.get("type")),
            minutes: Number(f.get("minutes")),
            intensity: String(f.get("intensity")) as "Moderada",
            ...(f.get("distanceKm")
              ? { distanceKm: Number(f.get("distanceKm")) }
              : {}),
            ...(f.get("activeCalories") !== null &&
            f.get("activeCalories") !== ""
              ? { activeCalories: Number(f.get("activeCalories")) }
              : {}),
          },
        ],
      };
    }
    if (modal === "exercise") next.completedDays = reopenDay(state, date);
    if (!validState(next)) {
      setNotice(
        "Confira os valores, a duração ou as calorias do exercício. Na pressão, a sistólica deve ser maior que a diastólica.",
      );
      return;
    }
    let photos: string[] = [];
    if (modal === "exercise" && files.length) {
      setBusy(true);
      try {
        for (const file of files)
          photos.push(await uploadPhoto(account.id, `exercises/${id}`, file));
      } catch (err) {
        void removePhotos(photos);
        setNotice(
          err instanceof Error ? err.message : "Falha ao enviar fotos.",
        );
        return;
      } finally {
        setBusy(false);
      }
    }
    setState(
      photos.length
        ? {
            ...next,
            exercises: next.exercises.map((x) =>
              x.id === id ? { ...x, photos } : x,
            ),
          }
        : next,
    );
    setModal("");
    setNotice(
      photos.length
        ? "Registro e fotos salvos. Salve uma cópia na conta para guardar os caminhos."
        : "Registro salvo no aparelho.",
    );
  }
  function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = {
      ...state,
      profileReviewed: true,
      profile: {
        ...(state.profile.photo ? { photo: state.profile.photo } : {}),
        name: String(f.get("name")),
        height: Number(f.get("height")),
        age: Number(f.get("age")),
        gender: String(f.get("gender")),
        formulaSex: String(f.get("formulaSex")) as "female" | "male",
        activity: Number(f.get("activity")),
      },
    };
    if (!validState(next)) {
      setNotice("Confira os dados do perfil.");
      return;
    }
    setState(next);
    setNotice("Perfil atualizado.");
  }
  async function changePhoto(file: File | null) {
    setBusy(true);
    try {
      const previous = state.profile.photo;
      const photo = file
        ? await uploadPhoto(account.id, "profile", file)
        : undefined;
      setState((s) => ({ ...s, profile: { ...s.profile, photo } }));
      void removePhotos(previous ? [previous] : undefined);
      setNotice(
        file
          ? "Foto de perfil atualizada. Salve uma cópia na conta para guardar."
          : "Foto de perfil removida.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao enviar a foto.");
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ritmo-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function cloud(action: "save" | "load") {
    if (!supabase) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || auth.user.id !== account.id)
        throw Error("Entre na sua conta novamente.");
      if (action === "save") {
        const { error } = await supabase.from("health_snapshots").upsert({
          user_id: auth.user.id,
          payload: state,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        setNotice("Cópia salva na sua conta.");
      } else {
        const { data, error } = await supabase
          .from("health_snapshots")
          .select("payload")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw Error("Sua conta ainda não tem uma cópia salva.");
        if (!validState(data.payload))
          throw Error("A cópia possui formato inválido.");
        setState(data.payload);
        setNotice("Dados da conta carregados no aparelho.");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao acessar a nuvem.");
    } finally {
      setBusy(false);
    }
  }
  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setAnswer("");
    const requestId = ++aiRequest.current;
    try {
      const { data, error } = await supabase.functions.invoke("coach", {
        body: {
          question,
          day: {
            date: diaryDate,
            profile: {
              ...state.profile,
              name: "",
              gender: "Não informado",
              photo: undefined,
            },
            profileReviewed: state.profileReviewed === true,
            weights: state.weights
              .filter((w) => w.date <= diaryDate)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 1),
            foods: day.foods,
            exercises: state.exercises
              .filter((e) => e.date === diaryDate)
              .map(({ photos: _photos, ...e }) => e),
            completed: day.completed,
          },
          summary: {
            weight,
            bmr,
            expenditure,
            weeklyExerciseMinutes: minutes,
            goal: state.goal,
            weightChange: difference,
          },
        },
      });
      if (error) throw error;
      if (typeof data?.answer !== "string") throw Error("Resposta inválida.");
      if (requestId === aiRequest.current) setAnswer(data.answer);
    } catch {
      setNotice(
        "O assistente está indisponível no momento. Tente novamente mais tarde; seus registros continuam salvos.",
      );
    } finally {
      setBusy(false);
    }
  }
  const firstName = state.profile.name.split(" ")[0];
  return (
    <div className="min-h-dvh bg-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <a
          className="mb-8 flex items-center gap-2 px-2 text-xl font-bold tracking-tight"
          href="#"
          onClick={() => setTab("overview")}
        >
          <RiPulseLine className="size-6 text-brand-600" />
          ritmo
        </a>
        <nav className="grid gap-1">
          {tabs.map(({ id, label, icon: Icon, active: ActiveIcon }) => (
            <button
              key={id}
              className={
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors " +
                (tab === id
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-surface")
              }
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              {tab === id ? (
                <ActiveIcon className="size-5" />
              ) : (
                <Icon className="size-5 text-ink-400" />
              )}
              {label}
            </button>
          ))}
        </nav>
        <button
          className="mt-auto flex items-center gap-3 rounded-lg border-t border-line px-2 pt-4 text-left"
          onClick={() => setTab("settings")}
        >
          <Avatar path={state.profile.photo} name={state.profile.name} />
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold">
              {state.profile.name || "Seu perfil"}
            </strong>
            <small className="block truncate text-xs text-ink-500">
              {user || "Salvo neste aparelho"}
            </small>
          </span>
        </button>
      </aside>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {tabs.map(({ id, label, short, icon: Icon, active: ActiveIcon }) => (
          <button
            key={id}
            className={
              "flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium " +
              (tab === id ? "text-brand-600" : "text-ink-500")
            }
            onClick={() => setTab(id)}
            aria-label={label}
            aria-current={tab === id ? "page" : undefined}
          >
            {tab === id ? (
              <ActiveIcon className="size-[22px]" />
            ) : (
              <Icon className="size-[22px]" />
            )}
            <span className="max-w-full truncate px-0.5">{short}</span>
          </button>
        ))}
      </nav>
      <main className="pb-[calc(64px+env(safe-area-inset-bottom))] md:ml-60 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <RiPulseLine className="size-5 text-brand-600 md:hidden" />
              {tabs.find((t) => t.id === tab)?.label}
            </span>
            <span className="hidden text-sm text-ink-500 min-[360px]:inline">
              {new Date().toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {tab === "overview" && (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Olá{firstName ? `, ${firstName}` : ""}
                  </h1>
                  <p className="mt-1 text-ink-500">Resumo de hoje</p>
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={() => setModal("weight")}
                >
                  <RiAddLine className="size-5" /> Registrar peso
                </button>
              </div>
              <section className="card mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <RiRestaurant2Line className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm text-ink-500">Diário de hoje</p>
                    <h2 className="font-semibold">
                      {balanceLabels[dailyEnergy(state, today()).status]}
                    </h2>
                  </div>
                </div>
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={() => {
                    setDiaryDate(today());
                    setTab("nutrition");
                  }}
                >
                  Abrir diário <RiArrowRightLine className="size-4" />
                </button>
              </section>
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <Stat
                  icon={<RiScales3Line />}
                  label="Peso atual"
                  value={weight ? fmt(weight) : "—"}
                  unit="kg"
                  detail={
                    state.weights.length > 1
                      ? `${difference > 0 ? "+" : ""}${fmt(Number(difference.toFixed(1)))} kg desde o início`
                      : "Sem histórico ainda"
                  }
                />
                <Stat
                  icon={<RiFireLine />}
                  label="Basal"
                  value={bmr ? fmt(bmr) : "—"}
                  unit="kcal/dia"
                  detail="Gasto estimado em repouso"
                />
                <Stat
                  icon={<RiFootprintLine />}
                  label="Exercício (7 dias)"
                  value={fmt(minutes)}
                  unit="min"
                  detail={`${week.length} atividade${week.length === 1 ? "" : "s"}`}
                />
                <Stat
                  icon={<RiFocus3Line />}
                  label="Meta"
                  value={state.goal ? fmt(state.goal) : "—"}
                  unit="kg"
                  detail={
                    state.goal && weight
                      ? `Faltam ${fmt(Math.max(0, Number((weight - state.goal).toFixed(1))))} kg`
                      : "Não definida"
                  }
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
                <Panel>
                  <CardHeader title="Peso">
                    <select
                      aria-label="Período do gráfico"
                      className="input min-h-9 w-auto py-1 text-sm md:text-sm"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option value="30">30 dias</option>
                      <option value="90">90 dias</option>
                      <option value="365">1 ano</option>
                    </select>
                  </CardHeader>
                  {chart.length ? (
                    <div className="h-56 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chart}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="weightFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#d91c1c"
                                stopOpacity={0.14}
                              />
                              <stop
                                offset="100%"
                                stopColor="#d91c1c"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#ececef" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={axisTick}
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            axisLine={false}
                            tickLine={false}
                            tick={axisTick}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} kg`, "Peso"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="peso"
                            stroke="#d91c1c"
                            strokeWidth={2}
                            fill="url(#weightFill)"
                            dot={{
                              r: 3,
                              fill: "#d91c1c",
                              stroke: "white",
                              strokeWidth: 2,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty
                      icon={<RiLineChartLine />}
                      title="Nenhum peso registrado"
                      text="Registre seu peso para ver o gráfico."
                      action={() => setModal("weight")}
                    />
                  )}
                </Panel>
                <Panel>
                  <CardHeader title="Progresso da meta" />
                  <div className="flex items-baseline gap-1">
                    <strong className="text-4xl font-semibold tabular-nums">
                      {Math.round(progress)}
                    </strong>
                    <span className="text-lg text-ink-500">%</span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-label="Progresso da meta"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                  >
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-ink-500">Início</dt>
                      <dd className="font-semibold tabular-nums">
                        {first ? `${fmt(first)} kg` : "—"}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-ink-500">Meta</dt>
                      <dd className="font-semibold tabular-nums">
                        {state.goal ? `${fmt(state.goal)} kg` : "Não definida"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="btn-secondary mt-5 w-full"
                    onClick={() => setTab("goals")}
                  >
                    {state.goal ? "Ver meta" : "Definir meta"}
                    <RiArrowRightLine className="size-4" />
                  </button>
                </Panel>
                <Panel>
                  <CardHeader
                    title="Exercício"
                    text="Minutos por dia, últimos 7 dias"
                  >
                    <button
                      className="btn-ghost"
                      onClick={() => setModal("exercise")}
                    >
                      <RiAddLine className="size-4" /> Adicionar
                    </button>
                  </CardHeader>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={exerciseChart}
                        margin={{ left: -25, right: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#ececef" />
                        <XAxis
                          dataKey="dia"
                          axisLine={false}
                          tickLine={false}
                          tick={axisTick}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={axisTick}
                        />
                        <Tooltip
                          cursor={{ fill: "#fff1f1" }}
                          formatter={(v) => [`${v} min`, "Exercício"]}
                        />
                        <Bar
                          dataKey="minutos"
                          fill="#d91c1c"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel className="p-2">
                  <h2 className="px-3 pt-3 pb-1 text-base font-semibold">
                    Atalhos
                  </h2>
                  <QuickAction
                    icon={<RiHeartPulseLine />}
                    title="Registrar pressão"
                    onClick={() => setModal("pressure")}
                  />
                  <QuickAction
                    icon={<RiFootprintLine />}
                    title="Adicionar exercício"
                    onClick={() => setModal("exercise")}
                  />
                  <QuickAction
                    icon={<RiChat3Line />}
                    title="Perguntar ao assistente"
                    onClick={() => setTab("insights")}
                  />
                </Panel>
              </div>
            </>
          )}
          {tab === "nutrition" && (
            <DailyDiary
              state={state}
              setState={setState}
              date={diaryDate}
              setDate={setDiaryDate}
              onExercise={() => setModal("exercise")}
              onProfile={() => setTab("settings")}
              onAnalyze={() => {
                setQuestion(
                  "Com base nos alimentos e exercícios registrados neste dia, estou em déficit calórico? Explique o saldo e as limitações dos dados.",
                );
                setTab("insights");
              }}
            />
          )}
          {tab === "records" && (
            <>
              <PageTitle
                title="Registros"
                text="Peso, exercícios e pressão arterial."
              />
              <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  className="btn-primary"
                  onClick={() => setModal("weight")}
                >
                  <RiAddLine className="size-5" /> Peso
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setModal("exercise")}
                >
                  <RiAddLine className="size-5" /> Exercício
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setModal("pressure")}
                >
                  <RiAddLine className="size-5" /> Pressão
                </button>
                <button className="btn-secondary" onClick={exportData}>
                  <RiDownload2Line className="size-5" /> Exportar
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {(["weights", "exercises", "pressures"] as const).map(
                  (kind, i) => (
                    <Panel key={kind}>
                      <h2 className="text-base font-semibold">
                        {["Peso", "Exercícios", "Pressão arterial"][i]}
                      </h2>
                      {!state[kind].length ? (
                        <p className="py-8 text-sm text-ink-500">
                          Nenhum registro ainda.
                        </p>
                      ) : (
                        <ul className="mt-2 divide-y divide-line">
                          {byDate(state[kind] as { id: string; date: string }[])
                            .reverse()
                            .map((item) => {
                              const w = state.weights.find(
                                (x) => x.id === item.id,
                              );
                              const ex = state.exercises.find(
                                (x) => x.id === item.id,
                              );
                              const p = state.pressures.find(
                                (x) => x.id === item.id,
                              );
                              return (
                                <li
                                  className="flex items-start justify-between gap-2 py-3"
                                  key={item.id}
                                >
                                  <div className="min-w-0">
                                    <strong className="block font-semibold tabular-nums">
                                      {w
                                        ? `${fmt(w.value)} kg`
                                        : ex
                                          ? ex.type
                                          : `${p?.systolic}/${p?.diastolic} mmHg`}
                                    </strong>
                                    <small className="mt-0.5 block text-[13px] text-ink-500">
                                      {dateLabel(item.date)}{" "}
                                      {item.date.slice(0, 4)}
                                      {ex
                                        ? ` · ${ex.minutes} min · ${ex.intensity}${ex.distanceKm ? ` · ${ex.distanceKm} km` : ""}${ex.activeCalories !== undefined ? ` · ${ex.activeCalories} kcal ativas` : ""}`
                                        : ""}
                                    </small>
                                    <PhotoStrip paths={ex?.photos} />
                                  </div>
                                  <button
                                    className="icon-btn -mr-2 hover:text-brand-600"
                                    aria-label="Excluir registro"
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          "Excluir este registro?",
                                        )
                                      )
                                        return;
                                      void removePhotos(ex?.photos);
                                      setState({
                                        ...state,
                                        completedDays:
                                          kind === "exercises"
                                            ? reopenDay(state, item.date)
                                            : state.completedDays,
                                        [kind]: state[kind].filter(
                                          (x) => x.id !== item.id,
                                        ),
                                      });
                                    }}
                                  >
                                    <RiDeleteBin6Line className="size-[18px]" />
                                  </button>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </Panel>
                  ),
                )}
              </div>
            </>
          )}
          {tab === "goals" && (
            <>
              <PageTitle
                title="Meta de peso"
                text="Defina um peso alvo e veja uma estimativa de prazo."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <CardHeader title="Objetivo" />
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const goal = Number(f.get("goal"));
                      const intake = Number(f.get("intake"));
                      if (!weight || goal >= weight) {
                        setNotice(
                          "Registre seu peso e escolha uma meta abaixo do peso atual.",
                        );
                        return;
                      }
                      setState({ ...state, goal, intake });
                      setNotice("Meta atualizada.");
                    }}
                  >
                    <Field label="Peso desejado (kg)">
                      <input
                        className="input"
                        name="goal"
                        type="number"
                        min="20"
                        max="400"
                        step="0.1"
                        required
                        defaultValue={state.goal || ""}
                      />
                    </Field>
                    <Field label="Consumo diário para a simulação (kcal)">
                      <input
                        className="input"
                        name="intake"
                        type="number"
                        min="1"
                        max="10000"
                        required
                        defaultValue={state.intake || ""}
                      />
                      <span className="hint block">
                        Use um valor combinado com seu profissional de saúde. O
                        app não prescreve dietas.
                      </span>
                    </Field>
                    <button className="btn-primary" type="submit">
                      <RiCheckLine className="size-5" /> Salvar meta
                    </button>
                  </form>
                </Panel>
                <Panel>
                  <CardHeader title="Prazo estimado" />
                  <div className="flex items-baseline gap-2">
                    <strong className="text-5xl font-semibold tracking-tight tabular-nums">
                      {days ? `~${days}` : "—"}
                    </strong>
                    {days ? <span className="text-ink-500">dias</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-ink-500">
                    {days
                      ? "Cálculo com os valores informados."
                      : "Preencha peso, perfil, meta e consumo para calcular."}
                  </p>
                  <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                    <div className="flex justify-between py-3">
                      <dt className="text-ink-500">Basal estimado</dt>
                      <dd className="font-medium tabular-nums">
                        {bmr ? `${fmt(bmr)} kcal/dia` : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between py-3">
                      <dt className="text-ink-500">Gasto diário estimado</dt>
                      <dd className="font-medium tabular-nums">
                        {expenditure ? `${fmt(expenditure)} kcal/dia` : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className={note + " mt-4"}>
                    Considera 7.700 kcal por kg e gasto constante, sem adaptação
                    do metabolismo, então não é uma data garantida. Só
                    calculamos com diferença entre 100 e 1.000 kcal/dia, o que
                    não é uma recomendação de déficit. Revise a meta com um
                    profissional.
                  </p>
                  <p className={note + " mt-2"}>
                    O nível de atividade do perfil já inclui os exercícios; eles
                    não são somados de novo.
                  </p>
                </Panel>
              </div>
            </>
          )}
          {tab === "insights" && (
            <>
              <PageTitle
                title="Assistente"
                text="Pergunte sobre o consumo, os exercícios e o saldo de um dia."
              />
              <Panel className="max-w-3xl">
                <Field label="Dia da análise">
                  <input
                    className="input"
                    type="date"
                    value={diaryDate}
                    max={today()}
                    onChange={(e) => {
                      if (e.target.value && e.target.value <= today())
                        setDiaryDate(e.target.value);
                    }}
                  />
                </Field>
                <div className="mt-3 flex flex-col gap-2 rounded-lg bg-surface p-3 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {balanceLabels[day.status]} · {day.foodCount} alimento(s) ·{" "}
                    {day.exerciseCount} exercício(s).{" "}
                    {day.complete
                      ? "Dia marcado como completo."
                      : "Com o dia incompleto, o assistente não conclui se houve déficit."}
                  </span>
                  <button
                    className="btn-ghost self-start sm:self-auto"
                    onClick={() => setTab("nutrition")}
                  >
                    Abrir diário <RiArrowRightLine className="size-4" />
                  </button>
                </div>
                <div className="my-5 flex flex-wrap gap-2">
                  {[
                    "Estou em déficit calórico neste dia?",
                    "Resuma meu progresso até aqui.",
                    "O que significa metabolismo basal?",
                    "Como acompanhar minha constância?",
                  ].map((q) => (
                    <button
                      key={q}
                      className="min-h-9 rounded-full border border-line px-3 py-1.5 text-left text-sm text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => setQuestion(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                {(!supabase || !user) && (
                  <div className="mb-4 rounded-lg bg-surface p-3 text-sm text-ink-700">
                    O assistente precisa de uma conta conectada e da função do
                    Gemini configurada.{" "}
                    <button
                      className="btn-ghost"
                      onClick={() => setTab("settings")}
                    >
                      Ver perfil <RiArrowRightLine className="size-4" />
                    </button>
                  </div>
                )}
                <form onSubmit={ask}>
                  <Field label="Sua pergunta">
                    <textarea
                      className="input min-h-28 py-2.5"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      maxLength={1000}
                      required
                      placeholder="Escreva sua pergunta"
                    />
                  </Field>
                  <p className={note + " mt-2"}>
                    Enviamos ao Gemini a pergunta e um resumo do dia: peso,
                    meta, dados do perfil usados no cálculo, alimentos e
                    exercícios. Nome, fotos e pressão arterial não são enviados.
                    O assistente não faz diagnóstico nem prescreve tratamento.
                  </p>
                  <button
                    className="btn-primary mt-4 w-full sm:w-auto"
                    disabled={!supabase || !user || busy || !question.trim()}
                  >
                    {busy ? "Consultando…" : "Enviar pergunta"}
                  </button>
                </form>
                {answer && (
                  <div
                    className="mt-6 rounded-lg border border-line bg-surface p-4 leading-relaxed whitespace-pre-wrap"
                    aria-live="polite"
                  >
                    {answer}
                  </div>
                )}
              </Panel>
            </>
          )}
          {tab === "settings" && (
            <>
              <PageTitle
                title="Perfil"
                text="Esses dados entram no cálculo das estimativas."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <CardHeader title="Sobre você" />
                  <div className="mb-5 flex items-center gap-4">
                    <Avatar
                      path={state.profile.photo}
                      name={state.profile.name}
                      size={72}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="btn-secondary relative">
                        <RiCameraLine className="size-5" />
                        {state.profile.photo ? "Trocar foto" : "Adicionar foto"}
                        <input
                          className="absolute inset-0 cursor-pointer opacity-0"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void changePhoto(file);
                          }}
                        />
                      </label>
                      {state.profile.photo && (
                        <button
                          type="button"
                          className="btn-ghost text-ink-500 hover:text-brand-700"
                          disabled={busy}
                          onClick={() => void changePhoto(null)}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={saveProfile}>
                    <Field label="Nome">
                      <input
                        className="input"
                        name="name"
                        maxLength={60}
                        defaultValue={state.profile.name}
                        placeholder="Como quer ser chamado(a)"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Altura (cm)">
                        <input
                          className="input"
                          name="height"
                          type="number"
                          min="100"
                          max="250"
                          step="0.1"
                          required
                          defaultValue={state.profile.height}
                        />
                      </Field>
                      <Field label="Idade (anos)">
                        <input
                          className="input"
                          name="age"
                          type="number"
                          min="18"
                          max="100"
                          required
                          defaultValue={state.profile.age}
                        />
                      </Field>
                    </div>
                    <Field label="Gênero">
                      <select
                        className="input"
                        name="gender"
                        defaultValue={state.profile.gender}
                      >
                        {[
                          "Não informado",
                          "Mulher",
                          "Homem",
                          "Não binário",
                          "Outro",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Coeficiente da fórmula basal">
                      <select
                        className="input"
                        name="formulaSex"
                        defaultValue={state.profile.formulaSex}
                      >
                        <option value="female">Feminino</option>
                        <option value="male">Masculino</option>
                      </select>
                      <span className="hint block">
                        A fórmula Mifflin–St Jeor só tem coeficientes feminino e
                        masculino, sem relação com identidade de gênero. É uma
                        estimativa para adultos e pode não refletir o seu caso.
                      </span>
                    </Field>
                    <Field label="Nível de atividade (inclui exercícios)">
                      <select
                        className="input"
                        name="activity"
                        defaultValue={state.profile.activity}
                      >
                        <option value="1.2">Pouco ativo</option>
                        <option value="1.375">Levemente ativo</option>
                        <option value="1.55">Moderadamente ativo</option>
                        <option value="1.725">Muito ativo</option>
                      </select>
                    </Field>
                    <button className="btn-primary">
                      <RiCheckLine className="size-5" /> Salvar perfil
                    </button>
                  </form>
                </Panel>
                <div className="grid content-start gap-4">
                  <Panel>
                    <CardHeader
                      title="Conta e backup"
                      text="Os registros ficam neste aparelho. Salve uma cópia na conta para usar em outro."
                    >
                      <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-xs font-medium text-ink-500">
                        {supabase ? "Nuvem" : "Só local"}
                      </span>
                    </CardHeader>
                    {!supabase ? (
                      <div className="rounded-lg bg-surface p-3 text-sm text-ink-700">
                        A conexão com a nuvem não está configurada neste app.
                      </div>
                    ) : user ? (
                      <>
                        <p className="mb-3 truncate text-sm font-medium">
                          {user}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={busy}
                            className="btn-primary flex-1"
                            onClick={() => cloud("save")}
                          >
                            <RiUpload2Line className="size-5" /> Salvar na conta
                          </button>
                          <button
                            disabled={busy}
                            className="btn-secondary flex-1"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Substituir os dados deste aparelho pela cópia da conta?",
                                )
                              )
                                void cloud("load");
                            }}
                          >
                            <RiDownload2Line className="size-5" /> Carregar
                          </button>
                          <button
                            className="btn-secondary"
                            aria-label="Sair da conta"
                            title="Sair da conta"
                            onClick={async () => {
                              const result = await supabase?.auth.signOut({
                                scope: "local",
                              });
                              if (result?.error) {
                                setNotice(
                                  "Não foi possível sair. Tente novamente.",
                                );
                                return;
                              }
                              setNotice(
                                "Conta desconectada. Os dados locais permanecem neste aparelho.",
                              );
                            }}
                          >
                            <RiLogoutBoxRLine className="size-5" />
                          </button>
                        </div>
                      </>
                    ) : null}
                    <AccountAccess
                      user={user}
                      recovery={false}
                      onRecovered={() => {}}
                    />
                  </Panel>
                  <Panel>
                    <CardHeader
                      title="Arquivo de backup"
                      text="Exporte seus registros ou restaure de um arquivo do Ritmo."
                    />
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={exportData}>
                        <RiDownload2Line className="size-5" /> Exportar
                      </button>
                      <label className="btn-secondary relative">
                        <RiUpload2Line className="size-5" /> Importar
                        <input
                          className="absolute inset-0 cursor-pointer opacity-0"
                          type="file"
                          accept="application/json,.json"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              if (file.size > 5000000) throw Error();
                              const data = JSON.parse(await file.text());
                              if (!validState(data)) throw Error();
                              if (
                                window.confirm(
                                  "Substituir os registros locais por este arquivo?",
                                )
                              ) {
                                setState(data);
                                setNotice("Arquivo importado.");
                              }
                            } catch {
                              setNotice(
                                "Arquivo inválido. Use um backup JSON exportado pelo Ritmo (até 5 MB).",
                              );
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <button
                      className="btn-ghost mt-4 text-brand-700"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Apagar todos os dados deste aparelho? A cópia na nuvem será mantida.",
                          )
                        ) {
                          setState(structuredClone(initial));
                          setNotice("Dados locais apagados.");
                        }
                      }}
                    >
                      <RiDeleteBin6Line className="size-4" /> Apagar dados deste
                      aparelho
                    </button>
                  </Panel>
                </div>
              </div>
            </>
          )}
          <footer className="mt-10 border-t border-line pt-5 pb-2 text-xs text-ink-400">
            Estimativas para acompanhamento, não diagnóstico.
          </footer>
        </div>
      </main>
      {notice && (
        <div
          className="fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-ink-900 py-3 pr-2 pl-4 text-sm text-white md:bottom-6"
          role="status"
        >
          <span className="flex-1">{notice}</span>
          <button
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          >
            <RiCloseLine className="size-5" />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          <section
            id="record-dialog"
            className="max-h-[calc(100dvh-24px-env(safe-area-inset-top))] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-sm sm:max-w-md sm:rounded-2xl sm:pb-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="modal-title" className="text-lg font-semibold">
                {modal === "weight"
                  ? "Registrar peso"
                  : modal === "exercise"
                    ? "Registrar exercício"
                    : "Registrar pressão"}
              </h2>
              <button
                className="icon-btn -mr-2"
                aria-label="Fechar"
                onClick={() => setModal("")}
              >
                <RiCloseLine className="size-6" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={submitRecord}>
              <Field label="Data">
                <input
                  className="input"
                  autoFocus
                  name="date"
                  type="date"
                  defaultValue={tab === "nutrition" ? diaryDate : today()}
                  max={today()}
                  required
                />
              </Field>
              {modal === "weight" ? (
                <Field label="Peso (kg)">
                  <input
                    className="input"
                    name="value"
                    type="number"
                    min="20"
                    max="400"
                    step="0.1"
                    required
                    placeholder="Ex.: 78,5"
                  />
                  <span className="hint block">
                    Um peso por dia. Registrar de novo na mesma data substitui o
                    anterior.
                  </span>
                </Field>
              ) : modal === "exercise" ? (
                <ExerciseFields />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sistólica (mmHg)">
                    <input
                      className="input"
                      name="systolic"
                      type="number"
                      min="50"
                      max="300"
                      required
                      placeholder="120"
                    />
                  </Field>
                  <Field label="Diastólica (mmHg)">
                    <input
                      className="input"
                      name="diastolic"
                      type="number"
                      min="30"
                      max="200"
                      required
                      placeholder="80"
                    />
                  </Field>
                </div>
              )}
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? (
                  "Enviando fotos…"
                ) : (
                  <>
                    <RiCheckLine className="size-5" /> Salvar
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  unit,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-500">{label}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-[18px]">
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        <small className="ml-1 text-sm font-normal tracking-normal text-ink-500">
          {unit}
        </small>
      </div>
      <p className="mt-1 text-[13px] text-ink-500">{detail}</p>
    </Panel>
  );
}
function QuickAction({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-surface"
      onClick={onClick}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">
        {icon}
      </span>
      <span className="flex-1">{title}</span>
      <RiArrowRightSLine className="size-5 text-ink-400" />
    </button>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: () => void;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="mb-1 grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">
        {icon}
      </span>
      <strong className="font-semibold">{title}</strong>
      <p className="text-sm text-ink-500">{text}</p>
      <button className="btn-ghost mt-1" onClick={action}>
        <RiAddLine className="size-4" /> Registrar peso
      </button>
    </div>
  );
}
function PageTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-ink-500">{text}</p>
    </div>
  );
}
