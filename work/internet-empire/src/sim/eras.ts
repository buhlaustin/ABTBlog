import type { GameState, MacroMood, UiEraId } from "./types";

export interface EraDef {
  id: UiEraId;
  label: string;
  fromYear: number;
  toYear: number;
  uiSkin: string;
}

export const ERAS: EraDef[] = [
  { id: "early", label: "Early Internet", fromYear: 1995, toYear: 1999, uiSkin: "win95" },
  { id: "dotcom", label: "Dot-com", fromYear: 2000, toYear: 2004, uiSkin: "dotcom" },
  { id: "web2", label: "Web 2.0", fromYear: 2005, toYear: 2009, uiSkin: "web2" },
  { id: "mobile", label: "Mobile", fromYear: 2010, toYear: 2015, uiSkin: "mobile" },
  { id: "platform", label: "Platform economy", fromYear: 2016, toYear: 2022, uiSkin: "platform" },
  { id: "ai", label: "AI era", fromYear: 2023, toYear: 2030, uiSkin: "enterprise" },
];

export function eraAt(year: number): EraDef {
  return ERAS.find((e) => year >= e.fromYear && year <= e.toYear) ?? ERAS[0]!;
}

export function deriveUiEra(state: GameState): UiEraId {
  const e = eraAt(state.calendar.year);
  if (e.id === "ai" && state.calendar.year >= 2026) return "enterprise";
  return e.id === "ai" ? "ai" : e.id;
}

export function uiSkinFromState(state: GameState): string {
  const e = eraAt(state.calendar.year);
  let skin = e.uiSkin;
  if (e.id === "dotcom" && state.macro.mood === "bust") skin = "dotcom-bust";
  return skin;
}

export function moodForYear(year: number): MacroMood {
  if (year >= 1998 && year <= 2000) return "boom";
  if (year >= 2001 && year <= 2003) return "bust";
  if (year >= 2020 && year <= 2021) return "boom";
  if (year === 2008 || year === 2009) return "bust";
  return "neutral";
}

export const END_MONTH_INDEX = (2030 - 1995) * 12 + 11; // Dec 2030
export const START_YEAR = 1995;
export const START_MONTH = 1;