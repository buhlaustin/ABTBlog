/**
 * Headless smoke: full 52-week run for D / R / I seeds.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(root, 'work/white-house-2028');

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const { createNewGame, applyAnnouncement, derivePhase } = await import(
  `file://${join(game, 'modules/GameState.js')}`
);
const { ANNOUNCEMENTS, TUNING, ACTIONS, STATES } = await import(`file://${join(game, 'modules/Data.js')}`);
const { queueAction, endWeek, applyEventChoice, resolveDebate, canAddAction } = await import(
  `file://${join(game, 'modules/Simulation.js')}`
);
const { resolveConvention, startConventionPrep } = await import(`file://${join(game, 'modules/Convention.js')}`);

function pickUnqualified(state) {
  const open = STATES.find((s) => !state.ballotAccess[s.id]);
  return open?.id ?? 'OH';
}

function queueIfPossible(state, id, picks = {}) {
  const def = ACTIONS.find((a) => a.id === id);
  if (!def) return;
  const check = canAddAction(state, id);
  if (!check.ok) return;
  queueAction(state, id, picks);
}

function autoWeek(state) {
  const party = state.candidate.party;
  const phase = derivePhase(state.week, party);

  if (party === 'I' && phase === 'independent_primary') {
    let petitionQueues = 0;
    while (state.weekPlan.apLeft >= 2 && petitionQueues < 4) {
      const before = state.weekPlan.apLeft;
      queueIfPossible(state, 'petition', { stateId: pickUnqualified(state) });
      petitionQueues += 1;
      if (state.weekPlan.apLeft >= before) break;
    }
    queueIfPossible(state, 'fundraise_calls', {});
    queueIfPossible(state, 'debate_prep', {});
  } else {
    for (let i = 0; i < 3; i++) queueIfPossible(state, 'fundraise_calls', {});
    queueIfPossible(state, 'town_hall', { stateId: state.candidate.homeState });
    queueIfPossible(state, 'debate_prep', {});
    queueIfPossible(state, 'social_post', { socialTopicId: 'vision', socialTone: 'safe' });
    queueIfPossible(state, 'hire_role', { staffRoleId: 'comms_director' });
  }
  if (phase === 'general') {
    queueIfPossible(state, 'ads_state', { stateId: 'PA' });
  }
  if (phase === 'convention_prep' && state.vpShortlist[0]) {
    queueIfPossible(state, 'vet_vp', { vpId: state.vpShortlist[0].id });
  }

  if (phase === 'convention_prep' && !state.vpShortlist?.length) {
    startConventionPrep(state);
  }

  if ((phase === 'convention' || state.week === TUNING.conventionWeek) && !state.conventionDone && state.vpShortlist?.[0]) {
    resolveConvention(state, { vpId: state.vpShortlist[0].id, speechId: 'unity' });
    state.conventionDone = true;
  }

  if (state.pendingDebate) {
    resolveDebate(state, 'balanced');
  }

  let res = endWeek(state);
  if (!res.ok && state.week === TUNING.conventionWeek && !state.conventionDone && state.vpShortlist?.[0]) {
    resolveConvention(state, { vpId: state.vpShortlist[0].id, speechId: 'unity' });
    state.conventionDone = true;
    res = endWeek(state);
  }
  if (!res.ok) return res;

  let guard = 0;
  while ((state.pendingEvent || state.pendingDebate) && guard < 8) {
    if (state.pendingDebate) resolveDebate(state, 'balanced');
    if (state.pendingEvent) applyEventChoice(state, 0);
    guard += 1;
    if (state.screen === 'ended' || state.screen === 'election_night') break;
  }
  return res;
}

async function runParty(party, seed) {
  const state = createNewGame({ name: 'Smoke Test', homeState: 'OH', backgroundId: 'senator', party, seed });
  state._announcements = ANNOUNCEMENTS;
  applyAnnouncement(state, 'pragmatic');

  let safety = 0;
  while (state.screen === 'play' && state.week <= TUNING.electionNightWeek && safety < 58) {
    const res = autoWeek(state);
    safety += 1;
    if (state.outcome || state.screen === 'ended' || res?.electionNight) break;
  }
  return state;
}

for (const [party, seed] of [
  ['D', 42],
  ['R', 43],
  ['I', 44]
]) {
  const state = await runParty(party, seed);
  if (
    state.week < TUNING.electionNightWeek &&
    state.outcome?.type !== 'primary_loss' &&
    state.outcome?.type !== 'ballot_fail' &&
    state.outcome?.type !== 'scandal_out'
  ) {
    fail(`${party} seed ${seed} stopped at week ${state.week} screen ${state.screen}`);
  } else if (!state.outcome && state.screen !== 'election_night') {
    fail(`${party} missing outcome`);
  } else {
    console.log(`OK: ${party} reached wk ${state.week} — ${state.outcome?.type ?? state.screen} (${state.outcome?.playerEv ?? 0} EV)`);
  }
}

process.exit(failed ? 1 : 0);
