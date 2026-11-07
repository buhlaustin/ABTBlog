/**
 * Headless week-end recap checks for House of Strategy.
 * Run: node scripts/hos-week-recap-smoke.mjs
 */
import {
  buildWeekRecapFeedEntries,
  compileWeekRecap,
  formatPlayerWeekDigest,
  getWeekRecapBanner
} from '../work/hos/modules/weekEndRecap.js';

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const contestants = [
  { id: 'p1', name: 'Riley', isPlayer: true, evicted: false, threat: 40 },
  { id: 'h1', name: 'Jordan', isPlayer: false, evicted: false, threat: 55 },
  { id: 'v1', name: 'Sam', isPlayer: false, evicted: false, threat: 48 }
];

const state = {
  week: 3,
  weekdayIndex: 6,
  doubleEvictionRound: 1,
  lastVetoRecapWeek: null,
  evictedThisWeek: 'x1',
  playerThreatWeekStart: 35,
  confessionalLog: [{ week: 3, speakerId: 'p1' }, { week: 3, speakerId: 'h1' }],
  contestants: [],
  getJurors() {
    return [{ name: 'Alex', evictedWeek: 3, isJuror: true }];
  },
  history: [
    { week: 3, type: 'hoh', hohId: 'h1', hohArchetype: 'Strategist', powerRound: 1 },
    { week: 3, type: 'nominations', hoh: 'h1', nominees: ['v1', 'p1'], powerRound: 1 },
    { week: 3, type: 'veto_win', holderId: 'p1', powerRound: 1 },
    {
      week: 3,
      type: 'veto_ceremony',
      holderId: 'p1',
      vetoUsed: true,
      savedId: 'p1',
      replacementId: null,
      powerRound: 1
    },
    { week: 3, type: 'eviction', evictedId: 'x1', powerRound: 1 }
  ],
  getPlayer() {
    return contestants[0];
  },
  getActiveContestants() {
    return contestants.filter((c) => !c.evicted);
  },
  getContestant(id) {
    if (id === 'x1') {
      return { id: 'x1', name: 'Alex', evicted: true, isJuror: true, evictedWeek: 3 };
    }
    return contestants.find((c) => c.id === id) ?? null;
  }
};

state.contestants = [
  ...contestants,
  { id: 'x1', name: 'Alex', evicted: true, isJuror: true, evictedWeek: 3 }
];

const recap = compileWeekRecap(state);
if (recap.hohWins.length !== 1 || recap.nominationSets.length !== 1) {
  fail(`expected hoh/noms got ${JSON.stringify(recap)}`);
}
if (recap.evicted[0]?.name !== 'Alex') {
  fail(`evicted name ${recap.evicted[0]?.name}`);
}
if (!recap.danger?.topThreats?.length) fail('danger threats missing');

if (!recap.playerWeek?.roles?.includes('Won POV')) fail('player POV role missing');
if (!recap.jury?.seated?.includes('Alex')) fail('jury seated missing');
const digest = formatPlayerWeekDigest(recap.playerWeek);
if (!digest.includes('Won POV')) fail(`digest ${digest}`);

const entries = buildWeekRecapFeedEntries(recap);
if (!entries[0]?.text?.includes('week-recap-label')) {
  fail('feed missing recap label');
}
if (!entries[0]?.text?.includes('Jordan')) fail('feed missing HOH name');
if (!entries[0]?.text?.includes('Your week')) fail('feed missing player line');
if (entries.length < 2 || entries[1].type !== 'week-recap-digest') {
  fail('missing digest entry');
}

state.lastWeekRecap = recap;
state.week = 4;
const banner = getWeekRecapBanner(state);
if (!banner.includes('Week 3 recap') || !banner.includes('Alex')) {
  fail(`banner: ${banner}`);
}

console.log('OK: hos week recap smoke');
