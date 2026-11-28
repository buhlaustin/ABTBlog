import { calendarFromIndex } from "./calendar";
import { moodForYear } from "./eras";
import { defaultResearch, unlockResearchForYear } from "./research";
import { defaultRivals } from "./rivals";
import type { GameMode, GameState } from "./types";
import { SAVE_VERSION } from "./types";

export interface NewGameOptions {
  mode: GameMode;
  companyName: string;
  lane?: string;
  seed?: number;
  sandbox?: {
    startYear?: number;
    startingCash?: number;
    rivalAggression?: number;
  };
}

export function createInitialState(opts: NewGameOptions): GameState {
  const seed = opts.seed ?? ((Date.now() & 0xffffffff) ^ 0x1e9905);
  const lane = opts.lane ?? "content";
  const aggression = opts.sandbox?.rivalAggression ?? 0.35;
  let startIndex = 0;
  if (opts.mode === "sandbox" && opts.sandbox?.startYear) {
    startIndex = (opts.sandbox.startYear - 1995) * 12;
  }
  const cal = calendarFromIndex(startIndex);
  const cash =
    opts.mode === "sandbox" && opts.sandbox?.startingCash != null
      ? opts.sandbox.startingCash
      : 5000;

  return {
    version: SAVE_VERSION,
    mode: opts.mode,
    seed,
    companyName: opts.companyName.trim() || "Untitled Inc.",
    lane,
    calendar: cal,
    cash,
    valuation: cash,
    visitors: 0,
    brand: 10,
    investorConfidence: 30,
    techDebt: 5,
    infraTier: 0,
    computeBurn: 0,
    revenue: 0,
    expenses: 0,
    headcount: { developers: 0, designers: 0, sales: 0, executives: 0 },
    products: [],
    plannedActions: [],
    apTotal: 3,
    apLeft: 3,
    macro: {
      mood: moodForYear(cal.year),
      adCpm: 1,
      fundingMultiplier: 1,
    },
    rivals: defaultRivals(seed, lane, aggression),
    research: (() => {
      const nodes = defaultResearch();
      unlockResearchForYear(cal.year, nodes);
      return nodes;
    })(),
    acquisitions: [
      { id: "acq-1", name: "Mapstick", price: 25_000, visitors: 800, synergy: 12_000 },
      { id: "acq-2", name: "Blogstar", price: 80_000, visitors: 2200, synergy: 45_000 },
    ],
    ownedAcquisitions: [],
    news: [],
    log: ["You booted a Pentium and opened a spreadsheet. Welcome to 1995."],
    flags: {
      hasWebsite: false,
      hasDomain: false,
      hasFirstProduct: false,
      ipoCompleted: false,
      gameOver: false,
      won: false,
      legacyUrl: false,
      ended: false,
    },
    history: [],
    firedEvents: [],
    sandbox: opts.sandbox,
  };
}

export function normalizeSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as GameState;
  if (o.version !== SAVE_VERSION) return null;
  if (!o.calendar || typeof o.cash !== "number") return null;
  if (!o.firedEvents) o.firedEvents = [];
  if (!o.lane) o.lane = "content";
  if (typeof o.computeBurn !== "number") o.computeBurn = 0;
  const macro = o.macro ?? {};
  o.macro = {
    mood: macro.mood ?? "neutral",
    adCpm: typeof macro.adCpm === "number" ? macro.adCpm : 1,
    fundingMultiplier:
      typeof macro.fundingMultiplier === "number" ? macro.fundingMultiplier : 1,
  };
  if (!o.flags) {
    o.flags = {
      hasWebsite: false,
      hasDomain: false,
      hasFirstProduct: false,
      ipoCompleted: false,
      gameOver: false,
      won: false,
      legacyUrl: false,
      ended: false,
    };
  }
  if (!o.headcount) o.headcount = { developers: 0, designers: 0, sales: 0, executives: 0 };
  if (!Array.isArray(o.plannedActions)) o.plannedActions = [];
  if (!Array.isArray(o.research)) o.research = defaultResearch();
  if (!Array.isArray(o.acquisitions)) o.acquisitions = [];
  if (!Array.isArray(o.ownedAcquisitions)) o.ownedAcquisitions = [];
  unlockResearchForYear(o.calendar.year, o.research);
  return o;
}