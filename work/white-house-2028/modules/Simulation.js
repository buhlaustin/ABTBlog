import { ACTIONS, EVENTS, TUNING, STATES } from './Data.js';
import { createRng } from './Rng.js';
import {
  derivePhase,
  pushNews,
  nationalApproval,
  resetWeekPlan,
  ballotAccessEv,
  gameOverPrimary,
  gameOverBallot,
  gameOverScandal,
  refreshDerived
} from './GameState.js';
import { rivalWeeklyTick, rivalsAct } from './Rivals.js';
import { resolvePrimaryWeek, simulateElectionNight, ensureGeneralOpponent } from './Election.js';
import { startConventionPrep } from './Convention.js';
import { applyAction } from './ActionResolver.js';
import { resolveWeeklyPrimaries } from './PrimaryCalendar.js';
import { isDebateWeek, resolveDebatePerformance } from './Debate.js';

export function weekRng(state, salt = 0) {
  return createRng((state.seed ^ (state.week * 7919) ^ salt) >>> 0);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function money(n) {
  return `$${Math.abs(n).toLocaleString('en-US')}`;
}

export function actionsForPhase(state) {
  const phase = derivePhase(state.week, state.candidate.party);
  return ACTIONS.filter((a) => {
    if (a.phase === 'any') return true;
    if (a.phase === 'independent_primary' && phase === 'independent_primary') return true;
    if (a.phase === 'convention_prep' && phase === 'convention_prep') return true;
    if (a.phase === 'primary' && phase === 'primary') return true;
    if (a.phase === 'general' && phase === 'general') return true;
    return false;
  });
}

export function canAddAction(state, actionId) {
  const def = ACTIONS.find((a) => a.id === actionId);
  if (!def) return { ok: false, reason: 'Unknown action.' };
  if (state.weekPlan.apLeft < def.ap) return { ok: false, reason: 'Not enough action points.' };
  if ((state.resources.cash ?? 0) < (def.cashCost ?? 0)) return { ok: false, reason: 'Not enough cash.' };
  if ((state.resources.energy ?? 0) < (def.energy ?? 0) && def.id !== 'rest') {
    return { ok: false, reason: 'Too tired — rest or lighten the schedule.' };
  }
  if (def.id === 'hire_role' && (state.staffRoles?.length ?? 0) >= TUNING.maxStaffRoles) {
    return { ok: false, reason: 'Senior team full.' };
  }
  return { ok: true, def };
}

export function queueAction(state, actionId, picks = {}) {
  const check = canAddAction(state, actionId);
  if (!check.ok) return check;
  const def = check.def;
  state.weekPlan.actions.push({ id: actionId, picks });
  state.weekPlan.apLeft -= def.ap;
  if (def.cashCost) {
    state.resources.cash -= def.cashCost;
    state.statsRecap.cashSpent += def.cashCost;
  }
  return { ok: true, label: def.label };
}

export function unqueueAction(state, index) {
  const row = state.weekPlan.actions[index];
  if (!row) return false;
  const def = ACTIONS.find((a) => a.id === row.id);
  state.weekPlan.apLeft += def?.ap ?? 1;
  if (def?.cashCost) {
    state.resources.cash += def.cashCost;
    state.statsRecap.cashSpent -= def.cashCost;
  }
  state.weekPlan.actions.splice(index, 1);
  return true;
}

function resolveQueuedActions(state) {
  const rng = weekRng(state, 33);
  const lines = [];
  for (const queued of state.weekPlan.actions) {
    const def = ACTIONS.find((a) => a.id === queued.id);
    if (!def) continue;
    const deltas = applyAction(state, def, queued.picks ?? {}, rng);
    const parts = [];
    if (deltas.cash) parts.push(`cash ${deltas.cash >= 0 ? '+' : ''}${money(deltas.cash)}`);
    if (deltas.approval) parts.push(`approval ${deltas.approval >= 0 ? '+' : ''}${deltas.approval}`);
    if (deltas.state) parts.push(deltas.state);
    lines.push(`${def.label}${parts.length ? ` (${parts.join(', ')})` : ''}`);
  }
  return lines;
}

function pickWeeklyEvent(state, rng) {
  const phase = derivePhase(state.week, state.candidate.party);
  if (isDebateWeek(state) && state.debateResolvedWeek !== state.week) {
    state.pendingDebate = true;
    return null;
  }
  const pool = EVENTS.filter((e) => {
    if (e.weight <= 0) return false;
    if (e.minWeek && state.week < e.minWeek) return false;
    if (e.phase === 'any') return true;
    if (e.phase === 'primary' && (phase === 'primary' || phase === 'independent_primary')) return true;
    if (e.phase === 'general' && phase === 'general') return true;
    if (e.phase === 'convention_prep' && phase === 'convention_prep') return true;
    if (e.phase === 'independent_primary' && phase === 'independent_primary') return true;
    return false;
  });
  const total = pool.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const ev of pool) {
    roll -= ev.weight;
    if (roll <= 0) return ev;
  }
  return pool[0] ?? null;
}

export function resolveDebate(state, styleId) {
  const rng = weekRng(state, 441);
  resolveDebatePerformance(state, styleId, rng);
  state.pendingDebate = false;
  return { ok: true };
}

export function endWeek(state) {
  if (state.pendingEvent) return { ok: false, reason: 'Respond to the weekly decision first.' };
  if (state.pendingDebate) return { ok: false, reason: 'Pick a debate style before ending the week.' };

  const rng = weekRng(state, 77);
  const before = snapshotResources(state);

  const summaries = resolveQueuedActions(state);
  state.resources.cash -= state.weeklyBurn;
  state.statsRecap.cashSpent += state.weeklyBurn;

  const event = pickWeeklyEvent(state, rng);
  if (event?.choices) {
    state.pendingEvent = { ...event, picked: false };
    pushNews(state, event.text);
    state.lastWeekRecap = buildRecap(before, state, summaries);
    return { ok: true, lines: summaries, needsChoice: true, recap: state.lastWeekRecap };
  }
  if (event?.effects && !event.choices) {
    applyEventEffects(state, event.effects ?? {}, rng);
    pushNews(state, event.text);
  }

  if (isDebateWeek(state) && state.debateResolvedWeek !== state.week) {
    state.pendingDebate = true;
    state.lastWeekRecap = buildRecap(before, state, summaries);
    return { ok: true, lines: summaries, needsDebate: true, recap: state.lastWeekRecap };
  }

  return completeWeekAfterResolution(state, rng, summaries, before);
}

function completeWeekAfterResolution(state, rng, summaries, before) {
  for (const rival of state.rivals) {
    if (rival.alive) rivalWeeklyTick(rival, rng, state.resources.momentum);
  }
  rivalsAct(state, rng);

  if (state.week < 26 && state.candidate.party !== 'I') {
    resolveWeeklyPrimaries(state, rng);
  }

  if (state.week === TUNING.generalStart) {
    ensureGeneralOpponent(state);
    pushNews(state, `General election: ${state.generalOpponent?.name} (${state.generalOpponent?.partyLabel}) clinches rival nod.`);
  }

  syncStateSupportFromNational(state, rng);

  if ((state.resources.scandal ?? 0) >= TUNING.scandalCrisis) {
    gameOverScandal(state);
    return { ok: true, gameOver: true, reason: 'scandal' };
  }

  refreshDerived(state);
  state.lastWeekRecap = buildRecap(before, state, summaries);
  trackBestWorstWeek(state, before);

  if (state.week === TUNING.conventionWeek && !state.conventionDone) {
    return { ok: false, reason: 'Confirm your running mate at the convention before advancing.' };
  }

  return finishWeekAdvance(state, rng, summaries);
}

export function applyEventChoice(state, choiceIndex) {
  const ev = state.pendingEvent;
  if (!ev?.choices?.[choiceIndex]) return { ok: false };
  const choice = ev.choices[choiceIndex];
  const rng = weekRng(state, 909);
  const before = snapshotResources(state);
  applyEventEffects(state, choice.effects ?? {}, rng);
  pushNews(state, `${ev.text} → ${choice.label}`);
  state.pendingEvent = null;
  return completeWeekAfterResolution(state, rng, [], before);
}

export function finishWeekAdvance(state, rng, summaries = []) {
  if (state.week === TUNING.conventionWeek && !state.conventionDone) {
    return { ok: false, reason: 'Confirm your running mate at the convention before advancing.' };
  }

  if (state.week === 26) {
    if (state.candidate.party === 'I') {
      const ev = ballotAccessEv(state);
      if (ev < TUNING.independentBallotTargetEv) {
        gameOverBallot(state);
        return { ok: true, gameOver: true };
      }
      pushNews(state, `Ballot check cleared — ${ev} electoral votes on the line.`);
      state.nomineeWonPrimary = true;
    } else {
      const prim = resolvePrimaryWeek(state, rng);
      if (!prim.won) {
        gameOverPrimary(state, prim.winner);
        return { ok: true, gameOver: true, primary: prim };
      }
      state.nomineeWonPrimary = true;
      pushNews(state, `Primary season: ${state.candidate.name} wins the nomination (${prim.playerDelegates} delegates).`);
    }
    startConventionPrep(state);
  }

  if (state.week === TUNING.electionNightWeek) {
    const night = simulateElectionNight(state, rng);
    state.election = night;
    resetWeekPlan(state);
    return { ok: true, electionNight: true, lines: summaries, recap: state.lastWeekRecap };
  }

  state.history.push({
    week: state.week,
    approval: nationalApproval(state),
    cash: state.resources.cash,
    momentum: state.resources.momentum,
    scandal: state.resources.scandal
  });

  state.week += 1;
  resetWeekPlan(state);
  pushNews(state, `— Week ${state.week} begins — ${phaseHeadline(state)}`);
  refreshDerived(state);
  return { ok: true, lines: summaries, recap: state.lastWeekRecap };
}

function phaseHeadline(state) {
  const p = derivePhase(state.week, state.candidate.party);
  if (p === 'primary') return 'primary contests on the calendar';
  if (p === 'independent_primary') return 'petition drives continue';
  if (p === 'general') return 'battleground map tightens';
  return 'AP points refresh';
}

function applyEventEffects(state, effects, rng) {
  const r = state.resources;
  if (effects.approval) r.approval = clamp(r.approval + effects.approval, 10, 72);
  if (effects.base) r.base = clamp(r.base + effects.base, 10, 88);
  if (effects.buzz) r.momentum = clamp(r.momentum + Math.round(effects.buzz / 2), 0, 30);
  if (effects.momentum) r.momentum = clamp(r.momentum + effects.momentum, 0, 30);
  if (effects.nameRec) r.nameRec = clamp(r.nameRec + effects.nameRec, 5, 96);
  if (effects.scandal) r.scandal = clamp((r.scandal ?? 0) + effects.scandal, 0, TUNING.scandalMax);
  if (effects.energy) r.energy = clamp(r.energy + effects.energy, 0, TUNING.energyMax);
  if (effects.cash) {
    r.cash += effects.cash;
    if (effects.cash > 0) state.statsRecap.cashRaised += effects.cash;
    else state.statsRecap.cashSpent -= effects.cash;
  }
  if (effects.securityStates) {
    for (const st of STATES.filter((s) => (s.partisanLean ?? 0) > 0)) {
      state.stateSupport[st.id] = clamp((state.stateSupport[st.id] ?? 45) + 1, 20, 79);
    }
  }
}

function syncStateSupportFromNational(state, rng) {
  const nat = nationalApproval(state);
  const drift = (nat - 48) / 35;
  const scandalDrag = (state.resources.scandal ?? 0) > 40 ? -0.4 : 0;
  for (const st of STATES) {
    const lean = st.partisanLean ?? 0;
    const party = state.candidate.party;
    let leanPull = party === 'R' ? lean * 0.05 : party === 'D' ? -lean * 0.05 : 0;
    const cur = state.stateSupport[st.id] ?? 45;
    const noise = rng.int(-1, 1);
    state.stateSupport[st.id] = clamp(cur + drift + leanPull + scandalDrag + noise, 22, 78);
  }
}

function snapshotResources(state) {
  return {
    approval: nationalApproval(state),
    cash: state.resources.cash,
    momentum: state.resources.momentum,
    scandal: state.resources.scandal ?? 0
  };
}

function buildRecap(before, state, lines) {
  const after = snapshotResources(state);
  return {
    approvalDelta: after.approval - before.approval,
    cashDelta: after.cash - before.cash,
    momentumDelta: after.momentum - before.momentum,
    scandalDelta: after.scandal - before.scandal,
    lines
  };
}

function trackBestWorstWeek(state, before) {
  const delta = nationalApproval(state) - before.approval;
  const recap = state.statsRecap;
  if (!recap.bestWeek || delta > recap.bestWeek.delta) recap.bestWeek = { week: state.week, delta };
  if (!recap.worstWeek || delta < recap.worstWeek.delta) recap.worstWeek = { week: state.week, delta };
}
