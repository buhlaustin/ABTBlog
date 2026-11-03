import { STAGES } from './GameState.js';

/** Counted task slots per month (staff/finance actions excluded). */
export function getMonthlyTaskSlots(stage) {
  switch (stage) {
    case STAGES.GARAGE:
      return 4;
    case STAGES.OFFICE:
      return 6;
    case STAGES.XC:
      return 6;
    case STAGES.POST_XC:
      return 7;
    case STAGES.PUBLIC:
      return 8;
    default:
      return 4;
  }
}

/** Phase 1: month advance + task resolution. */
export function advanceMonth(state) {
  return state;
}
