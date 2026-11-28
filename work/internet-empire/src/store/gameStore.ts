import { create } from "zustand";
import {
  createInitialState,
  normalizeSave,
  queueAction,
  resolveMonth,
  unqueueAction,
  type GameMode,
  type GameState,
  type TabId,
} from "@/sim";

const STORAGE_KEY = "internet-empire-save-v1";
const HOF_KEY = "internet-empire-hof-v1";
const HOF_MAX = 8;

export interface HallOfFameEntry {
  companyName: string;
  endedAt: string;
  won: boolean;
  visitors: number;
  valuation: number;
  lane: string;
}

function pushHallOfFame(state: GameState) {
  if (!state.flags.ended) return;
  try {
    const raw = localStorage.getItem(HOF_KEY);
    const list: HallOfFameEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift({
      companyName: state.companyName,
      endedAt: `${state.calendar.year}-${state.calendar.month}`,
      won: state.flags.won,
      visitors: state.visitors,
      valuation: state.valuation,
      lane: state.lane,
    });
    localStorage.setItem(HOF_KEY, JSON.stringify(list.slice(0, HOF_MAX)));
  } catch {
  }
}

export function readHallOfFame(): HallOfFameEntry[] {
  try {
    const raw = localStorage.getItem(HOF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface GameStore {
  screen: "menu" | "setup" | "game" | "end";
  state: GameState | null;
  tab: TabId;
  simplifiedUi: boolean;
  newGameSetup: {
    mode: GameMode;
    companyName: string;
    lane: string;
    startYear: number;
    startingCash: number;
    rivalAggression: number;
  };
  setTab: (tab: TabId) => void;
  setScreen: (s: GameStore["screen"]) => void;
  setSimplifiedUi: (v: boolean) => void;
  patchSetup: (p: Partial<GameStore["newGameSetup"]>) => void;
  startGame: () => void;
  loadSave: () => boolean;
  clearSave: () => void;
  queue: (actionKey: string, payload?: Record<string, string>) => string | null;
  unqueue: (id: string) => void;
  endMonth: () => void;
  persist: () => void;
  flash: string | null;
  clearFlash: () => void;
}

function saveToDisk(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  state: null,
  tab: "desk",
  simplifiedUi: false,
  flash: null,
  clearFlash: () => set({ flash: null }),
  newGameSetup: {
    mode: "career",
    companyName: "",
    lane: "content",
    startYear: 1995,
    startingCash: 5000,
    rivalAggression: 0.35,
  },
  setTab: (tab) => set({ tab }),
  setScreen: (screen) => set({ screen }),
  setSimplifiedUi: (v) => set({ simplifiedUi: v }),
  patchSetup: (p) => set({ newGameSetup: { ...get().newGameSetup, ...p } }),
  startGame: () => {
    const s = get().newGameSetup;
    const state = createInitialState({
      mode: s.mode,
      companyName: s.companyName || "NetStartup",
      lane: s.lane,
      sandbox:
        s.mode === "sandbox"
          ? {
              startYear: s.startYear,
              startingCash: s.startingCash,
              rivalAggression: s.rivalAggression,
            }
          : undefined,
    });
    saveToDisk(state);
    set({ state, screen: "game", tab: "desk" });
  },
  loadSave: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = normalizeSave(JSON.parse(raw));
      if (!parsed) return false;
      set({ state: parsed, screen: "game" });
      return true;
    } catch {
      return false;
    }
  },
  clearSave: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ state: null, screen: "menu" });
  },
  queue: (actionKey, payload) => {
    const state = get().state;
    if (!state) return "No active game.";
    const snap = structuredClone(state);
    const res = queueAction(snap, actionKey, payload);
    if (!res.ok) return res.reason ?? "Could not queue.";
    set({ state: snap });
    get().persist();
    return null;
  },
  unqueue: (id) => {
    const state = get().state;
    if (!state) return;
    const snap = structuredClone(state);
    unqueueAction(snap, id);
    set({ state: snap });
    get().persist();
  },
  endMonth: () => {
    const state = get().state;
    if (!state) return;
    const snap = structuredClone(state);
    resolveMonth(snap);
    saveToDisk(snap);
    const last = snap.log[snap.log.length - 1] ?? "Month closed.";
    if (snap.flags.gameOver || snap.flags.ended) {
      pushHallOfFame(snap);
      set({ state: snap, screen: "end", flash: last });
    } else {
      set({ state: snap, flash: last });
    }
  },
  persist: () => {
    const state = get().state;
    if (state) saveToDisk(state);
  },
}));