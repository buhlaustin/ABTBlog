import { monthRng } from "./rng";
import type { GameState, NewsItem } from "./types";

interface CrisisDef {
  id: string;
  headline: string;
  body: string;
  minYear?: number;
  maxYear?: number;
  chance: number;
  apply: (s: GameState) => void;
}

const CRISES: CrisisDef[] = [
  {
    id: "modem-busy",
    headline: "Dial-up busy signal — half your users bounce",
    body: "The ISP suggests you buy more capacity. You suggest they fix 1995.",
    maxYear: 1999,
    chance: 0.08,
    apply: (s) => {
      s.visitors = Math.max(0, s.visitors - 80);
      s.brand -= 2;
    },
  },
  {
    id: "copycat",
    headline: "Rival ships a 1:1 clone",
    body: "Their press release uses the words innovative and revolutionary.",
    chance: 0.1,
    apply: (s) => {
      s.brand -= 5;
      s.investorConfidence -= 3;
    },
  },
  {
    id: "lawsuit",
    headline: "Angry lawyer letter arrives by fax",
    body: "Patent troll claims they invented the scrollbar.",
    chance: 0.06,
    apply: (s) => {
      s.cash -= 1500;
      s.log.push("Legal fees: $1,500.");
    },
  },
  {
    id: "bad-press",
    headline: "Forum thread titles you a dot-com clown",
    body: "HR asks if you want to respond. PR asks if forums are real.",
    minYear: 1999,
    chance: 0.09,
    apply: (s) => {
      s.brand -= 8;
      s.investorConfidence -= 5;
    },
  },
  {
    id: "api-outage",
    headline: "Third-party API goes down for 48 hours",
    body: "Status page says all green. Your users disagree.",
    minYear: 2008,
    chance: 0.1,
    apply: (s) => {
      s.visitors = Math.max(0, Math.round(s.visitors * 0.9));
      s.techDebt += 4;
    },
  },
  {
    id: "ai-hallucination",
    headline: "Your copilot invents a refund policy",
    body: "Support queue depth becomes a business metric.",
    minYear: 2023,
    chance: 0.12,
    apply: (s) => {
      s.brand -= 10;
      s.cash -= 2500;
      s.log.push("AI incident cleanup: $2,500.");
    },
  },
];

export function maybeCrisis(state: GameState): NewsItem | null {
  const rng = monthRng(state, 707);
  if (!rng.chance(0.22)) return null;
  const year = state.calendar.year;
  const pool = CRISES.filter(
    (c) =>
      (c.minYear == null || year >= c.minYear) && (c.maxYear == null || year <= c.maxYear)
  );
  if (!pool.length) return null;
  const c = pool[rng.int(0, pool.length - 1)]!;
  if (!rng.chance(c.chance)) return null;
  c.apply(state);
  state.log.push(c.headline);
  return {
    id: `crisis-${c.id}-${state.calendar.index}`,
    monthIndex: state.calendar.index,
    headline: c.headline,
    body: c.body,
    tone: "satire",
  };
}