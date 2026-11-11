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
const { queueAction, endWeek, applyEventChoice } = await import(`file://${join(game, 'modules/Simulation.js')}`);
const { resolveConvention } = await import(`file://${join(game, 'modules/Convention.js')}`);

function pickUnqualified(state) {
  const open = STATES.find((s) => !state.ballotAccess[s.id]);
  return open?.id ?? 'OH';
}

function autoWeek(state) {
  const party = state.candidate.party;
  const phase = derivePhase(state.week, party);
  const plan = [];
  if (party === 'I' && phase === 'independent_primary') {
    for (let i = 0; i < 2; i++) plan.push({ id: 'petition', picks: { stateId: pickUnqualified(state) } });
  }
  for (let i = 0; i < 4; i++) plan.push({ id: 'fundraise_calls', picks: {} });
  plan.push({ id: 'town_hall', picks: { stateId: state.candidate.homeState } });
  plan.push({ id: 'debate_prep', picks: {} });
  if (phase === 'convention_prep' && state.vpShortlist[0]) {
    plan.push({ id: 'vet_vp', picks: { vpId: state.vpShortlist[0].id } });
  }
  for (const p of plan) {
    const def = ACTIONS.find((a) => a.id === p.id);
    if (!def) continue;
    if (state.weekPlan.apLeft >= def.ap && state.resources.cash >= (def.cashCost ?? 0)) {
      queueAction(state, p.id, p.picks);
    }
  }
  if (phase === 'convention' && !state.conventionDone && state.vpShortlist[0]) {
    resolveConvention(state, { vpId: state.vpShortlist[0].id, speechId: 'unity' });
    state.conventionDone = true;
  }
  endWeek(state);
  let guard = 0;
  while (state.pendingEvent && guard < 5) {
    applyEventChoice(state, 0);
    guard += 1;
    if (state.screen === 'ended' || state.screen === 'election_night') break;
  }
}

async function runParty(party, seed) {
  const state = createNewGame({ name: 'Smoke Test', homeState: 'OH', backgroundId: 'senator', party, seed });
  state._announcements = ANNOUNCEMENTS;
  applyAnnouncement(state, 'pragmatic');
  if (party === 'I') {
    for (const st of STATES) state.ballotAccess[st.id] = true;
  }
  let safety = 0;
  while (state.screen === 'play' && state.week <= TUNING.electionNightWeek && safety < 60) {
    autoWeek(state);
    safety += 1;
    if (state.outcome?.type === 'primary_loss' || state.outcome?.type === 'ballot_fail') break;
  }
  return state;
}

for (const [party, seed] of [
  ['D', 42],
  ['R', 43],
  ['I', 44]
]) {
  const state = await runParty(party, seed);
  if (state.week < TUNING.electionNightWeek && state.outcome?.type !== 'primary_loss' && state.outcome?.type !== 'ballot_fail') {
    fail(`${party} seed ${seed} stopped at week ${state.week} screen ${state.screen}`);
  } else if (!state.outcome && state.screen !== 'election_night') {
    fail(`${party} missing outcome`);
  } else {
    console.log(`OK: ${party} reached wk ${state.week} — ${state.outcome?.type ?? state.screen} (${state.outcome?.playerEv ?? 0} EV)`);
  }
}

process.exit(failed ? 1 : 0);
