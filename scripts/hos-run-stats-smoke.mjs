/**
 * Smoke: run stats compile, achievements, profile merge.
 */
import { GameState } from '../work/hos/modules/GameState.js';
import {
  ACHIEVEMENT_DEFS,
  compilePlayerRunStats,
  defaultProfile,
  evaluateNewAchievements,
  mergeRunIntoProfile,
  renderRunStatsEndHtml
} from '../work/hos/modules/runStats.js';
import { buildRunStatsIntelSection } from '../work/hos/modules/runStatsIntel.js';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const state = new GameState({ playerName: 'Tester', difficulty: 'normal' });
const player = state.getPlayer();
state.history = [
  { type: 'hoh', hohId: player.id, week: 1 },
  { type: 'hoh', hohId: player.id, week: 3 },
  { type: 'hoh', hohId: player.id, week: 5 },
  { type: 'veto_win', holderId: player.id, week: 2 },
  { type: 'veto_win', holderId: player.id, week: 4 },
  { type: 'nominations', nominees: [player.id, 'x'], week: 6 },
  { type: 'eviction', evictedId: 'y', week: 6 }
];
state.week = 8;
state.winner = player;
state.gameOver = true;
player.threat = 72;
player.promises = [
  { targetId: 'a', type: 'vote', week: 2, kept: true },
  { targetId: 'b', type: 'safety', week: 3, kept: true },
  { targetId: 'c', type: 'loyalty', week: 4, kept: true }
];
state.confessionalLog = Array.from({ length: 10 }, (_, i) => ({
  speakerId: player.id,
  week: 1,
  day: i
}));

const run = compilePlayerRunStats(state);
if (!run.won || run.hohWins !== 3 || run.vetoWins !== 2) fail(`run ${JSON.stringify(run)}`);
if (run.evictionVotesSurvived !== 1) fail(`survived ${run.evictionVotesSurvived}`);

const profile = defaultProfile();
const unlocked = evaluateNewAchievements(run, profile);
const ids = new Set(unlocked.map((a) => a.id));
if (!ids.has('first_win') || !ids.has('triple_hoh') || !ids.has('veto_king')) fail('ach missing');
if (!ids.has('big_target')) fail('big target');

const merged = mergeRunIntoProfile(profile, run, unlocked);
if (merged.wins !== 1 || merged.gamesPlayed !== 1) fail('merge counts');
if (!merged.achievements.first_win) fail('ach saved');

const html = renderRunStatsEndHtml(run, merged, unlocked);
if (!html.includes('This season') || !html.includes('Career')) fail('html');

const intel = buildRunStatsIntelSection(state);
if (!intel?.items?.some((i) => i.key === 'run-noms')) fail('intel');

if (ACHIEVEMENT_DEFS.length < 10) fail('ach defs');

console.log('OK: hos run stats smoke');
