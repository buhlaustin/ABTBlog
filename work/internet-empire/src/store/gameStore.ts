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
  if (snap.flags.gameOver || snap.flags.ended) {
      set({ state: snap, screen: "end" });
    } else {
      set({ state: snap });
    }
  },
  persist: () => {
    const state = get().state;
    if (state) saveToDisk(state);
  },
}));