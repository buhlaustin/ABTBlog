import { pickVpShortlist } from './RunningMates.js';
import { pushNews } from './GameState.js';

export function startConventionPrep(state) {
  if (state.vpShortlist?.length) return;
  state.vpShortlist = pickVpShortlist(state.matePool, state.seed + state.week);
  pushNews(state, 'Convention prep: running mate shortlist finalized (5 names).');
}

export function resolveConvention(state, { vpId, speechId }) {
  const vp = state.vpShortlist.find((v) => v.id === vpId) ?? state.vpShortlist[0];
  if (!vp) return { ok: false, reason: 'Pick a running mate.' };
  state.runningMate = { ...vp };
  let bounce = 3;
  if (speechId === 'unity') bounce = 5;
  if (speechId === 'attack') bounce = 2;
  if (speechId === 'vision') bounce = 4;
  if (vp.hiddenRevealed && vp.hidden.includes('scandal')) bounce -= 2;
  if (vp.score >= 60) bounce += 2;
  state.conventionBounce = bounce;
  state.resources.approval += bounce;
  state.resources.momentum += Math.round(bounce / 2);
  for (const id of Object.keys(state.stateSupport)) {
    state.stateSupport[id] = Math.min(78, (state.stateSupport[id] ?? 40) + Math.round(bounce / 2));
  }
  pushNews(state, `Convention: ${state.candidate.name} + ${vp.name} (${vp.homeName}). Speech lands for +${bounce} bounce.`);
  state.statsRecap.keyMoments.push(`Convention: chose ${vp.name}`);
  return { ok: true, bounce };
}
