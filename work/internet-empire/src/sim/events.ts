import { monthRng } from "./rng";
import type { GameState, NewsItem } from "./types";

export interface ScriptedEvent {
  id: string;
  year: number;
  month?: number;
  headline: string;
  body: string;
  tone: "satire" | "historic";
  effects: (s: GameState) => void;
}

export const SCRIPTED_EVENTS: ScriptedEvent[] = [
  {
    id: "netscape-ipo",
    year: 1995,
    month: 8,
    headline: "Netscape pops on debut — the web is real money now",
    body: "Investors suddenly have vocabulary for eyeballs.",
    tone: "historic",
    effects: (s) => {
      s.macro.fundingMultiplier *= 1.1;
      s.investorConfidence += 5;
    },
  },
  {
    id: "y2k",
    year: 1999,
    month: 12,
    headline: "Y2K consultants bill by the panic-hour",
    body: "Your ops team buys stockpiled replacement mice, just in case.",
    tone: "satire",
    effects: (s) => {
      s.cash -= 400;
      s.techDebt += 3;
    },
  },
  {
    id: "dotcom-crash",
    year: 2000,
    month: 4,
    headline: "The bubble hisses — multiples snap back",
    body: "Funding calls go to voicemail. Pets become metaphors.",
    tone: "historic",
    effects: (s) => {
      s.macro.mood = "bust";
      s.macro.fundingMultiplier = 0.55;
      s.macro.adCpm = 0.65;
      s.valuation = Math.round(s.valuation * 0.72);
      s.investorConfidence -= 15;
    },
  },
  {
    id: "web2-rise",
    year: 2006,
    month: 3,
    headline: "User-generated content is a feature, not a bug",
    body: "Feeds everywhere. Everyone is an editor.",
    tone: "satire",
    effects: (s) => {
      s.brand += 5;
      s.macro.adCpm *= 1.05;
    },
  },
  {
    id: "iphone",
    year: 2007,
    month: 6,
    headline: "Phones swallow the homepage",
    body: "Your desktop metrics still look great. They are lying.",
    tone: "historic",
    effects: (s) => {
      if (!s.products.some((p) => p.name.includes("Mobile"))) {
        s.techDebt += 12;
        s.visitors = Math.round(s.visitors * 0.92);
      }
    },
  },
  {
    id: "financial-crisis",
    year: 2008,
    month: 9,
    headline: "Credit tightens — ad budgets evaporate",
    body: "Even enterprise buyers want three references and a miracle.",
    tone: "historic",
    effects: (s) => {
      s.macro.mood = "bust";
      s.macro.adCpm *= 0.7;
      s.investorConfidence -= 5;
    },
  },
  {
    id: "covid-spike",
    year: 2020,
    month: 3,
    headline: "The world goes remote; traffic spikes",
    body: "Your infra tier is getting a stress test.",
    tone: "historic",
    effects: (s) => {
      s.visitors = Math.round(s.visitors * 1.25);
      s.macro.mood = "boom";
    },
  },
  {
    id: "ai-breakthrough",
    year: 2023,
    month: 1,
    headline: "Foundation models reset every product roadmap",
    body: "The board asks for an AI strategy by Friday.",
    tone: "satire",
    effects: (s) => {
      s.investorConfidence += 10;
      for (const r of s.research) {
        if (r.id === "ai-models") r.unlocked = true;
      }
    },
  },
];

export function fireScriptedEvents(state: GameState): NewsItem[] {
  const news: NewsItem[] = [];
  for (const ev of SCRIPTED_EVENTS) {
    if (ev.year !== state.calendar.year) continue;
    if (ev.month && ev.month !== state.calendar.month) continue;
    if (state.firedEvents.includes(ev.id)) continue;
    ev.effects(state);
    state.firedEvents.push(ev.id);
    news.push({
      id: ev.id,
      monthIndex: state.calendar.index,
      headline: ev.headline,
      body: ev.body,
      tone: ev.tone,
    });
  }
  return news;
}

export function randomHeadline(state: GameState): NewsItem | null {
  const rng = monthRng(state, 44);
  if (!rng.chance(0.35)) return null;
  const rival = state.rivals[rng.int(0, state.rivals.length - 1)];
  if (!rival) return null;
  const satire = [
    `${rival.name} announces "revolutionary" fax-to-email bridge`,
    `Analyst: ${state.companyName} "well-positioned" to explain what they do`,
    `${rival.name} copies your feature; adds 40% more gradients`,
  ];
  const line = satire[rng.int(0, satire.length - 1)]!;
  return {
    id: `rnd-${state.calendar.index}`,
    monthIndex: state.calendar.index,
    headline: line,
    body: "Markets shrug. Your users notice.",
    tone: "satire",
  };
}