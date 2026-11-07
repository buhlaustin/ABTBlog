/**
 * Headless week calendar strip checks.
 * Run: node scripts/hos-week-calendar-smoke.mjs
 */
import {
  buildWeekCalendarCells,
  buildWeekCalendarIntelSection,
  getWeekCalendarFooter,
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
  weekdayIndex: 4,
  phase: PHASES.SOCIAL,
  actionsRemaining: 2,
  houseEventComplete: false,
  inFinale: false,
  gameOver: false,
  doubleEvictionWeekActive: false,
  isScheduledHouseEventDay() {
    return false;
  },
  getPlayer() {
    return { evicted: false };
  },
  getPhaseDisplayLabel() {
    return 'Social time in the house';
  }
};

const cells = buildWeekCalendarCells(state);
const today = cells.find((c) => c.status === 'today');
if (!today || today.short !== 'Tue' || today.live) {
  fail(`today cell ${JSON.stringify(today)}`);
}
if (!today.subtitle?.includes('2 action')) fail(`subtitle ${today.subtitle}`);

const liveState = {
  ...state,
  weekdayIndex: 0,
  phase: PHASES.COMPETITION,
  week: 1,
  houseEventComplete: false,
  isScheduledHouseEventDay() {
    return true;
  }
};
const fri = buildWeekCalendarCells(liveState)[0];
if (fri.eventState !== 'now' || !fri.premiere) fail(`fri live ${JSON.stringify(fri)}`);

const footer = getWeekCalendarFooter(liveState);
if (!footer.includes('Live now')) fail(`footer ${footer}`);

const intel = buildWeekCalendarIntelSection(liveState);
if (!intel?.items?.some((i) => i.key === 'cal-next')) fail('intel next');

const html = renderWeekCalendarHtml(liveState);
if (!html.includes('cal-now') || !html.includes('week-calendar-footer')) {
  fail('html now/footer');
}

const deState = {
  ...state,
  weekdayIndex: 6,
  phase: PHASES.EVICTION,
  doubleEvictionWeekActive: true,
  doubleEvictionRound: 2,
  doubleEvictionRound2Cycle: true,
  houseEventComplete: false,
  isScheduledHouseEventDay() {
    return true;
  }
};
const thu = buildWeekCalendarCells(deState)[6];
if (!thu.subtitle?.includes('DE R2')) fail(`de subtitle ${thu.subtitle}`);

const finaleHtml = renderWeekCalendarHtml({
  week: 10,
  inFinale: true,
  gameOver: false,
  getPhaseDisplayLabel: () => 'Finale — Jury Q&A'
});
if (!finaleHtml.includes('week-calendar--finale')) fail('finale strip');

console.log('OK: hos week calendar smoke');
