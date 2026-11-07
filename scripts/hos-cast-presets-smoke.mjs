/**
 * Smoke: cast presets + twist defaults + large casts + all-stars mix.
 */
import { GameState } from '../work/hos/modules/GameState.js';
import {
  getCastPreset,
  getCastPresetTwistDefaults,
  resolveJuryStartHouseCount,
  buildCastPresetIntelSection,
  getHouseguestCastMarks
} from '../work/hos/modules/castPresets.js';
import { CAST_PRESETS, totalCastSize } from '../work/hos/modules/utils.js';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

if (getCastPreset('duo').id !== 'standard') fail('legacy duo map');

const starsTwists = getCastPresetTwistDefaults('all_stars');
if (!starsTwists.battleBack || !starsTwists.mvpTwist) fail('all_stars twists');

const sprintTwists = getCastPresetTwistDefaults('jury_sprint');
if (sprintTwists.doubleEviction) fail('jury sprint DE off');

const brainsState = new GameState({
  playerName: 'Tester',
  castPreset: 'brains',
  difficulty: 'normal',
  aiCount: CAST_PRESETS.brains.aiCount,
  mvpTwistEnabled: true
});
const stratN = brainsState.contestants.filter((c) => c.personality?.id === 'strategist').length;
if (stratN < 5) fail(`brains strategists ${stratN}`);

const megaState = new GameState({
  playerName: 'Tester',
  castPreset: 'megacast',
  aiCount: CAST_PRESETS.megacast.aiCount
});
if (megaState.getActiveContestants().length !== 24) fail('megacast size');
if (resolveJuryStartHouseCount(megaState) !== 14) fail('megacast jury');

const superState = new GameState({
  playerName: 'Tester',
  castPreset: 'supersized',
  aiCount: CAST_PRESETS.supersized.aiCount
});
if (totalCastSize(CAST_PRESETS.supersized.aiCount) !== 20) fail('supersized total');

const starsState = new GameState({
  playerName: 'You',
  castPreset: 'all_stars',
  aiCount: CAST_PRESETS.all_stars.aiCount,
  battleBackEnabled: true
});
const vets = starsState.contestants.filter((c) => c.isVeteran);
const rookies = starsState.contestants.filter((c) => c.isRookie);
if (vets.length !== 6) fail(`vets ${vets.length}`);
if (rookies.length !== 12) fail(`rookies ${rookies.length}`);
if (!starsState.getPlayer()?.isRookie) fail('player rookie');
if (!vets.every((c) => c.veteranSeason)) fail('vet seasons');
if (!getHouseguestCastMarks(vets[0]).some((m) => m.key === 'veteran')) fail('vet mark');

const sprintState = new GameState({
  playerName: 'Tester',
  castPreset: 'jury_sprint',
  aiCount: CAST_PRESETS.jury_sprint.aiCount
});
if (resolveJuryStartHouseCount(sprintState) !== 8) fail('jury sprint threshold');

const intel = buildCastPresetIntelSection(starsState);
if (!intel.items.some((i) => i.key === 'cast-vets')) fail('intel vets');

console.log('OK: hos cast presets smoke');
