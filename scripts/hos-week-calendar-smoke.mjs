/**
 * Headless week calendar strip checks.
 * Run: node scripts/hos-week-calendar-smoke.mjs
 */
import {
  buildWeekCalendarCells,
  isLiveCalendarPhase,
  renderWeekCalendarHtml,
  WEEKDAY_SHORT
} from '../work/hos/modules/weekCalendarStrip.js';
import { PHASES } from '../work/hos/modules/GameState.js';

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (!isLiveCalendarPhase(PHASES.COMPETITION)) fail('HOH should be live');
if (isLiveCalendarPhase(PHASES.SOCIAL)) fail('social should not be live');
if (WEEKDAY_SHORT.length !== 7) fail('short weekdays');

const state = {
  week: 2,
  weekdayIndex: 2,
  phase: PHASES.VETO_COMP,
  inFinale: false,
  doubleEvictionWeekActive: false,
  getPhaseDisplayLabel() {
    return 'Power of Veto — competition';
  }
};

const cells = buildWeekCalendarCells(state);
const today = cells.find((c) => c.status === 'today');
if (!today || today.short !== 'Sun' || !today.live) {
  fail(`today cell ${JSON.stringify(today)}`);
}
const fri = cells[0];
if (!fri.live || fri.status !== 'past') fail(`fri ${JSON.stringify(fri)}`);

const html = renderWeekCalendarHtml(state);
if (!html.includes('cal-today') || !html.includes('Sun')) fail('html today');
if (!html.includes('cal-live')) fail('html live class');

const finaleHtml = renderWeekCalendarHtml({
  week: 10,
  inFinale: true,
  getPhaseDisplayLabel: () => 'Finale — Jury Q&A'
});
if (!finaleHtml.includes('week-calendar--finale')) fail('finale strip');

console.log('OK: hos week calendar smoke');
