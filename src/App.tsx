import DailyDiary, { balanceLabels } from "./DailyDiary";
import CalorieBudget from "./CalorieBudget";
import ExerciseFields from "./ExerciseFields";
import {
  dailyBudget,
  dailyEnergy,
  reopenDay,
  waterOn,
  weightAtDate,
} from "./energy";
import Celebration, { type CelebrationKind } from "./Celebration";
import { BirthDateField, BirthdayCard } from "./Birthday";
import MascotCard from "./Mascot";
import Community from "./Community";
import { dailyMissions, dayGoals, medals, progressLevel } from "./gamification";
import { playSuccess } from "./sounds";
import { registerPush, unregisterPush } from "./push";
import { listenInvites, takeInvite } from "./invite";
import Notifications from "./Notifications";
import { lastSeen, loadNotifications } from "./notificationFeed";
import {
  listenNudges,
  markSeen,
  pendingNudges,
  senderName,
  type Nudge,
} from "./nudges";
import { syncGoals } from "./otterApi";
import { autoPost, saveProfile as saveSocialProfile } from "./social";
import FoodSheet from "./FoodSheet";
import CameraCapture from "./CameraCapture";
import type { User } from "@supabase/supabase-js";
import { userStorageKey } from "./access";
import AccountAccess from "./AccountAccess";
import {
  Avatar,
  downloadPhoto,
  originalOf,
  removePhotos,
  uploadPhoto,
} from "./photos";
import PhotoEditor from "./PhotoEditor";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type FormEvent,
} from "react";
import type { IconType } from "react-icons";
import {
  RiAddLine,
  RiArrowRightLine,
  RiCameraLine,
  RiPencilLine,
  RiComputerLine,
  RiMoonLine,
  RiSunLine,
  RiImageLine,
  RiChat3Fill,
  RiChat3Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiNotification3Fill,
  RiNotification3Line,
  RiGroupFill,
  RiGroupLine,
  RiCheckLine,
  RiCloseLine,
  RiFileList3Fill,
  RiFileList3Line,
  RiFireLine,
  RiFootprintLine,
  RiHeartPulseLine,
  RiHome5Fill,
  RiHome5Line,
  RiLineChartLine,
  RiFocus3Line,
  RiPlayCircleFill,
  RiPlayCircleLine,
  RiPulseLine,
  RiSideBarFill,
  RiSideBarLine,
  RiCalendarCheckFill,
  RiCalendarCheckLine,
  RiScales3Line,
  RiSettings3Fill,
  RiSettings3Line,
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
  ageOn,
  byDate,
  dateKey,
  isBirthday,
  profileAge,
  waterGoal,
  currentWeight,
  initial,
  num,
  daysAgo,
  durationLabel,
  lastDays,
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
import { useCloudSync } from "./sync";
import { AccountMenu, SyncBadge } from "./AccountMenu";
import {
  CardHeader,
  dateLabel,
  Empty,
  Field,
  PageTitle,
  Panel,
  QuickAction,
  Stat,
} from "./ui";
import Onboarding from "./Onboarding";
import PressureFields from "./PressureFields";
import Records from "./Records";
import Sheet from "./Sheet";
import WeightFields from "./WeightFields";
import AccentPicker from "./AccentPicker";
import {
  applyAccent,
  applyColorMode,
  colorMode,
  isDark,
  DEFAULT_ACCENT,
  nearestPreset,
} from "./theme";
import { applyAppIcon, appIconPending, setAppIcon } from "./appIcon";
import RichText from "./RichText";
import { HydrationSettings, LitersInput, WaterCard } from "./Water";
import { CalorieChart, PressureChart, WaterChart } from "./Charts";
import { notifyNow, syncWaterReminders } from "./reminders";
import VoiceButton from "./VoiceButton";
import { readAudio } from "./voice";
import Videos from "./Videos";
import { useLegal } from "./Legal";
import { quickAnswer } from "./quickAnswers";
import NumberField from "./NumberField";
import Choice from "./Choice";
function readLocal(localKey: string): State {
  try {
    const s = JSON.parse(localStorage.getItem(localKey) || "null");
    return validState(s) ? s : structuredClone(initial);
  } catch {
    return structuredClone(initial);
  }
}
const fmt = num;
const tabs: {
  id: string;
  label: string;
  short: string;
  icon: IconType;
  active: IconType;
  /** No celular, aparece direto no menu de baixo; as outras ficam em "Mais". */
  main?: boolean;
}[] = [
  {
    id: "overview",
    main: true,
    label: "Início",
    short: "Início",
    icon: RiHome5Line,
    active: RiHome5Fill,
  },
  {
    id: "nutrition",
    main: true,
    label: "Diário",
    short: "Diário",
    icon: RiCalendarCheckLine,
    active: RiCalendarCheckFill,
  },
  {
    id: "records",
    main: true,
    label: "Registros",
    short: "Registros",
    icon: RiFileList3Line,
    active: RiFileList3Fill,
  },
  {
    id: "community",
    main: true,
    label: "Amigos",
    short: "Amigos",
    icon: RiGroupLine,
    active: RiGroupFill,
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
    short: "IA",
    icon: RiChat3Line,
    active: RiChat3Fill,
  },
  {
    id: "notifications",
    label: "Notificações",
    short: "Avisos",
    icon: RiNotification3Line,
    active: RiNotification3Fill,
  },
  {
    id: "settings",
    label: "Configurações",
    short: "Ajustes",
    icon: RiSettings3Line,
    active: RiSettings3Fill,
  },
];
const note = "text-[13px] leading-relaxed text-ink-500";
const axisTick = { fontSize: 12, fill: "var(--color-ink-400)" };
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Seção aberta em Configurações (a foto no topo abre direto o Perfil).
  const [section, setSection] = useState<
    "profile" | "appearance" | "water" | "account" | "help"
  >("profile");
  const openProfile = () => {
    setSection("profile");
    setTab("settings");
  };
  // Ícone do Android na cor nova, esperando a pessoa aplicar.
  const [iconPending, setIconPending] = useState(false);
  // Foto escolhida/tirada (ou a atual) aberta no editor antes de salvar.
  const [editingPhoto, setEditingPhoto] = useState<Blob | null>(null);
  const [mode, setMode] = useState(colorMode);
  // Modo "Sistema" também muda sozinho: acompanha para o ícone do topo.
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const sync = () => setDark(isDark());
    sync();
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [mode]);
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
  // Metas batidas: avisa só na hora em que a meta é alcançada.
  const [celebration, setCelebration] = useState<CelebrationKind | null>(null);
  const goals = (() => {
    const day = today();
    const water = waterGoal(weightAtDate(state, day));
    const budget = dailyBudget(state, day);
    const start = byDate(state.weights)[0]?.value ?? 0;
    const now = currentWeight(state);
    return {
      day,
      water: !!water && waterOn(state, day) >= water,
      calories: budget.ready && budget.consumed >= budget.available,
      weight:
        state.goal > 0 &&
        !!start &&
        start !== state.goal &&
        (state.goal < start ? now <= state.goal : now >= state.goal),
      missions: dailyMissions(state, day).filter((m) => m.done),
      medals: medals(state).filter((m) => m.earned),
    };
  })();
  const reached = useRef<typeof goals | null>(null);
  useEffect(() => {
    const before = reached.current;
    if (sync.status === "loading") return;
    reached.current = goals;
    // Primeira leitura ou virada do dia: só registra o estado atual.
    if (!before || before.day !== goals.day) return;
    const isNew = <T extends { id: string }>(now: T[], old: T[]) =>
      now.filter((x) => !old.some((o) => o.id === x.id));
    // Do mais importante para o menos: o aviso mostra o primeiro.
    const news = [
      goals.weight && !before.weight
        ? "Você chegou ao seu peso desejado! Parabéns!"
        : null,
      ...isNew(goals.medals, before.medals).map(
        (m) => `Nova medalha: ${m.title}!`,
      ),
      goals.water && !before.water ? "Meta de água de hoje batida!" : null,
      ...isNew(goals.missions, before.missions)
        .filter((m) => m.id !== "water")
        .map((m) => `Desafio concluído: ${m.label}.`),
      goals.calories && !before.calories
        ? "Você chegou à meta de calorias de hoje."
        : null,
    ].filter((x): x is string => !!x);
    if (!news.length) return;
    if (goals.weight && !before.weight) setCelebration("rocket");
    else if (goals.water && !before.water) setCelebration("confetti");
    setNotice(news[0]);
    void playSuccess();
    void notifyNow("Ritmo", news.join(" ")).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    goals.day,
    goals.water,
    goals.calories,
    goals.weight,
    goals.missions.length,
    goals.medals.length,
    sync.status,
  ]);
  // Comunidade: texto vindo de "Compartilhar" numa medalha.
  const [draft, setDraft] = useState("");
  const clearDraft = useCallback(() => setDraft(""), []);
  function shareToFriends(text: string) {
    setDraft(text);
    setTab("community");
  }
  // Perfil social (nome, foto, nível, medalhas) acompanha o do app.
  const level = progressLevel(state).level;
  const earned = medals(state).filter((m) => m.earned);
  const earnedKey = earned.map((m) => m.id).join();
  useEffect(() => {
    if (sync.status === "loading" || !state.profileReviewed) return;
    saveSocialProfile(account.id, {
      name: state.profile.name,
      photo: state.profile.photo,
      level,
      medals: earned.length,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    account.id,
    state.profile.name,
    state.profile.photo,
    level,
    earnedKey,
    sync.status,
  ]);
  // Atividades novas viram posts para os amigos (exercícios dos últimos 2
  // dias e medalhas). Na primeira vez neste aparelho, o histórico não é
  // publicado.
  useEffect(() => {
    if (sync.status === "loading") return;
    const key = `ritmo-shared-${account.id}`;
    const items = [
      ...state.exercises
        .filter((e) => e.date >= daysAgo(1))
        .map((e) => ({
          id: `exercise:${e.id}`,
          kind: "activity" as const,
          text: `🏃 ${e.type}: ${durationLabel(e.minutes)}${e.distanceKm ? ` · ${num(e.distanceKm)} km` : ""}`,
        })),
      ...earned.map((m) => ({
        id: `medal:${account.id}:${m.id}`,
        kind: "medal" as const,
        text: `${m.icon} Conquistei a medalha "${m.title}": ${m.text}`,
      })),
    ];
    let seen: string[] | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(
        key,
        JSON.stringify([
          ...new Set([...(seen ?? []), ...items.map((i) => i.id)]),
        ]),
      );
    } catch {
      return;
    }
    if (!seen || state.shareActivity === false) return;
    for (const item of items.filter((i) => !seen!.includes(i.id)))
      void autoPost(item.id, item.text, item.kind).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.exercises, earnedKey, sync.status]);
  // Lontra da dupla: envia só se cumpriu as metas dos últimos 7 dias.
  const goalsKey = JSON.stringify(lastDays(7).map((d) => dayGoals(state, d)));
  useEffect(() => {
    if (sync.status === "loading") return;
    const id = setTimeout(
      () => void syncGoals(JSON.parse(goalsKey)).catch(() => undefined),
      2000,
    );
    return () => clearTimeout(id);
  }, [goalsKey, sync.status]);
  // Puxões de orelha dos amigos: na hora (app aberto) e os que chegaram
  // com o app fechado, ao abrir.
  useEffect(() => {
    const show = async (n: Nudge) => {
      const who = await senderName(n.sender);
      setNotice(`${who} puxou sua orelha: ${n.message}`);
      void playSuccess();
      void notifyNow(`${who} puxou sua orelha`, n.message).catch(
        () => undefined,
      );
      void markSeen([n.id]);
      void refreshUnread();
    };
    void pendingNudges(account.id).then((list) => list.forEach(show));
    return listenNudges(account.id, (n) => void show(n));
  }, [account.id]);
  // Número no sino: novidades desde a última vez que a aba foi aberta.
  const [unread, setUnread] = useState(0);
  const clearUnread = useCallback(() => setUnread(0), []);
  const refreshUnread = useCallback(async () => {
    const seen = lastSeen(account.id);
    const list = await loadNotifications(account.id).catch(() => []);
    setUnread(list.filter((n) => n.at && n.at > seen).length);
  }, [account.id]);
  useEffect(() => {
    void refreshUnread();
    const id = setInterval(() => void refreshUnread(), 60000);
    const visible = () =>
      document.visibilityState === "visible" && void refreshUnread();
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refreshUnread]);
  // Convite por link (…/amigo/CODIGO): abre Amigos com o código preenchido.
  const [invite, setInvite] = useState<string | null>(null);
  useEffect(() => {
    const open = (code: string) => {
      takeInvite();
      setInvite(code);
      setTab("community");
    };
    const saved = takeInvite();
    if (saved) open(saved);
    let stop = () => {};
    void listenInvites(open).then((s) => (stop = s));
    return () => stop();
  }, []);
  // Push no Android: puxões de orelha chegam mesmo com o app fechado.
  useEffect(() => {
    void registerPush().catch(() => undefined);
  }, [account.id]);
  // Aniversário: bolo, confete e música uma vez por ano neste aparelho.
  const [birthday, setBirthday] = useState(false);
  useEffect(() => {
    if (sync.status === "loading" || !isBirthday(state.profile)) return;
    const key = `ritmo-birthday-${account.id}-${today().slice(0, 4)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* sem armazenamento: mostra mesmo assim */
    }
    setBirthday(true);
    setCelebration("confetti");
  }, [state.profile, sync.status, account.id]);
  useEffect(() => {
    applyAccent(state.accent);
    try {
      localStorage.setItem("ritmo-accent", state.accent ?? DEFAULT_ACCENT);
    } catch {
      /* só evita o "piscar" da cor padrão ao abrir */
    }
    void setAppIcon(nearestPreset(state.accent ?? DEFAULT_ACCENT))
      .then(appIconPending)
      .then(setIconPending);
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
  const expenditure = bmr ? bmr * state.profile.activity : 0;
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
    const key = dateKey(d);
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
        birthDate: String(f.get("birthDate")),
        age: ageOn(String(f.get("birthDate")), today()),
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
  /** Salva a foto editada e a original (para editar de novo sem perder nada). */
  async function changePhoto(file: File | null, original?: Blob) {
    setBusy(true);
    try {
      const previous = state.profile.photo;
      const photo = file
        ? await uploadPhoto(account.id, "profile", file)
        : undefined;
      if (photo && original)
        await uploadPhoto(account.id, "profile", original, originalOf(photo));
      setState((s) => ({ ...s, profile: { ...s.profile, photo } }));
      void removePhotos(
        previous ? [previous, originalOf(previous)] : undefined,
      );
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
    // Perguntas óbvias têm resposta na hora, calculada no aparelho.
    const quick = quickAnswer(question, state, diaryDate);
    if (quick) {
      aiRequest.current += 1;
      setAnswer(quick);
      return;
    }
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
            // Sem nome, foto nem data de nascimento: só a idade.
            profile: {
              ...state.profile,
              name: "",
              gender: "Não informado",
              photo: undefined,
              birthDate: undefined,
              age: profileAge(state.profile),
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
    // Antes de sair: este celular para de receber push desta conta.
    await unregisterPush().catch(() => undefined);
    const result = await supabase?.auth.signOut({ scope: "local" });
    if (result?.error) setNotice("Não foi possível sair. Tente novamente.");
  }
  function goToGoal() {
    openProfile();
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
            aria-label="Ritmo, início"
          >
            <RiPulseLine className="size-6 text-brand-600" />
            {!collapsed && "Ritmo"}
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
          className={`mt-auto border-t border-line pt-4 ${collapsed ? "flex justify-center" : ""}`}
          photo={state.profile.photo}
          name={state.profile.name}
          email={user}
          onProfile={openProfile}
        />
      </aside>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {tabs
          .filter((t) => t.main)
          .map(({ id, label, short, icon: Icon, active: ActiveIcon }) => (
            <NavButton
              key={id}
              label={label}
              short={short}
              current={tab === id}
              icon={tab === id ? ActiveIcon : Icon}
              onClick={() => setTab(id)}
            />
          ))}
        <NavButton
          label="Mais opções"
          short="Mais"
          current={!tabs.find((t) => t.id === tab)?.main}
          icon={RiMenuLine}
          badge={unread}
          onClick={() => setMoreOpen(true)}
        />
      </nav>
      {moreOpen && (
        <Sheet title="Mais" onClose={() => setMoreOpen(false)}>
          <ul className="grid gap-1">
            {tabs
              .filter((t) => !t.main)
              .map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] font-medium ${tab === id ? "bg-brand-50 text-brand-700" : "hover:bg-surface"}`}
                    onClick={() => {
                      setTab(id);
                      setMoreOpen(false);
                    }}
                  >
                    <Icon className="size-5 text-ink-500" />
                    <span className="flex-1">{label}</span>
                    {id === "notifications" && unread > 0 && (
                      <span className="rounded-full bg-brand-600 px-2 text-xs leading-5 font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </Sheet>
      )}
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
              <button
                className="icon-btn relative -mx-1"
                onClick={() => setTab("notifications")}
                aria-label={
                  unread ? `Notificações, ${unread} nova(s)` : "Notificações"
                }
                title="Notificações"
              >
                <RiNotification3Line className="size-5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] leading-4 font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              <SyncBadge status={sync.status} />
              <button
                className="icon-btn -mx-1"
                onClick={() => {
                  const next = isDark() ? "light" : "dark";
                  setMode(next);
                  applyColorMode(next);
                }}
                aria-label={dark ? "Usar modo claro" : "Usar modo escuro"}
                title={dark ? "Modo claro" : "Modo escuro"}
              >
                {dark ? (
                  <RiSunLine className="size-5" />
                ) : (
                  <RiMoonLine className="size-5" />
                )}
              </button>
              <AccountMenu
                compact
                className="md:hidden"
                photo={state.profile.photo}
                name={state.profile.name}
                email={user}
                onProfile={openProfile}
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
              <div className="mb-4">
                <MascotCard
                  state={state}
                  date={today()}
                  onShare={(text) => shareToFriends(text)}
                />
              </div>
              <div className="mb-4 grid gap-4 lg:grid-cols-2">
                <CalorieBudget
                  compact
                  state={state}
                  date={today()}
                  onProfile={openProfile}
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
                      ? `${difference > 0 ? "+" : ""}${fmt(difference)} kg desde o início`
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
                      ? `Faltam ${fmt(Math.abs(weight - state.goal))} kg`
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
                          <CartesianGrid
                            vertical={false}
                            stroke="var(--color-line)"
                          />
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
                              stroke: "var(--color-white)",
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
                      {fmt(progress)}
                    </strong>
                    <span className="text-lg text-ink-500">%</span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-label="Progresso da meta"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
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
                        <CartesianGrid
                          vertical={false}
                          stroke="var(--color-line)"
                        />
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
          {tab === "notifications" && (
            <Notifications
              userId={account.id}
              onOpen={setTab}
              onSeen={clearUnread}
            />
          )}
          {tab === "community" && (
            <Community
              invite={invite}
              userId={account.id}
              draft={draft}
              onDraftUsed={clearDraft}
              onNotice={setNotice}
              myGoals={lastDays(7).map((d) => dayGoals(state, d))}
              ensureProfile={() =>
                saveSocialProfile(account.id, {
                  name: state.profile.name,
                  photo: state.profile.photo,
                  level,
                  medals: earned.length,
                })
              }
              shareActivity={state.shareActivity !== false}
              onShareActivity={(on) =>
                setState((s) => ({ ...s, shareActivity: on }))
              }
            />
          )}
          {tab === "nutrition" && (
            <DailyDiary
              state={state}
              setState={setState}
              date={diaryDate}
              setDate={setDiaryDate}
              onExercise={(id) => openRecord("exercise", id)}
              onPressure={(id) => openRecord("pressure", id)}
              onProfile={openProfile}
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
            <Records
              state={state}
              setState={setState}
              onEdit={openRecord}
              onFood={(food) => setFoodSheet({ food })}
              onError={setNotice}
            />
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
                    O áudio é usado só para transcrever a pergunta. O assistente
                    não faz diagnóstico nem prescreve tratamento.
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
                title="Configurações"
                text="Seu perfil, aparência, água, conta e ajuda."
              />
              <Choice
                variant="chips"
                className="mb-5"
                label="Seção"
                value={section}
                onChange={setSection}
                options={[
                  { id: "profile", label: "Perfil" },
                  { id: "appearance", label: "Aparência" },
                  { id: "water", label: "Água" },
                  { id: "account", label: "Conta e privacidade" },
                  { id: "help", label: "Ajuda" },
                ]}
              />
              {section === "profile" && (
                <>
                  <div className="max-w-2xl">
                <Panel>
                  <CardHeader title="Sobre você" />
                  <div className="mb-5 flex items-center gap-4">
                    <Avatar
                      path={state.profile.photo}
                      name={state.profile.name}
                      size={72}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={busy}
                        onClick={() => setCameraOpen(true)}
                      >
                        <RiCameraLine className="size-5" /> Tirar foto
                      </button>
                      <label className="btn-secondary relative">
                        <RiImageLine className="size-5" /> Galeria
                        <input
                          className="absolute inset-0 cursor-pointer opacity-0"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) setEditingPhoto(file);
                          }}
                        />
                      </label>
                      {state.profile.photo && (
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={async () => {
                            try {
                              const path = state.profile.photo!;
                              // Abre a original; fotos antigas só têm a editada.
                              setEditingPhoto(
                                await downloadPhoto(originalOf(path)).catch(
                                  () => downloadPhoto(path),
                                ),
                              );
                            } catch (e) {
                              setNotice(
                                e instanceof Error
                                  ? e.message
                                  : "Não foi possível abrir a foto.",
                              );
                            }
                          }}
                        >
                          <RiPencilLine className="size-5" /> Editar
                        </button>
                      )}
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
                      <Field label="Altura">
                        <NumberField
                          name="height"
                          unit="m"
                          decimals={2}
                          factor={100}
                          min={100}
                          max={250}
                          required
                          defaultValue={state.profile.height}
                          placeholder="0,00"
                        />
                      </Field>
                      <BirthDateField initial={state.profile.birthDate} />
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
                    <Field label="Peso desejado">
                      <NumberField
                        name="goal"
                        unit="kg"
                        decimals={1}
                        min={20}
                        max={400}
                        required
                        defaultValue={state.goal || null}
                        placeholder="0,0"
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
                            lose: "Perder peso",
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
                      {days ? `~${fmt(days)}` : "—"}
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
              {section === "appearance" && (
                <div className="max-w-2xl">
                  <Panel>
                    <CardHeader title="Aparência" text="Tema e cor do app." />
                    <Choice
                      className="mb-5"
                      label="Tema"
                      value={mode}
                      onChange={(id) => {
                        setMode(id);
                        applyColorMode(id);
                      }}
                      options={[
                        {
                          id: "system",
                          label: (
                            <>
                              <RiComputerLine className="size-4" /> Sistema
                            </>
                          ),
                        },
                        {
                          id: "light",
                          label: (
                            <>
                              <RiSunLine className="size-4" /> Claro
                            </>
                          ),
                        },
                        {
                          id: "dark",
                          label: (
                            <>
                              <RiMoonLine className="size-4" /> Escuro
                            </>
                          ),
                        },
                      ]}
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
                    {iconPending && (
                      <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
                        <p>
                          O ícone do app na tela inicial também pode mudar para
                          essa cor. O app fecha ao trocar; é só abrir de novo
                          pelo ícone novo.
                        </p>
                        <button
                          className="btn-secondary mt-3"
                          onClick={async () => {
                            if (
                              await confirmDialog({
                                title: "Trocar o ícone agora?",
                                message:
                                  "O app vai fechar. Seus dados já estão salvos.",
                                confirmLabel: "Trocar e fechar",
                              })
                            )
                              void applyAppIcon();
                          }}
                        >
                          Aplicar ícone
                        </button>
                      </div>
                    )}
                  </Panel>
                </div>
              )}
              {section === "water" && (
                <div className="max-w-2xl">
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
                </div>
              )}
              {section === "account" && (
                <div className="grid max-w-2xl gap-4">
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
                    <button
                      className="btn-ghost mt-3 -ml-2 text-brand-700"
                      onClick={signOut}
                    >
                      <RiLogoutBoxRLine className="size-5" /> Sair da conta
                    </button>
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
              )}
              {section === "help" && (
                <Help onTutorial={() => setTutorial(0)} />
              )}
            </>
          )}
          <footer className="mt-10 border-t border-line pt-5 pb-2 text-xs text-ink-400">
            Estimativas para acompanhamento, não diagnóstico.
          </footer>
        </div>
      </main>
      {editingPhoto && (
        <PhotoEditor
          round
          source={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={(file) => {
            setEditingPhoto(null);
            void changePhoto(file, editingPhoto);
          }}
        />
      )}
      {cameraOpen && (
        <CameraCapture
          title="Foto de perfil"
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            setEditingPhoto(file);
          }}
        />
      )}
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
      {birthday && (
        <BirthdayCard
          name={firstName}
          age={profileAge(state.profile)}
          onClose={() => setBirthday(false)}
        />
      )}
      {celebration && (
        <Celebration kind={celebration} onDone={() => setCelebration(null)} />
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
                <div>
                  <span className="label">Quantidade (litros)</span>
                  <WaterAmount
                    initial={
                      editItem && "ml" in editItem
                        ? editItem.ml
                        : (state.hydration?.cupMl ?? 250)
                    }
                  />
                </div>
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
/** Quantidade de água do formulário de registro (envia ml em name="ml"). */
function WaterAmount({ initial }: { initial: number }) {
  const [ml, setMl] = useState<number | null>(initial);
  return (
    <LitersInput name="ml" label="Quantidade" value={ml} onChange={setMl} />
  );
}

/** Botão do menu de baixo do celular (com número de novidades opcional). */
function NavButton({
  label,
  short,
  icon: Icon,
  current,
  badge,
  onClick,
}: {
  label: string;
  short: string;
  icon: IconType;
  current: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      className={`relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${current ? "text-brand-600" : "text-ink-500"}`}
      onClick={onClick}
      aria-label={badge ? `${label}, ${badge} novidade(s)` : label}
      aria-current={current ? "page" : undefined}
    >
      <Icon className="size-[22px]" />
      {!!badge && (
        <span className="absolute top-2.5 left-1/2 ml-1.5 size-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
      )}
      <span className="max-w-full truncate px-0.5">{short}</span>
    </button>
  );
}
