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

export function isRealCalendarYear(year) {
  return Number(year) >= 2000;
}

export function addCalendarMonths(year, monthIndex, delta) {
  const base = year * 12 + (monthIndex - 1) + delta;
  const y = Math.floor(base / 12);
  const m = (base % 12) + 1;
  return { year: y, monthIndex: m };
}

/** 1-based turn index from run start month. */
export function calendarTurn(state) {
  const y = state.calendar?.year ?? 1;
  const m = state.calendar?.monthIndex ?? 1;
  const startY = state.meta?.calendarStartYear;
  const startM = state.meta?.calendarStartMonth;
  if (startY == null || startM == null) {
    if (isRealCalendarYear(y)) {
      const now = realClockNow();
      return (y - now.year) * 12 + (m - now.monthIndex) + 1;
    }
    return (y - 1) * 12 + m;
  }
  return (y - startY) * 12 + (m - startM) + 1;
}

export function turnToCalendar(state, turn) {
  const startY = state.meta?.calendarStartYear ?? state.calendar?.year ?? realClockNow().year;
  const startM = state.meta?.calendarStartMonth ?? state.calendar?.monthIndex ?? realClockNow().monthIndex;
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

export function applyCalendarStart(state, options = {}) {
  const pick = options.calendarStart;
  const start =
    pick && isRealCalendarYear(pick.year) && pick.monthIndex >= 1 && pick.monthIndex <= 12
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

export function sandboxCalendarYearOptions() {
  const y = realClockNow().year;
  const out = [];
  for (let yr = y - 5; yr <= y + 3; yr += 1) out.push(yr);
  return out;
}
