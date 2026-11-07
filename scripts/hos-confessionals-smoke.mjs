/**
 * Headless confessionals checks for House of Strategy.
 * Run: node scripts/hos-confessionals-smoke.mjs
 */
import {
  buildConfessionalIntelSection,
  buildReplacementConfessionalExtras,
  countConfessionalsThisWeek,
  getConfessionalFeedBanner,
  pickConfessionalLine,
  recordConfessional
} from '../work/hos/modules/confessionals.js';

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const player = {
  id: 'p1',
  name: 'Riley',
  isPlayer: true,
  personality: { name: 'Player', strategy: 'custom' }
};

const strategist = {
  id: 'a1',
  name: 'Jordan',
  isPlayer: false,
  personality: { name: 'Strategist', strategy: 'manipulate' }
};

const campaignLine = pickConfessionalLine(player, 'campaign', { target: 'Alex' });
if (!campaignLine) fail('player campaign line missing');

const betrayedLine = pickConfessionalLine(strategist, 'betrayed_by', { betrayer: 'Sam' });
if (!betrayedLine || !betrayedLine.includes('Sam')) {
  fail(`betrayed_by line: ${betrayedLine}`);
}

const layLow = pickConfessionalLine(player, 'lay_low');
if (!layLow) fail('lay_low player line missing');

const vetoSpared = pickConfessionalLine(player, 'veto_spared', { saver: 'Casey' });
if (!vetoSpared) fail('veto_spared line missing');

const state = {
  week: 2,
  day: 3,
  confessionalLog: [],
  getPlayer() {
    return player;
  },
  getActiveContestants() {
    return [player, strategist];
  },
  getContestant(id) {
    return id === 'p1' ? player : strategist;
  },
  vetoSavedNomineeId: 'a1'
};

recordConfessional(state, player, campaignLine, 'campaign', 'local');
recordConfessional(state, strategist, betrayedLine, 'betrayed_by', 'local');
recordConfessional(state, player, vetoSpared, 'veto_spared', 'api');

if (countConfessionalsThisWeek(state) !== 3) {
  fail(`week count expected 3 got ${countConfessionalsThisWeek(state)}`);
}

const banner = getConfessionalFeedBanner(state);
if (!banner.includes('3 this week') || !banner.includes('Saved by veto')) {
  fail(`banner: ${banner}`);
}

const intel = buildConfessionalIntelSection(state);
if (!intel?.items?.length) fail('intel section empty');
const weekItem = intel.items.find((i) => i.key === 'conf-week-count');
if (!weekItem?.detail?.includes('2 HGs')) {
  fail(`intel week detail: ${weekItem?.detail}`);
}
if (!intel.items.some((i) => i.detail?.includes('narrated'))) {
  fail('intel missing narrated tag for api line');
}

const extras = buildReplacementConfessionalExtras(state, strategist);
if (extras.length < 1 || extras[0].eventKey !== 'replacement_nom') {
  fail(`replacement extras: ${JSON.stringify(extras)}`);
}

console.log('OK: hos confessionals smoke');
