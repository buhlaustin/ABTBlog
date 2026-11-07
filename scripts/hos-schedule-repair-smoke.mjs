/**
 * Headless schedule repair transparency checks.
 * Run: node scripts/hos-schedule-repair-smoke.mjs
 */
import {
  buildScheduleRepairFeedEntries,
  runScheduleRepair,
  snapshotSchedule
} from '../work/hos/modules/scheduleRepair.js';
import { PHASES } from '../work/hos/modules/GameState.js';

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const contestants = [
  { id: 'h1', name: 'Jordan', isHOH: true, isNominated: false, evicted: false },
  { id: 'p1', name: 'Riley', isPlayer: true, isHOH: false, isNominated: false, evicted: false }
];

function makeState(overrides = {}) {
  return {
    week: 1,
    weekdayIndex: 6,
    phase: PHASES.EVICTION,
    day: 7,
    gameOver: false,
    nominees: [],
    houseEventComplete: false,
    currentHOH: contestants[0],
    scheduleRepairLog: [],
    getActiveContestants() {
      return contestants.filter((c) => !c.evicted);
    },
    getActiveNominees() {
      return contestants.filter((c) => c.isNominated && !c.evicted);
    },
    getWeekdayName() {
      return 'Thursday';
    },
    syncPhaseForWeekday() {
      this.phase = PHASES.COMPETITION;
      this.weekdayIndex = 0;
      this.day = 1;
    },
    ...overrides
  };
}

const state = makeState();
const record = runScheduleRepair(state, 'recover');
if (!record || record.reason !== 'missing_nominees') {
  fail(`repair record ${JSON.stringify(record)}`);
}
if (state.phase !== PHASES.NOMINATION || state.weekdayIndex !== 1) {
  fail('after state not nomination saturday');
}

const entries = buildScheduleRepairFeedEntries(record);
if (entries.length !== 2 || !entries[1].text.includes('View what happened')) {
  fail('feed entries');
}
if (!entries[1].text.includes('Before:') || !entries[1].text.includes('After:')) {
  fail('diff missing');
}

const noHoh = makeState({ currentHOH: null });
contestants[0].isHOH = false;
const r2 = runScheduleRepair(noHoh, 'load');
if (!r2 || r2.reason !== 'missing_hoh') fail('missing hoh path');
if (noHoh.weekdayIndex !== 0) fail('rewind friday');

const snap = snapshotSchedule(noHoh);
if (!snap.weekday || snap.nomineeCount !== 0) fail(`snap ${JSON.stringify(snap)}`);

console.log('OK: hos schedule repair smoke');
