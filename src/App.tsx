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
import {
  Activity,
  Camera,
  Utensils,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Flame,
  Footprints,
  Heart,
  LayoutDashboard,
  LogOut,
  Plus,
  Scale,
  Settings,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
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
const tabs = [
  {
    id: "overview",
    label: "Visão geral",
    short: "Início",
    icon: LayoutDashboard,
  },
  { id: "nutrition", label: "Alimentação", short: "Diário", icon: Utensils },
  {
    id: "records",
    label: "Meus registros",
    short: "Registros",
    icon: Activity,
  },
  { id: "goals", label: "Minha meta", short: "Meta", icon: Target },
  { id: "insights", label: "Assistente IA", short: "IA", icon: Sparkles },
  {
    id: "settings",
    label: "Perfil e conexões",
    short: "Perfil",
    icon: Settings,
  },
];
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
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
  return <section className={"panel " + className}>{children}</section>;
}
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
            ".modal button, .modal input, .modal select, .modal textarea",
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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setTab("overview")}>
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          ritmo<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-caption">SEU ESPAÇO DE CUIDADO</div>
        <nav>
          {tabs.map(({ id, label, short, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(id)}
              aria-label={label}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={20} />
              <span className="nav-label">{label}</span>
              <span className="nav-short">{short}</span>
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="little-sun">✳</div>
          <h3>Um pouco, todos os dias.</h3>
          <p>Pequenos passos também levam você longe.</p>
          <span>NO SEU TEMPO. NO SEU RITMO.</span>
        </div>
        <button className="sidebar-user" onClick={() => setTab("settings")}>
          <Avatar path={state.profile.photo} name={state.profile.name} />
          <span>
            <strong>{state.profile.name || "Seu perfil"}</strong>
            <small>{user ? "Conta conectada" : "Salvo neste aparelho"}</small>
          </span>
          <Settings size={17} />
        </button>
      </aside>
      <main>
        <header className="topbar">
          <span className="breadcrumb">
            Meu espaço <ChevronRight size={14} />{" "}
            <strong>{tabs.find((t) => t.id === tab)?.label}</strong>
          </span>
          <span className="today">
            <span className="status-dot" />
            {new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </header>
        <div className="content">
          {tab === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CADA PASSO CONTA</div>
                  <h1>
                    Seu bem-estar, em movimento<span>.</span>
                  </h1>
                  <p>
                    Olá
                    {state.profile.name
                      ? `, ${state.profile.name.split(" ")[0]}`
                      : ""}
                    ! Vamos cuidar de você hoje?
                  </p>
                </div>
                <button className="primary" onClick={() => setModal("weight")}>
                  <Plus size={18} /> Registrar peso
                </button>
              </div>
              <div className="hero">
                <div className="hero-copy">
                  <span className="pill">
                    <span /> SUA JORNADA, SEU RITMO
                  </span>
                  <h2>
                    Mais equilíbrio.
                    <br />
                    Uma conquista de cada vez.
                  </h2>
                  <p>
                    Acompanhe sua evolução e transforme pequenas
                    <br className="desktop-break" /> escolhas em hábitos que
                    fazem bem.
                  </p>
                  <button onClick={() => setTab("goals")}>
                    Ver minha meta <ArrowRight size={17} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-path" />
                  <div className="floating-heart">
                    <Heart size={28} />
                  </div>
                  <div className="art-ring">
                    <Footprints size={56} strokeWidth={1.5} />
                  </div>
                  <div className="floating-leaf">↗</div>
                  <div className="art-caption">PROGRESSO, NÃO PERFEIÇÃO</div>
                </div>
              </div>
              <section className="panel dashboard-diary">
                <div>
                  <span className="eyebrow">ALIMENTAÇÃO E EXERCÍCIOS</span>
                  <h2>{balanceLabels[dailyEnergy(state, today()).status]}</h2>
                  <p>
                    Registre alimentos em gramas e o gasto dos treinos para
                    entender o seu dia.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setDiaryDate(today());
                    setTab("nutrition");
                  }}
                >
                  <Utensils size={17} /> Abrir diário
                </button>
              </section>
              <div className="stats">
                <Stat
                  icon={<Scale />}
                  label="Peso atual"
                  value={weight ? fmt(weight) : "—"}
                  unit="kg"
                  detail={
                    state.weights.length > 1
                      ? `${difference > 0 ? "+" : ""}${fmt(Number(difference.toFixed(1)))} kg desde o primeiro registro`
                      : "Seu ponto de partida começa aqui"
                  }
                  color="green"
                />
                <Stat
                  icon={<Flame />}
                  label="Metabolismo basal"
                  value={bmr ? fmt(bmr) : "—"}
                  unit="kcal/dia"
                  detail="Estimativa de energia em repouso"
                  color="orange"
                />
                <Stat
                  icon={<Footprints />}
                  label="Movimento na semana"
                  value={fmt(minutes)}
                  unit="min"
                  detail={`${week.length} atividade${week.length === 1 ? "" : "s"} nos últimos 7 dias`}
                  color="purple"
                />
                <Stat
                  icon={<Target />}
                  label="Sua meta de peso"
                  value={state.goal ? fmt(state.goal) : "—"}
                  unit="kg"
                  detail={
                    state.goal && weight
                      ? `${fmt(Math.max(0, Number((weight - state.goal).toFixed(1))))} kg até sua meta`
                      : "Defina uma direção para sua jornada"
                  }
                  color="yellow"
                />
              </div>
              <div className="dashboard-grid">
                <Panel>
                  <div className="panel-heading">
                    <div>
                      <h2>Evolução do peso</h2>
                      <p>Uma visão mais ampla do seu progresso</p>
                    </div>
                    <select
                      aria-label="Período do gráfico"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option value="30">Últimos 30 dias</option>
                      <option value="90">Últimos 90 dias</option>
                      <option value="365">Último ano</option>
                    </select>
                  </div>
                  {chart.length ? (
                    <div className="chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chart}
                          margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
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
                                stopColor="#3a8b6e"
                                stopOpacity={0.23}
                              />
                              <stop
                                offset="100%"
                                stopColor="#3a8b6e"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="4 5"
                            stroke="#e6eae6"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#87918b" }}
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#87918b" }}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} kg`, "Peso"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="peso"
                            stroke="#3a8b6e"
                            strokeWidth={3}
                            fill="url(#weightFill)"
                            dot={{
                              r: 4,
                              fill: "#3a8b6e",
                              stroke: "white",
                              strokeWidth: 2,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty
                      icon={<TrendingUp />}
                      title="Sua história começa com um registro"
                      text="Adicione seu peso para acompanhar a evolução por aqui."
                      action={() => setModal("weight")}
                    />
                  )}
                  <div className="chart-footer">
                    <span className="legend-dot" /> Peso registrado{" "}
                    <span className="right-note">
                      Cada corpo tem seu próprio ritmo
                    </span>
                  </div>
                </Panel>
                <Panel className="goal-panel">
                  <div className="panel-heading">
                    <h2>Um passo mais perto</h2>
                    <Target size={20} />
                  </div>
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#3b8065 ${progress * 3.6}deg, #edf0e8 0deg)`,
                    }}
                  >
                    <div>
                      <strong>
                        {Math.round(progress)}
                        <small>%</small>
                      </strong>
                      <span>da sua jornada</span>
                    </div>
                  </div>
                  <div className="goal-values">
                    <div>
                      <span>Início</span>
                      <strong>{first ? `${fmt(first)} kg` : "—"}</strong>
                    </div>
                    <ArrowRight size={16} />
                    <div>
                      <span>Meta</span>
                      <strong>
                        {state.goal ? `${fmt(state.goal)} kg` : "A definir"}
                      </strong>
                    </div>
                  </div>
                  <p className="goal-tip">
                    {state.goal
                      ? "Consistência vale mais que pressa. Continue registrando sua evolução."
                      : "Uma meta é um convite para começar. Escolha a sua."}
                  </p>
                  <button
                    className="secondary full"
                    onClick={() => setTab("goals")}
                  >
                    Acompanhar minha meta <ArrowRight size={16} />
                  </button>
                </Panel>
                <Panel>
                  <div className="panel-heading">
                    <div>
                      <h2>Seu movimento</h2>
                      <p>Minutos de atividade nos últimos 7 dias</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setModal("exercise")}
                    >
                      <Plus size={16} /> Atividade
                    </button>
                  </div>
                  <div className="chart small">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={exerciseChart}
                        margin={{ left: -25, right: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="4 5"
                          stroke="#e6eae6"
                        />
                        <XAxis
                          dataKey="dia"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#87918b" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#87918b" }}
                        />
                        <Tooltip formatter={(v) => [`${v} min`, "Atividade"]} />
                        <Bar
                          dataKey="minutos"
                          fill="#9bb9a3"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel className="quick-panel">
                  <div className="panel-heading">
                    <h2>Como você está hoje?</h2>
                    <Heart size={20} />
                  </div>
                  <p>Reserve um momento para cuidar de você.</p>
                  <button
                    className="quick-action"
                    onClick={() => setModal("pressure")}
                  >
                    <span className="icon-box pink">
                      <Heart size={20} />
                    </span>
                    <span>
                      <strong>Registrar pressão</strong>
                      <small>Acompanhe seu histórico</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                  <button
                    className="quick-action"
                    onClick={() => setModal("exercise")}
                  >
                    <span className="icon-box purple">
                      <Footprints size={20} />
                    </span>
                    <span>
                      <strong>Adicionar exercício</strong>
                      <small>Todo movimento conta</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                  <button
                    className="ai-link"
                    onClick={() => setTab("insights")}
                  >
                    <Sparkles size={17} /> Conheça seu assistente{" "}
                    <ArrowRight size={16} />
                  </button>
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
                eyebrow="SEU HISTÓRICO"
                title="Pequenos passos, registrados."
                text="Peso, pressão e movimento reunidos em um só lugar."
              />
              <div className="action-row">
                <button className="primary" onClick={() => setModal("weight")}>
                  <Plus size={17} /> Peso
                </button>
                <button
                  className="secondary"
                  onClick={() => setModal("exercise")}
                >
                  <Plus size={17} /> Exercício
                </button>
                <button
                  className="secondary"
                  onClick={() => setModal("pressure")}
                >
                  <Plus size={17} /> Pressão
                </button>
                <button className="secondary" onClick={exportData}>
                  <Download size={17} /> Exportar dados
                </button>
              </div>
              <div className="record-grid">
                {(["weights", "exercises", "pressures"] as const).map(
                  (kind, i) => (
                    <Panel key={kind}>
                      <h2>{["Peso", "Exercícios", "Pressão arterial"][i]}</h2>
                      {!state[kind].length ? (
                        <p className="muted empty-inline">
                          Nenhum registro ainda.
                        </p>
                      ) : (
                        <div className="record-list">
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
                                <div className="record" key={item.id}>
                                  <div>
                                    <strong>
                                      {w
                                        ? `${fmt(w.value)} kg`
                                        : ex
                                          ? ex.type
                                          : `${p?.systolic}/${p?.diastolic} mmHg`}
                                    </strong>
                                    <small>
                                      {dateLabel(item.date)}{" "}
                                      {item.date.slice(0, 4)}
                                      {ex
                                        ? ` · ${ex.minutes} min · ${ex.intensity}${ex.distanceKm ? ` · ${ex.distanceKm} km` : ""}${ex.activeCalories !== undefined ? ` · ${ex.activeCalories} kcal ativas` : ""}`
                                        : ""}
                                    </small>
                                    <PhotoStrip paths={ex?.photos} />
                                  </div>
                                  <button
                                    className="icon-button"
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
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
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
                eyebrow="UMA DIREÇÃO PARA SEGUIR"
                title="Sua meta, no seu tempo."
                text="Planeje com cuidado e acompanhe a evolução real."
              />
              <div className="two-columns">
                <Panel>
                  <h2>Defina seu objetivo</h2>
                  <form
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
                        name="goal"
                        type="number"
                        min="20"
                        max="400"
                        step="0.1"
                        required
                        defaultValue={state.goal || ""}
                      />
                    </Field>
                    <Field label="Consumo calórico diário para a simulação (kcal)">
                      <input
                        name="intake"
                        type="number"
                        min="1"
                        max="10000"
                        required
                        defaultValue={state.intake || ""}
                      />
                    </Field>
                    <p className="form-note">
                      Informe um consumo definido com seu profissional de saúde.
                      O aplicativo não prescreve dietas.
                    </p>
                    <button className="primary" type="submit">
                      Salvar meta <Check size={17} />
                    </button>
                  </form>
                </Panel>
                <Panel>
                  <div className="icon-box green">
                    <Target />
                  </div>
                  <h2 className="spaced">Simulação de prazo</h2>
                  <div className="projection">
                    {days ? `~${days}` : "—"} <span>{days ? "dias" : ""}</span>
                  </div>
                  <p>
                    {days
                      ? "Cenário matemático inicial com os valores informados."
                      : "Cadastre peso, perfil, meta e consumo para visualizar um cenário."}
                  </p>
                  <div className="summary-row">
                    <span>Basal estimado</span>
                    <strong>{bmr ? `${fmt(bmr)} kcal/dia` : "—"}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Gasto diário estimado</span>
                    <strong>
                      {expenditure ? `${fmt(expenditure)} kcal/dia` : "—"}
                    </strong>
                  </div>
                  <p className="form-note">
                    A simulação usa 7.700 kcal/kg e gasto constante; não prevê
                    adaptações metabólicas nem garante uma data. Só exibimos
                    cenários com diferença de 100 a 1.000 kcal/dia, sem
                    recomendar esse déficit. Reavalie a meta com um
                    profissional.
                  </p>
                  <p className="form-note">
                    O fator de atividade do perfil já inclui exercícios. Os
                    registros não são somados novamente ao gasto diário.
                  </p>
                </Panel>
              </div>
            </>
          )}
          {tab === "insights" && (
            <>
              <PageTitle
                eyebrow="ENTENDA SUA JORNADA"
                title="Uma conversa sobre seu progresso."
                text="Explicações claras para acompanhar seus hábitos com mais consciência."
              />
              <Panel className="assistant-panel">
                <span className="icon-box green">
                  <Sparkles />
                </span>
                <h2>Seu assistente Ritmo</h2>
                <p>
                  Entenda o consumo, os exercícios e o saldo estimado do dia
                  selecionado.
                </p>
                <Field label="Dia da análise">
                  <input
                    type="date"
                    value={diaryDate}
                    max={today()}
                    onChange={(e) => {
                      if (e.target.value && e.target.value <= today())
                        setDiaryDate(e.target.value);
                    }}
                  />
                </Field>
                <p className="connection-note">
                  {balanceLabels[day.status]} · {day.foodCount} alimento(s) ·{" "}
                  {day.exerciseCount} exercício(s).{" "}
                  {day.complete
                    ? "Dia marcado como completo."
                    : "A IA não concluirá déficit com registros incompletos."}
                </p>
                <button
                  className="text-button"
                  onClick={() => setTab("nutrition")}
                >
                  Ver ou completar o diário <ArrowRight size={15} />
                </button>
                <div className="suggestions">
                  {[
                    "Estou em déficit calórico neste dia?",
                    "Resuma meu progresso até aqui.",
                    "O que significa metabolismo basal?",
                    "Como acompanhar minha constância?",
                  ].map((q) => (
                    <button
                      key={q}
                      className="secondary"
                      onClick={() => setQuestion(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                {(!supabase || !user) && (
                  <div className="connection-note">
                    O assistente precisa de uma conta conectada e da função
                    Gemini configurada.{" "}
                    <button
                      className="text-button"
                      onClick={() => setTab("settings")}
                    >
                      Ver conexões <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                <form onSubmit={ask}>
                  <Field label="Sua pergunta">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      maxLength={1000}
                      required
                      placeholder="O que você gostaria de entender?"
                    />
                  </Field>
                  <p className="form-note">
                    Ao enviar, você compartilha com o Gemini a pergunta e um
                    resumo de peso e meta, perfil usado no cálculo, alimentos,
                    gramas, calorias e exercícios do dia selecionado. Nome e
                    pressão arterial não são enviados. O assistente não faz
                    diagnósticos nem prescreve tratamentos.
                  </p>
                  <button
                    className="primary"
                    disabled={!supabase || !user || busy || !question.trim()}
                  >
                    {busy ? "Consultando…" : "Conversar com o assistente"}
                    <Sparkles size={17} />
                  </button>
                </form>
                {answer && (
                  <div className="assistant-answer" aria-live="polite">
                    {answer}
                  </div>
                )}
              </Panel>
            </>
          )}
          {tab === "settings" && (
            <>
              <PageTitle
                eyebrow="DO SEU JEITO"
                title="Seu perfil e suas conexões."
                text="Mantenha seus dados atualizados para melhorar as estimativas."
              />
              <div className="two-columns">
                <Panel>
                  <h2>Sobre você</h2>
                  <div className="profile-photo">
                    <Avatar
                      path={state.profile.photo}
                      name={state.profile.name}
                      size={72}
                    />
                    <div>
                      <label className="secondary import-button">
                        <Camera size={17} />
                        {state.profile.photo ? "Trocar foto" : "Adicionar foto"}
                        <input
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
                          className="danger-button"
                          disabled={busy}
                          onClick={() => void changePhoto(null)}
                        >
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>
                  <form onSubmit={saveProfile}>
                    <Field label="Como podemos chamar você?">
                      <input
                        name="name"
                        maxLength={60}
                        defaultValue={state.profile.name}
                        placeholder="Seu nome"
                      />
                    </Field>
                    <div className="form-grid">
                      <Field label="Altura (cm)">
                        <input
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
                      <select name="gender" defaultValue={state.profile.gender}>
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
                    <Field label="Parâmetro fisiológico da fórmula basal">
                      <select
                        name="formulaSex"
                        defaultValue={state.profile.formulaSex}
                      >
                        <option value="female">Coeficiente feminino</option>
                        <option value="male">Coeficiente masculino</option>
                      </select>
                    </Field>
                    <p className="form-note">
                      A fórmula Mifflin–St Jeor utiliza coeficientes binários,
                      independentes da identidade de gênero. Esta estimativa
                      para adultos pode não representar sua situação individual.
                    </p>
                    <Field label="Nível habitual de atividade (incluindo exercícios)">
                      <select
                        name="activity"
                        defaultValue={state.profile.activity}
                      >
                        <option value="1.2">Pouco ativo</option>
                        <option value="1.375">Levemente ativo</option>
                        <option value="1.55">Moderadamente ativo</option>
                        <option value="1.725">Muito ativo</option>
                      </select>
                    </Field>
                    <button className="primary">
                      Salvar perfil <Check size={17} />
                    </button>
                  </form>
                </Panel>
                <div className="stack">
                  <Panel>
                    <div className="panel-heading">
                      <h2>Conta e backup</h2>
                      <span className="badge">
                        {supabase ? "Disponível" : "Modo local"}
                      </span>
                    </div>
                    <p>
                      Os registros ficam neste aparelho. Salve uma cópia na sua
                      conta para transferir seus dados.
                    </p>
                    {!supabase ? (
                      <div className="connection-note">
                        A conexão com a nuvem ainda não foi configurada neste
                        aplicativo.
                      </div>
                    ) : user ? (
                      <>
                        <p>
                          <strong>{user}</strong>
                        </p>
                        <div className="action-row">
                          <button
                            disabled={busy}
                            className="primary"
                            onClick={() => cloud("save")}
                          >
                            Salvar na conta
                          </button>
                          <button
                            disabled={busy}
                            className="secondary"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Substituir os dados deste aparelho pela cópia da conta?",
                                )
                              )
                                void cloud("load");
                            }}
                          >
                            Carregar da conta
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Sair da conta"
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
                            <LogOut size={18} />
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
                    <h2>Seus dados são seus</h2>
                    <p>
                      Exporte uma cópia ou restaure seus registros de um arquivo
                      Ritmo.
                    </p>
                    <div className="action-row">
                      <button className="secondary" onClick={exportData}>
                        <Download size={16} /> Exportar
                      </button>
                      <label className="secondary import-button">
                        Importar
                        <input
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
                      className="danger-button"
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
                      Apagar dados deste aparelho
                    </button>
                  </Panel>
                </div>
              </div>
            </>
          )}
          <footer>
            <span>
              <Activity size={14} /> ritmo · Sua saúde, no seu tempo.
            </span>
            <span>Estimativas para acompanhamento, não diagnóstico.</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="panel-heading">
              <h2 id="modal-title">
                {modal === "weight"
                  ? "Registrar peso"
                  : modal === "exercise"
                    ? "Registrar exercício"
                    : "Registrar pressão"}
              </h2>
              <button
                className="icon-button"
                aria-label="Fechar"
                onClick={() => setModal("")}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submitRecord}>
              <Field label="Data">
                <input
                  autoFocus
                  name="date"
                  type="date"
                  defaultValue={tab === "nutrition" ? diaryDate : today()}
                  max={today()}
                  required
                />
              </Field>
              {modal === "weight" ? (
                <>
                  <Field label="Peso (kg)">
                    <input
                      name="value"
                      type="number"
                      min="20"
                      max="400"
                      step="0.1"
                      required
                      placeholder="Ex.: 78,5"
                    />
                  </Field>
                  <p className="form-note">
                    Um peso por dia. Um novo registro na mesma data substitui o
                    anterior.
                  </p>
                </>
              ) : modal === "exercise" ? (
                <ExerciseFields />
              ) : (
                <div className="form-grid">
                  <Field label="Sistólica (mmHg)">
                    <input
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
              <button className="primary full" disabled={busy}>
                {busy ? "Enviando fotos…" : "Salvar registro"}{" "}
                <Check size={17} />
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
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  detail: string;
  color: string;
}) {
  return (
    <Panel className="stat">
      <div className="stat-label">
        <span>{label}</span>
        <span className={"icon-box " + color}>{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <small>{unit}</small>
      </div>
      <p>{detail}</p>
    </Panel>
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
    <div className="empty">
      <span className="icon-box green">{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <button className="text-button" onClick={action}>
        Adicionar primeiro peso <ArrowRight size={15} />
      </button>
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
