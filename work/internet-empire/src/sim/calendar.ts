import { START_MONTH, START_YEAR } from "./eras";
import type { Calendar } from "./types";

export function calendarFromIndex(index: number): Calendar {
  const total = START_MONTH - 1 + index;
  const year = START_YEAR + Math.floor(total / 12);
  const month = (total % 12) + 1;
  return { year, month, index };
}

export function advanceCalendar(cal: Calendar): Calendar {
  return calendarFromIndex(cal.index + 1);
}

export function formatMonth(cal: Calendar): string {
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[cal.month - 1]} ${cal.year}`;
}

export function employeeCount(h: {
  developers: number;
  designers: number;
  sales: number;
  executives: number;
}): number {
  return h.developers + h.designers + h.sales + h.executives;
}