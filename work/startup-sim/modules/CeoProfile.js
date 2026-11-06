import { formatCalendarMonth } from './GameCalendar.js';

const CEO_BIRTH_YEAR_MIN = 1945;
const CEO_BIRTH_YEAR_MAX = 2010;

export function clampCeoBirthMonth(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 6;
  return Math.max(1, Math.min(12, n));
}

export function clampCeoBirthYear(raw, fallback = 1990) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(CEO_BIRTH_YEAR_MIN, Math.min(CEO_BIRTH_YEAR_MAX, n));
}

/** Age in full years as of an in-game calendar month (birthday not yet reached → one year younger). */
export function ceoAgeOnCalendar(birthYear, birthMonthIndex, asOfYear, asOfMonthIndex) {
  const by = Number(birthYear);
  const bm = clampCeoBirthMonth(birthMonthIndex);
  const ay = Number(asOfYear);
  const am = clampCeoBirthMonth(asOfMonthIndex);
  if (!Number.isFinite(by) || !Number.isFinite(ay)) return null;
  let age = ay - by;
  if (am < bm) age -= 1;
  return Math.max(0, age);
}

export function ceoAgeInGame(state) {
  const month = state.company?.ceoBirthMonth;
  const year = state.company?.ceoBirthYear;
  if (month == null || year == null) return null;
  return ceoAgeOnCalendar(year, month, state.calendar?.year, state.calendar?.monthIndex);
}

export function ceoBirthdayLabel(state, style = 'long') {
  const month = state.company?.ceoBirthMonth;
  const year = state.company?.ceoBirthYear;
  if (month == null || year == null) return '';
  return formatCalendarMonth(year, month, style);
}

export function ceoAgeDisplayLine(state) {
  const age = ceoAgeInGame(state);
  if (age == null) return '';
  const born = ceoBirthdayLabel(state, 'long');
  return born ? `Age ${age} · born ${born}` : `Age ${age}`;
}
