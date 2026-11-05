/** Real-world calendar for in-game months (replaces abstract Year 1 / Month 1). */

const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

export function realClockNow() {
  const d = new Date();
  return { year: d.getFullYear(), monthIndex: d.getMonth() + 1 };
}

/** Saves before real-world calendar used abstract Year 1, Year 2, … (always < 2000). */
export function isRealCalendarYear(year) {
  return Number(year) >= 2000;
}

/** Sandbox start year: wide range; month math stays in safe integers. */
export const SANDBOX_CALENDAR_YEAR_MIN = 1;
export const SANDBOX_CALENDAR_YEAR_MAX = 999_999;

export function isValidSandboxCalendarYear(year) {
  const y = Number(year);
  return Number.isInteger(y) && y >= SANDBOX_CALENDAR_YEAR_MIN && y <= SANDBOX_CALENDAR_YEAR_MAX;
}

export function clampSandboxCalendarYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return realClockNow().year;
  return Math.min(
    SANDBOX_CALENDAR_YEAR_MAX,
    Math.max(SANDBOX_CALENDAR_YEAR_MIN, Math.round(y))
  );
}

export function addCalendarMonths(year, monthIndex, delta) {
  const base = year * 12 + (monthIndex - 1) + delta;
  const y = Math.floor(base / 12);
  const m = (base % 12) + 1;
  return { year: y, monthIndex: m };
}

/** 1-based turn index from run start month. */
export function calendarAnchor(state) {
  const startY = state.meta?.calendarStartYear;
  const startM = state.meta?.calendarStartMonth;
  if (startY != null && startM != null) {
    return { year: startY, monthIndex: startM };
  }
  const y = state.calendar?.year ?? 1;
  const m = state.calendar?.monthIndex ?? 1;
  if (isRealCalendarYear(y)) {
    const now = realClockNow();
    return { year: now.year, monthIndex: now.monthIndex };
  }
  return { year: 1, monthIndex: 1 };
}

export function calendarTurn(state) {
  const y = state.calendar?.year ?? 1;
  const m = state.calendar?.monthIndex ?? 1;
  const { year: startY, monthIndex: startM } = calendarAnchor(state);
  if (state.meta?.calendarStartYear == null && !isRealCalendarYear(y)) {
    return (y - 1) * 12 + m;
  }
  return (y - startY) * 12 + (m - startM) + 1;
}

/** Turn index when the in-game calendar shows the given month. */
export function calendarTurnAt(state, year, monthIndex) {
  const { year: startY, monthIndex: startM } = calendarAnchor(state);
  return (year - startY) * 12 + (monthIndex - startM) + 1;
}

export function turnToCalendar(state, turn) {
  const { year: startY, monthIndex: startM } = calendarAnchor(state);
  return addCalendarMonths(startY, startM, Math.max(0, turn - 1));
}

export function formatCalendarMonth(year, monthIndex, style = 'long') {
  const m = Math.max(1, Math.min(12, Number(monthIndex) || 1));
  const y = Number(year) || realClockNow().year;
  const name =
    style === 'short' || style === 'hud'
      ? MONTH_NAMES_SHORT[m - 1]
      : MONTH_NAMES_LONG[m - 1];
  return `${name} ${y}`;
}

export function formatStateMonth(state, style = 'long') {
  return formatCalendarMonth(state.calendar?.year, state.calendar?.monthIndex, style);
}

export function formatCalendarStamp(year, monthIndex, style = 'short') {
  return formatCalendarMonth(year, monthIndex, style);
}

function isValidCalendarStartPick(pick) {
  return (
    pick &&
    isValidSandboxCalendarYear(pick.year) &&
    pick.monthIndex >= 1 &&
    pick.monthIndex <= 12
  );
}

export function applyCalendarStart(state, options = {}) {
  const pick = options.calendarStart;
  const start = isValidCalendarStartPick(pick)
    ? { year: pick.year, monthIndex: pick.monthIndex }
    : realClockNow();
  if (!state.calendar) state.calendar = {};
  state.calendar.year = start.year;
  state.calendar.monthIndex = start.monthIndex;
  if (!state.meta) state.meta = {};
  state.meta.calendarStartYear = start.year;
  state.meta.calendarStartMonth = start.monthIndex;
}

/** Upgrade saves that still use Year 1 / Month N. */
export function migrateLegacyCalendar(state) {
  if (!state.calendar) return;
  if (state.meta?.calendarStartYear != null) {
    if (state.meta.calendarStartMonth == null) {
      state.meta.calendarStartMonth = state.calendar.monthIndex;
    }
    return;
  }
  if (isRealCalendarYear(state.calendar.year)) {
    if (state.meta?.calendarStartYear == null) {
      if (!state.meta) state.meta = {};
      state.meta.calendarStartYear = state.calendar.year;
      state.meta.calendarStartMonth = state.calendar.monthIndex;
    }
    return;
  }
  const legacyTurn = (state.calendar.year - 1) * 12 + state.calendar.monthIndex;
  const now = realClockNow();
  const anchor = addCalendarMonths(now.year, now.monthIndex, -(legacyTurn - 1));
  if (!state.meta) state.meta = {};
  state.meta.calendarStartYear = anchor.year;
  state.meta.calendarStartMonth = anchor.monthIndex;
  state.calendar.year = now.year;
  state.calendar.monthIndex = now.monthIndex;
}

export function advanceRealCalendarMonth(state) {
  const next = addCalendarMonths(state.calendar.year, state.calendar.monthIndex, 1);
  state.calendar.year = next.year;
  state.calendar.monthIndex = next.monthIndex;
  return state;
}

