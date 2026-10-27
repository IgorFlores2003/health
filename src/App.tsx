import DailyDiary, { balanceLabels } from "./DailyDiary";
import CalorieBudget from "./CalorieBudget";
import ExerciseFields from "./ExerciseFields";
import { dailyEnergy, foodCalories, reopenDay } from "./energy";
import FoodSheet from "./FoodSheet";
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
  RiCloudLine,
  RiCloudOffLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiFileList3Fill,
  RiFileList3Line,
  RiFireLine,
  RiFootprintLine,
  RiHeartPulseLine,
  RiHome5Fill,
  RiHome5Line,
  RiLineChartLine,
  RiLogoutBoxRLine,
  RiFocus3Line,
  RiPencilLine,
  RiPlayCircleFill,
  RiPlayCircleLine,
  RiPulseLine,
  RiSideBarFill,
  RiSideBarLine,
  RiRestaurant2Fill,
  RiRestaurant2Line,
  RiScales3Line,
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
  durationLabel,
  initial,
  MAX_PHOTOS,
  minimumIntake,
  parseDuration,
  projection,
  goalDirection,
  intakeTarget,
  today,
  validState,
  type Food,
  type State,
} from "./domain";
import { supabase } from "./supabase";
import { confirmDialog } from "./confirm";
import { useCloudSync, type SyncStatus } from "./sync";
import Onboarding from "./Onboarding";
import PressureFields from "./PressureFields";
import ReportCard from "./ReportCard";
import WeightFields from "./WeightFields";
import AccentPicker from "./AccentPicker";
import { applyAccent, DEFAULT_ACCENT, nearestPreset } from "./theme";
import { setAppIcon } from "./appIcon";
import RichText from "./RichText";
import { HydrationSettings, WaterCard } from "./Water";
import { CalorieChart, PressureChart, WaterChart } from "./Charts";
import { syncWaterReminders } from "./reminders";
import VoiceButton from "./VoiceButton";
import { readAudio } from "./voice";
import Videos from "./Videos";
import { useLegal } from "./Legal";
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
    id: "videos",
    label: "Vídeos",
    short: "Vídeos",
    icon: RiPlayCircleLine,
    active: RiPlayCircleFill,
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
/** Foto do usuário com o menu da conta (perfil e sair). */
function AccountMenu({
  photo,
  name,
  email,
  onProfile,
  onSignOut,
  compact,
  up,
  className = "",
}: {
  photo?: string;
  name: string;
  email: string;
  onProfile: () => void;
  onSignOut: () => void;
  compact?: boolean;
  /** Abre o menu para cima (rodapé da barra lateral). */
  up?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-surface";
  return (
    <div ref={ref} className={"relative " + className}>
      <button
        className={
          compact
            ? "flex rounded-full"
            : "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar path={photo} name={name} size={compact ? 32 : 36} />
        {!compact && (
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold">
              {name || "Seu perfil"}
            </strong>
            <small className="block truncate text-xs text-ink-500">
              {email || "Salvo neste aparelho"}
            </small>
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={
            "absolute z-30 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg " +
            (up ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2")
          }
        >
          {compact && email && (
            <p className="truncate px-3 pt-2 pb-1 text-xs text-ink-500">
              {email}
            </p>
          )}
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
          >
            <RiUser3Line className="size-5 text-ink-500" /> Ver perfil
          </button>
          <button
            role="menuitem"
            className={item + " text-brand-700 hover:bg-brand-50"}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <RiLogoutBoxRLine className="size-5" /> Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
const syncText: Record<SyncStatus, string> = {
  loading: "Carregando da conta…",
  saving: "Salvando na conta…",
  saved: "Salvo na conta",
  offline: "Sem conexão: salvo no aparelho, envia quando voltar",
  off: "Salvo só neste aparelho",
};
function SyncBadge({ status, label }: { status: SyncStatus; label?: boolean }) {
  const ok = status === "saved" || status === "saving" || status === "loading";
  const Icon = ok ? RiCloudLine : RiCloudOffLine;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={syncText[status]}
      aria-live="polite"
    >
      <Icon
        className={`size-[18px] ${status === "saved" ? "text-ink-400" : ok ? "animate-pulse text-brand-600" : "text-brand-700"}`}
      />
      {label ? (
        syncText[status]
      ) : (
        <span className="sr-only">{syncText[status]}</span>
      )}
    </span>
  );
}
const note = "text-[13px] leading-relaxed text-ink-500";
const axisTick = { fontSize: 12, fill: "#a1a1aa" };
export default function App({ account }: { account: User }) {
  const localKey = userStorageKey(account.id);
  const user = account.email || "";
  const [state, setState] = useState<State>(() => readLocal(localKey));
  // Volta para a mesma tela ao recarregar ou reabrir o app.
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem("ritmo-tab");
      return tabs.some((t) => t.id === saved) ? saved! : "overview";
    } catch {
      return "overview";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("ritmo-tab", tab);
    } catch {
      /* preferência só deste aparelho */
    }
  }, [tab]);
  const [modal, setModal] = useState("");
  const [foodSheet, setFoodSheet] = useState<{
    food?: Food;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ritmo-sidebar") === "collapsed";
    } catch {
      return false;
    }
  });
  const toggleSidebar = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("ritmo-sidebar", c ? "open" : "collapsed");
      } catch {
        /* preferência só deste aparelho */
      }
      return !c;
    });
  const [editing, setEditing] = useState<string | null>(null);
  const openRecord = (kind: string, id?: string) => {
    setEditing(id ?? null);
    setModal(kind);
  };
  const editItem = editing
    ? (state.weights.find((x) => x.id === editing) ??
      state.exercises.find((x) => x.id === editing) ??
      state.pressures.find((x) => x.id === editing) ??
      state.water?.find((x) => x.id === editing))
    : undefined;
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState("30");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [diaryDate, setDiaryDate] = useState(today);
  const sync = useCloudSync(account.id, state, setState);
  useEffect(() => {
    applyAccent(state.accent);
    try {
      localStorage.setItem("ritmo-accent", state.accent ?? DEFAULT_ACCENT);
    } catch {
      /* só evita o "piscar" da cor padrão ao abrir */
    }
    void setAppIcon(nearestPreset(state.accent ?? DEFAULT_ACCENT));
  }, [state.accent]);
  // Ao sair da conta, a tela de login volta para a cor padrão.
  useEffect(
    () => () => {
      applyAccent(undefined);
      try {
        localStorage.removeItem("ritmo-accent");
      } catch {
        /* nada a limpar */
      }
    },
    [],
  );
  // Reagenda os lembretes de água quando a configuração muda.
  const hydrationKey = JSON.stringify(state.hydration ?? null);
  useEffect(() => {
    syncWaterReminders(state.hydration).catch(() =>
      setNotice("Não foi possível agendar os lembretes de água."),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrationKey]);
  const legal = useLegal();
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
  const target = bmr
    ? intakeTarget(expenditure, weight, state.goal, bmr, state.profile)
    : null;
  const days = target
    ? projection(weight, state.goal, expenditure, target.target)
    : null;
  const sorted = byDate(state.weights);
  const first = sorted[0]?.value || 0;
  const difference = weight - first;
  // Vale para emagrecer (meta abaixo do início) e ganhar (acima).
  const progress =
    state.goal && first && first !== state.goal
      ? Math.min(
          100,
          Math.max(0, ((weight - first) / (state.goal - first)) * 100),
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
    const saved = editItem && "photos" in editItem ? editItem.photos || [] : [];
    // Fotos salvas que continuam no registro (as removidas no formulário saem).
    const keptField = f.get("keptPhotos");
    const kept =
      typeof keptField === "string"
        ? (JSON.parse(keptField) as string[]).filter((p) => saved.includes(p))
        : saved;
    if (kept.length + files.length > MAX_PHOTOS) {
      setNotice(`Use até ${MAX_PHOTOS} fotos por registro.`);
      return;
    }
    const date = String(f.get("date"));
    if (date > today()) {
      setNotice("Escolha uma data até hoje.");
      return;
    }
    // Editar = substituir o registro de mesmo id.
    const id = editItem?.id ?? crypto.randomUUID();
    let next: State;
    if (modal === "water") {
      next = {
        ...state,
        water: [
          ...(state.water ?? []).filter((x) => x.id !== id),
          { id, date, ml: Number(f.get("ml")) },
        ],
      };
    } else if (modal === "weight") {
      const value = Number(f.get("value"));
      next = {
        ...state,
        weights: [
          ...state.weights.filter((x) => x.date !== date && x.id !== id),
          { id, date, value, ...(kept.length ? { photos: kept } : {}) },
        ],
      };
    } else if (modal === "pressure") {
      next = {
        ...state,
        pressures: [
          ...state.pressures.filter((x) => x.id !== id),
          {
            id,
            date,
            systolic: Number(f.get("systolic")),
            diastolic: Number(f.get("diastolic")),
            ...(f.get("pulse") ? { pulse: Number(f.get("pulse")) } : {}),
            ...(kept.length ? { photos: kept } : {}),
          },
        ],
      };
    } else {
      const duration = String(f.get("duration") || "");
      const minutes = duration ? parseDuration(duration) : 0;
      const manualKcal =
        f.get("activeCalories") !== null && f.get("activeCalories") !== "";
      if (
        minutes === null ||
        minutes > 600 ||
        (!manualKcal && minutes * 60 < 1)
      ) {
        setNotice(
          "Informe a duração em horas, minutos e segundos, entre 00:00:01 e 10:00:00.",
        );
        return;
      }
      next = {
        ...state,
        exercises: [
          ...state.exercises.filter((x) => x.id !== id),
          {
            id,
            date,
            type: String(f.get("type")),
            minutes,
            intensity: String(f.get("intensity")) as "Moderada",
            ...(f.get("distanceKm")
              ? { distanceKm: Number(f.get("distanceKm")) }
              : {}),
            ...(f.get("elevationM")
              ? { elevationM: Number(f.get("elevationM")) }
              : {}),
            ...(f.get("activeCalories") !== null &&
            f.get("activeCalories") !== ""
              ? { activeCalories: Number(f.get("activeCalories")) }
              : {}),
            ...(kept.length ? { photos: kept } : {}),
          },
        ],
      };
    }
    if (modal === "exercise") {
      next.completedDays = reopenDay(state, date);
      if (editItem && editItem.date !== date)
        next.completedDays = reopenDay(next, editItem.date);
    }
    if (!validState(next)) {
      setNotice(
        modal === "water"
          ? "Informe entre 1 e 5.000 ml."
          : "Confira os valores, a duração ou as calorias do exercício. Na pressão, a sistólica deve ser maior que a diastólica.",
      );
      return;
    }
    let photos: string[] = [];
    const folder =
      modal === "pressure"
        ? "pressures"
        : modal === "weight"
          ? "weights"
          : "exercises";
    if (files.length) {
      setBusy(true);
      try {
        for (const file of files)
          photos.push(await uploadPhoto(account.id, `${folder}/${id}`, file));
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
    photos = [...kept, ...photos];
    setState(
      photos.length
        ? modal === "weight"
          ? {
              ...next,
              weights: next.weights.map((x) =>
                x.id === id ? { ...x, photos } : x,
              ),
            }
          : modal === "pressure"
            ? {
                ...next,
                pressures: next.pressures.map((x) =>
                  x.id === id ? { ...x, photos } : x,
                ),
              }
            : {
                ...next,
                exercises: next.exercises.map((x) =>
                  x.id === id ? { ...x, photos } : x,
                ),
              }
        : next,
    );
    void removePhotos(saved.filter((p) => !kept.includes(p)));
    setModal("");
    setNotice(
      editItem
        ? "Registro atualizado."
        : photos.length
          ? "Registro e fotos salvos."
          : "Registro salvo.",
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
        file ? "Foto de perfil atualizada." : "Foto de perfil removida.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao enviar a foto.");
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
  async function signOut() {
    if (
      !(await confirmDialog({
        title: "Sair da conta?",
        message:
          "Seus registros continuam salvos na conta. Para ver de novo, é só entrar.",
        confirmLabel: "Sair",
      }))
    )
      return;
    const result = await supabase?.auth.signOut({ scope: "local" });
    if (result?.error) setNotice("Não foi possível sair. Tente novamente.");
  }
  function goToGoal() {
    setTab("settings");
    setTimeout(
      () =>
        document
          .getElementById("meta")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }
  // Antes de pedir o perfil, espera a cópia da conta: ela pode já ter um.
  if (sync.status === "loading")
    return (
      <div className="grid min-h-dvh place-items-center bg-white text-sm text-ink-500">
        Carregando seus dados…
      </div>
    );
  if (!state.profileReviewed)
    return <Onboarding state={state} onDone={setState} />;
  return (
    <div className="min-h-dvh bg-white">
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-line bg-white py-6 transition-[width] md:flex ${collapsed ? "w-[72px] px-3" : "w-60 px-4"}`}
      >
        <div
          className={`mb-8 flex items-center ${collapsed ? "flex-col gap-3" : "justify-between"}`}
        >
          <a
            className="flex items-center gap-2 px-2 text-xl font-bold tracking-tight"
            href="#"
            onClick={() => setTab("overview")}
            aria-label="ritmo, início"
          >
            <RiPulseLine className="size-6 text-brand-600" />
            {!collapsed && "ritmo"}
          </a>
          <button
            className="icon-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <RiSideBarLine className="size-5" />
            ) : (
              <RiSideBarFill className="size-5" />
            )}
          </button>
        </div>
        <nav className="grid gap-1">
          {tabs.map(({ id, label, icon: Icon, active: ActiveIcon }) => (
            <button
              key={id}
              className={
                `flex min-h-11 items-center gap-3 rounded-lg text-left text-sm font-medium transition-colors ${collapsed ? "justify-center px-0" : "px-3"} ` +
                (tab === id
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-surface")
              }
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
            >
              {tab === id ? (
                <ActiveIcon className="size-5" />
              ) : (
                <Icon className="size-5 text-ink-400" />
              )}
              {!collapsed && label}
            </button>
          ))}
        </nav>
        <AccountMenu
          compact={collapsed}
          up
          className={`mt-auto border-t border-line pt-4 ${collapsed ? "flex justify-center" : ""}`}
          photo={state.profile.photo}
          name={state.profile.name}
          email={user}
          onProfile={() => setTab("settings")}
          onSignOut={signOut}
        />
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
      <main
        className={`pb-[calc(64px+env(safe-area-inset-bottom))] transition-[margin] md:pb-0 ${collapsed ? "md:ml-[72px]" : "md:ml-60"}`}
      >
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-8">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <RiPulseLine className="size-5 text-brand-600 md:hidden" />
              {tabs.find((t) => t.id === tab)?.label}
            </span>
            <span className="flex items-center gap-3 text-sm text-ink-500">
              <span className="hidden min-[360px]:inline">
                {new Date().toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <SyncBadge status={sync.status} />
              <AccountMenu
                compact
                className="md:hidden"
                photo={state.profile.photo}
                name={state.profile.name}
                email={user}
                onProfile={() => setTab("settings")}
                onSignOut={signOut}
              />
            </span>
          </div>
        </header>
        <div className="px-4 py-6 md:px-8 md:py-8">
          {tab === "overview" && (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Olá{firstName ? `, ${firstName}` : ""}.
                  </h1>
                  <p className="mt-1 text-ink-500">Resumo de hoje</p>
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={() => openRecord("weight")}
                >
                  <RiAddLine className="size-5" /> Registrar peso
                </button>
              </div>
              <div className="mb-4 grid gap-4 lg:grid-cols-2">
                <CalorieBudget
                  compact
                  state={state}
                  date={today()}
                  onProfile={() => setTab("settings")}
                  onWeight={() => openRecord("weight")}
                >
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-500">
                      {balanceLabels[dailyEnergy(state, today()).status]}
                    </p>
                    <button
                      className="btn-secondary w-full sm:w-auto"
                      onClick={() => {
                        setDiaryDate(today());
                        setTab("nutrition");
                      }}
                    >
                      Abrir diário <RiArrowRightLine className="size-4" />
                    </button>
                  </div>
                </CalorieBudget>
                <WaterCard state={state} setState={setState} date={today()} />
              </div>
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
                      ? `Faltam ${fmt(Math.abs(Number((weight - state.goal).toFixed(1))))} kg`
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
                                stopColor="var(--color-brand-600)"
                                stopOpacity={0.14}
                              />
                              <stop
                                offset="100%"
                                stopColor="var(--color-brand-600)"
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
                            stroke="var(--color-brand-600)"
                            strokeWidth={2}
                            fill="url(#weightFill)"
                            dot={{
                              r: 3,
                              fill: "var(--color-brand-600)",
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
                      action={() => openRecord("weight")}
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
                    onClick={() => goToGoal()}
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
                      onClick={() => openRecord("exercise")}
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
                          cursor={{ fill: "var(--color-brand-50)" }}
                          formatter={(v) => [`${v} min`, "Exercício"]}
                        />
                        <Bar
                          dataKey="minutos"
                          fill="var(--color-brand-600)"
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
                    onClick={() => openRecord("pressure")}
                  />
                  <QuickAction
                    icon={<RiFootprintLine />}
                    title="Adicionar exercício"
                    onClick={() => openRecord("exercise")}
                  />
                  <QuickAction
                    icon={<RiChat3Line />}
                    title="Perguntar ao assistente"
                    onClick={() => setTab("insights")}
                  />
                </Panel>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Panel>
                  <CardHeader
                    title="Calorias"
                    text="Consumido e disponível, últimos 14 dias"
                  />
                  <CalorieChart state={state} days={14} />
                </Panel>
                <Panel>
                  <CardHeader title="Água" text="Últimos 7 dias" />
                  <WaterChart state={state} days={7} />
                </Panel>
                <Panel className="lg:col-span-2">
                  <CardHeader
                    title="Pressão arterial"
                    text="Linhas tracejadas em 140 e 90 mmHg, referência de pressão alta"
                  >
                    <select
                      aria-label="Período do gráfico de pressão"
                      className="input min-h-9 w-auto py-1 text-sm md:text-sm"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option value="30">30 dias</option>
                      <option value="90">90 dias</option>
                      <option value="365">1 ano</option>
                    </select>
                  </CardHeader>
                  <PressureChart state={state} days={Number(period)} />
                </Panel>
              </div>
            </>
          )}
          {tab === "videos" && <Videos />}
          {tab === "nutrition" && (
            <DailyDiary
              state={state}
              setState={setState}
              date={diaryDate}
              setDate={setDiaryDate}
              onExercise={(id) => openRecord("exercise", id)}
              onPressure={(id) => openRecord("pressure", id)}
              onProfile={() => setTab("settings")}
              onWeight={() => openRecord("weight")}
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
                text="Peso, exercícios, pressão arterial, alimentação e água."
              />
              <div className="mb-5">
                <ReportCard state={state} onError={setNotice} />
              </div>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  className="btn-primary"
                  onClick={() => openRecord("weight")}
                >
                  <RiAddLine className="size-5" /> Peso
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => openRecord("exercise")}
                >
                  <RiAddLine className="size-5" /> Exercício
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => openRecord("pressure")}
                >
                  <RiAddLine className="size-5" /> Pressão
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setFoodSheet({})}
                >
                  <RiAddLine className="size-5" /> Alimento
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => openRecord("water")}
                >
                  <RiAddLine className="size-5" /> Água
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
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
                                        ? ` · ${durationLabel(ex.minutes)} · ${ex.intensity}${ex.distanceKm ? ` · ${fmt(ex.distanceKm)} km` : ""}${ex.elevationM ? ` · ${fmt(ex.elevationM)} m de elevação` : ""}${ex.activeCalories !== undefined ? ` · ${ex.activeCalories} kcal ativas` : ""}`
                                        : p?.pulse
                                          ? ` · ${p.pulse} bpm`
                                          : ""}
                                    </small>
                                    <PhotoStrip
                                      paths={
                                        ex?.photos ?? p?.photos ?? w?.photos
                                      }
                                    />
                                  </div>
                                  <div className="-mr-2 flex shrink-0">
                                    <button
                                      className="icon-btn hover:text-brand-600"
                                      aria-label="Editar registro"
                                      onClick={() =>
                                        openRecord(
                                          kind === "weights"
                                            ? "weight"
                                            : kind === "exercises"
                                              ? "exercise"
                                              : "pressure",
                                          item.id,
                                        )
                                      }
                                    >
                                      <RiPencilLine className="size-[18px]" />
                                    </button>
                                    <button
                                      className="icon-btn hover:text-brand-600"
                                      aria-label="Excluir registro"
                                      onClick={async () => {
                                        if (
                                          !(await confirmDialog({
                                            title: "Excluir registro?",
                                            message:
                                              "O registro e as fotos dele serão apagados da sua conta.",
                                            confirmLabel: "Excluir",
                                            danger: true,
                                          }))
                                        )
                                          return;
                                        void removePhotos(
                                          ex?.photos ?? p?.photos ?? w?.photos,
                                        );
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
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </Panel>
                  ),
                )}
                <Panel>
                  <h2 className="text-base font-semibold">Alimentação</h2>
                  {!state.foods?.length ? (
                    <p className="py-8 text-sm text-ink-500">
                      Nenhum registro ainda.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line">
                      {[...new Set(state.foods.map((f) => f.date))]
                        .sort()
                        .reverse()
                        .map((date) => {
                          const items = state.foods!.filter(
                            (f) => f.date === date,
                          );
                          const total = items.reduce(
                            (t, f) => t + (foodCalories(f) ?? 0),
                            0,
                          );
                          return (
                            <li key={date} className="py-3">
                              <strong className="block font-semibold tabular-nums">
                                {total.toLocaleString("pt-BR", {
                                  maximumFractionDigits: 1,
                                })}{" "}
                                kcal
                              </strong>
                              <small className="mt-0.5 block text-[13px] text-ink-500">
                                {dateLabel(date)} {date.slice(0, 4)} ·{" "}
                                {items.length} alimento
                                {items.length === 1 ? "" : "s"}
                              </small>
                              <ul className="mt-2">
                                {items.map((f) => {
                                  const c = foodCalories(f);
                                  return (
                                    <li
                                      key={f.id}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <span className="min-w-0 text-[13px] text-ink-700">
                                        <span className="block truncate">
                                          {f.name}
                                        </span>
                                        <span className="text-ink-500 tabular-nums">
                                          {fmt(f.grams)} g ·{" "}
                                          {c === null
                                            ? "calorias pendentes"
                                            : `${c.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kcal`}
                                        </span>
                                      </span>
                                      <span className="-mr-2 flex shrink-0">
                                        <button
                                          className="icon-btn hover:text-brand-600"
                                          aria-label={`Editar ${f.name}`}
                                          onClick={() =>
                                            setFoodSheet({ food: f })
                                          }
                                        >
                                          <RiPencilLine className="size-[18px]" />
                                        </button>
                                        <button
                                          className="icon-btn hover:text-brand-600"
                                          aria-label={`Excluir ${f.name}`}
                                          onClick={async () => {
                                            if (
                                              await confirmDialog({
                                                title: "Excluir alimento?",
                                                message: `"${f.name}" sai do diário de ${dateLabel(date)}.`,
                                                confirmLabel: "Excluir",
                                                danger: true,
                                              })
                                            )
                                              setState((s) => ({
                                                ...s,
                                                foods: (s.foods ?? []).filter(
                                                  (x) => x.id !== f.id,
                                                ),
                                                completedDays: reopenDay(
                                                  s,
                                                  date,
                                                ),
                                              }));
                                          }}
                                        >
                                          <RiDeleteBin6Line className="size-[18px]" />
                                        </button>
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </Panel>
                <Panel>
                  <h2 className="text-base font-semibold">Água</h2>
                  {!state.water?.length ? (
                    <p className="py-8 text-sm text-ink-500">
                      Nenhum registro ainda.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line">
                      {[...new Set(state.water.map((w) => w.date))]
                        .sort()
                        .reverse()
                        .map((date) => {
                          const items = state.water!.filter(
                            (w) => w.date === date,
                          );
                          return (
                            <li key={date} className="py-3">
                              <strong className="block font-semibold tabular-nums">
                                {fmt(items.reduce((t, w) => t + w.ml, 0))} ml
                              </strong>
                              <small className="mt-0.5 block text-[13px] text-ink-500">
                                {dateLabel(date)} {date.slice(0, 4)} ·{" "}
                                {items.length} registro
                                {items.length === 1 ? "" : "s"} · toque em um
                                valor para editar
                              </small>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {items.map((w) => (
                                  <span
                                    key={w.id}
                                    className="inline-flex items-center gap-0.5 rounded-full bg-surface py-0.5 pr-0.5 pl-1 text-[13px] text-ink-700 tabular-nums"
                                  >
                                    <button
                                      className="inline-flex min-h-7 items-center gap-1 rounded-full px-1.5 hover:bg-white hover:text-brand-700"
                                      aria-label={`Editar ${w.ml} ml de ${dateLabel(date)}`}
                                      onClick={() => openRecord("water", w.id)}
                                    >
                                      {fmt(w.ml)} ml
                                      <RiPencilLine className="size-3.5 text-ink-400" />
                                    </button>
                                    <button
                                      className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-white hover:text-brand-600"
                                      aria-label={`Excluir ${w.ml} ml de ${dateLabel(date)}`}
                                      onClick={async () => {
                                        if (
                                          await confirmDialog({
                                            title: "Excluir registro de água?",
                                            message: `${fmt(w.ml)} ml de ${dateLabel(date)} saem do histórico.`,
                                            confirmLabel: "Excluir",
                                            danger: true,
                                          })
                                        )
                                          setState((s) => ({
                                            ...s,
                                            water: (s.water ?? []).filter(
                                              (x) => x.id !== w.id,
                                            ),
                                          }));
                                      }}
                                    >
                                      <RiCloseLine className="size-4" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  )}
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
                  <div className="mb-3">
                    <VoiceButton
                      label="Perguntar por áudio"
                      disabled={!supabase || !user || busy}
                      onAudio={async (audio) => {
                        const { text } = await readAudio("question", audio);
                        if (!text)
                          throw Error("Não entendemos o áudio. Tente de novo.");
                        setQuestion(text);
                        return "Confira o texto e toque em Enviar pergunta.";
                      }}
                    />
                  </div>
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
                    O áudio é usado só para transcrever a pergunta.
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
                    className="mt-6 rounded-lg border border-line bg-surface p-4 leading-relaxed text-ink-700"
                    aria-live="polite"
                  >
                    <RichText text={answer} />
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
                          onClick={async () => {
                            if (
                              await confirmDialog({
                                title: "Remover foto de perfil?",
                                confirmLabel: "Remover",
                                danger: true,
                              })
                            )
                              void changePhoto(null);
                          }}
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
                          "Mulher",
                          "Homem",
                          "Não binário",
                          "Outro",
                          "Prefiro não informar",
                          "Não informado",
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
                    <CardHeader title="Conta" />
                    {user && (
                      <p className="truncate text-sm font-medium">{user}</p>
                    )}
                    <p className="mt-1 mb-4 flex items-center gap-2 text-sm text-ink-500">
                      <SyncBadge status={sync.status} label />
                    </p>
                    <AccountAccess
                      user={user}
                      recovery={false}
                      onRecovered={() => {}}
                    />
                  </Panel>
                  <Panel>
                    <CardHeader
                      title="Aparência"
                      text="Escolha a cor do app."
                    />
                    <AccentPicker
                      value={state.accent ?? DEFAULT_ACCENT}
                      onChange={(hex) =>
                        setState((s) => ({
                          ...s,
                          accent: hex === DEFAULT_ACCENT ? undefined : hex,
                        }))
                      }
                    />
                  </Panel>
                  <Panel>
                    <CardHeader
                      title="Água"
                      text="Copo padrão e lembretes no celular."
                    />
                    <HydrationSettings
                      value={state.hydration}
                      onChange={(hydration) =>
                        setState((s) => ({ ...s, hydration }))
                      }
                      onNotice={setNotice}
                    />
                  </Panel>
                  <Panel>
                    <CardHeader title="Privacidade" />
                    <p className="text-sm leading-relaxed text-ink-500">
                      Leia os {legal.terms}, a {legal.privacy} (LGPD) e as{" "}
                      {legal.formulas} usadas nas estimativas. Para acessar,
                      corrigir ou excluir seus dados, ou revogar o
                      consentimento, use o contato indicado na política.
                    </p>
                    {legal.sheet}
                  </Panel>
                </div>
              </div>
              <div id="meta" className="mt-10 mb-4 scroll-mt-20">
                <h2 className="text-xl font-semibold tracking-tight">
                  Meta de peso
                </h2>
                <p className="mt-1 text-ink-500">
                  Defina um peso alvo e veja uma estimativa de prazo.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <CardHeader title="Objetivo" />
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const goal = Number(f.get("goal"));
                      if (!weight) {
                        setNotice("Registre seu peso antes de definir a meta.");
                        return;
                      }
                      setState({ ...state, goal, intake: 0 });
                      setNotice(
                        goal < weight
                          ? "Meta salva: as calorias do dia agora miram emagrecer."
                          : goal > weight
                            ? "Meta salva: as calorias do dia agora miram ganhar peso."
                            : "Meta salva: as calorias do dia miram manter o peso.",
                      );
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
                      <span className="hint block">
                        Abaixo do peso atual, a meta de calorias é para
                        emagrecer; acima, para ganhar peso.
                      </span>
                    </Field>
                    <button className="btn-primary" type="submit">
                      <RiCheckLine className="size-5" /> Salvar meta
                    </button>
                  </form>
                  <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-ink-500">Objetivo</dt>
                      <dd className="font-medium">
                        {
                          {
                            lose: "Emagrecer",
                            gain: "Ganhar peso",
                            maintain: "Manter o peso",
                          }[goalDirection(weight, state.goal)]
                        }
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-ink-500">Meta de calorias por dia</dt>
                      <dd className="font-semibold tabular-nums">
                        {target ? `${fmt(target.target)} kcal` : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className={note + " mt-3"}>
                    Calculada pelo app, sem valor manual: gasto do seu nível de
                    atividade (basal × fator do perfil), menos 500 kcal para
                    emagrecer ou mais 300 kcal para ganhar peso. Nunca fica
                    abaixo de {fmt(minimumIntake(bmr, state.profile))} kcal (o
                    seu basal ou 1.200 kcal no coeficiente feminino / 1.500 kcal
                    no masculino, o que for maior). Nos dias em que seus
                    exercícios passam desse gasto, a meta do dia sobe. O app não
                    prescreve dietas.
                  </p>
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
                      ? "Seguindo a meta de calorias todos os dias."
                      : state.goal && state.goal !== weight
                        ? "Com a meta no mínimo seguro, a diferença é pequena demais para estimar um prazo."
                        : "Defina um peso desejado diferente do atual para calcular."}
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
                    do metabolismo, então não é uma data garantida. Revise a
                    meta com um profissional.
                  </p>
                </Panel>
              </div>
            </>
          )}
          <footer className="mt-10 border-t border-line pt-5 pb-2 text-xs text-ink-400">
            Estimativas para acompanhamento, não diagnóstico.
          </footer>
        </div>
      </main>
      {foodSheet && (
        <FoodSheet
          key={foodSheet.food?.id ?? "new"}
          state={state}
          setState={setState}
          date={tab === "nutrition" ? diaryDate : today()}
          food={foodSheet.food}
          onClose={() => setFoodSheet(null)}
        />
      )}
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
            className="max-h-[calc(100dvh-24px-env(safe-area-inset-top))] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-sm sm:max-w-md sm:rounded-2xl sm:pb-5 md:max-w-3xl md:px-7 md:pt-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="modal-title" className="text-lg font-semibold">
                {editItem ? "Editar" : "Registrar"}{" "}
                {modal === "weight"
                  ? "peso"
                  : modal === "exercise"
                    ? "exercício"
                    : modal === "water"
                      ? "água"
                      : "pressão"}
              </h2>
              <button
                className="icon-btn -mr-2"
                aria-label="Fechar"
                onClick={() => setModal("")}
              >
                <RiCloseLine className="size-6" />
              </button>
            </div>
            <form
              key={editing ?? modal}
              className="grid gap-4 md:grid-cols-2 md:gap-x-5"
              onSubmit={submitRecord}
            >
              <Field label="Data">
                <input
                  className="input"
                  autoFocus
                  name="date"
                  type="date"
                  defaultValue={
                    editItem?.date ??
                    (tab === "nutrition" ? diaryDate : today())
                  }
                  max={today()}
                  required
                />
              </Field>
              {modal === "water" ? (
                <label className="block">
                  <span className="label">Quantidade (ml)</span>
                  <input
                    className="input"
                    name="ml"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="5000"
                    step="any"
                    required
                    defaultValue={
                      editItem && "ml" in editItem
                        ? editItem.ml
                        : (state.hydration?.cupMl ?? 250)
                    }
                  />
                </label>
              ) : modal === "weight" ? (
                <WeightFields
                  initial={
                    editItem && "value" in editItem ? editItem : undefined
                  }
                />
              ) : modal === "exercise" ? (
                <ExerciseFields
                  initial={
                    editItem && "type" in editItem ? editItem : undefined
                  }
                />
              ) : (
                <PressureFields
                  initial={
                    editItem && "systolic" in editItem ? editItem : undefined
                  }
                />
              )}
              <button
                className="btn-primary w-full md:col-span-2"
                disabled={busy}
              >
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
