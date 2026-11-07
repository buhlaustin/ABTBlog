/**
 * Smoke: cast presets + twist defaults + duo / brains shaping.
 */
import { GameState } from '../work/hos/modules/GameState.js';
import {
  getCastPresetTwistDefaults,
  resolveJuryStartHouseCount,
  buildCastPresetIntelSection
} from '../work/hos/modules/castPresets.js';
import { CAST_PRESETS } from '../work/hos/modules/utils.js';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const duoTwists = getCastPresetTwistDefaults('duo');
if (!duoTwists.battleBack || !duoTwists.doubleEviction) fail('duo twists');

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
if (stratN < 8) fail(`brains strategists ${stratN}`);
if (brainsState.contestants.some((c) => !c.isPlayer && c.intelligence < 5)) {
  fail('brains int bump missing');
}

const duoState = new GameState({
  playerName: 'Tester',
  castPreset: 'duo',
  difficulty: 'normal',
  aiCount: CAST_PRESETS.duo.aiCount,
  battleBackEnabled: true
});
const duos = duoState.alliances.filter((a) => /^Duo /.test(a.name));
if (duos.length < 6) fail(`duo count ${duos.length}`);

const sprintState = new GameState({
  playerName: 'Tester',
  castPreset: 'jury_sprint',
  aiCount: CAST_PRESETS.jury_sprint.aiCount
});
if (resolveJuryStartHouseCount(sprintState) !== 8) fail('jury sprint threshold');
if (sprintState.getActiveContestants().length !== 12) fail('jury sprint size');

const intel = buildCastPresetIntelSection(duoState);
if (!intel.items.some((i) => i.key === 'cast-duos')) fail('intel duos');

console.log('OK: hos cast presets smoke');
