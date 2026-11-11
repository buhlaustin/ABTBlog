import { ACTIONS, EVENTS, TUNING, STATES, getState } from './Data.js';
import { createRng } from './Rng.js';
import {
  derivePhase,
  pushNews,
  nationalApproval,
  resetWeekPlan,
  ballotAccessEv,
  gameOverPrimary,
  gameOverBallot,
  freshWeekPlan
} from './GameState.js';
import { rivalWeeklyTick } from './Rivals.js';
import { resolvePrimaryWeek, accruePrimaryDelegates, simulateElectionNight, ensureGeneralOpponent } from './Election.js';
import { startConventionPrep, resolveConvention } from './Convention.js';

export function weekRng(state, salt = 0) {
  return createRng((state.seed ^ (state.week * 7919) ^ salt) >>> 0);
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
  const phase = derivePhase(state.week, state.candidate.party);
  if (def.phase !== 'any' && def.phase !== phase && !(def.phase === 'independent_primary' && phase === 'independent_primary')) {
    if (def.phase === 'convention_prep' && phase !== 'convention_prep') {
      return { ok: false, reason: 'Not available this phase.' };
    }
    if (def.phase !== 'convention_prep' && def.phase !== 'any') {
      /* allow convention_prep vet only in that phase */
    }
  }
  if (state.weekPlan.apLeft < def.ap) return { ok: false, reason: 'Not enough action points.' };
  if ((state.resources.cash ?? 0) < (def.cashCost ?? 0)) return { ok: false, reason: 'Not enough cash.' };
  if ((state.resources.energy ?? 0) < (def.energy ?? 0) && def.id !== 'rest') {
    return { ok: false, reason: 'Too tired — rest or lighten the schedule.' };
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

function rollEffect(rng, val) {
  if (Array.isArray(val)) return rng.int(val[0], val[1]);
  return val ?? 0;
}

function applyActionEffects(state, def, picks, rng) {
  const r = state.resources;
  const eff = def.effects ?? {};
  const deltas = {};

  if (eff.cash) {
    const mult = state.candidate.party === 'I' ? TUNING.independentFundraisingMult : 1;
    const skill = 0.8 + state.candidate.stats.fundraising / 120;
    const gained = Math.round(rollEffect(rng, eff.cash) * mult * skill);
    r.cash += gained;
    state.statsRecap.cashRaised += gained;
    deltas.cash = gained;
  }
  if (eff.cash && eff.cash < 0) {
    r.cash += eff.cash;
    deltas.cash = eff.cash;
  }

  for (const key of ['approval', 'buzz', 'base', 'nameRec', 'momentum']) {
    if (eff[key] != null) {
      const v = rollEffect(rng, eff[key]);
      if (key === 'approval') r.approval = clamp(r.approval + v, 15, 72);
      if (key === 'buzz') r.momentum = clamp(r.momentum + Math.round(v / 2), 0, 30);
      if (key === 'base') r.base = clamp(r.base + v, 10, 85);
      if (key === 'nameRec') r.nameRec = clamp(r.nameRec + v, 5, 95);
      deltas[key] = v;
    }
  }

  if (eff.staff) {
    state.staff += eff.staff;
    state.weeklyBurn += eff.weeklyBurn ?? 8000;
  }
  if (eff.debateBuff) state.debateBuff += eff.debateBuff;

  const gaffeRisk = eff.gaffeRisk ?? 0;
  if (gaffeRisk && rng.chance(gaffeRisk + (r.energy < TUNING.gaffeEnergyThreshold ? 0.12 : 0))) {
    r.approval = clamp(r.approval - rng.int(2, 6), 10, 72);
    r.momentum = clamp(r.momentum - 3, 0, 30);
    pushNews(state, 'Gaffe cycle: a clip is playing on repeat.', { approval: -4 });
    state.statsRecap.keyMoments.push(`Week ${state.week}: viral gaffe`);
  }

  if (eff.energyRestore) {
    r.energy = clamp(r.energy + eff.energyRestore, 0, TUNING.energyMax);
  } else if (def.id !== 'rest') {
    r.energy = clamp(r.energy - (def.energy ?? 0), 0, TUNING.energyMax);
  }

  if (eff.stateBoost && picks.stateId) {
    const st = state.stateSupport[picks.stateId] ?? 40;
    const bump = rollEffect(rng, eff.stateBoost);
    state.stateSupport[picks.stateId] = clamp(st + bump, 20, 78);
    deltas.state = `${picks.stateId} +${bump}`;
  }

  if (eff.petitionProgress && picks.stateId && state.candidate.party === 'I') {
    if (!state.ballotAccess[picks.stateId]) {
      const cost = picks.stateId === state.candidate.homeState ? 0.85 : 1;
      if (rng.chance(0.55 * cost + state.candidate.stats.organization / 140)) {
        state.ballotAccess[picks.stateId] = true;
        pushNews(state, `Ballot access secured: ${getState(picks.stateId)?.name}.`, { ballot: picks.stateId });
      } else {
        pushNews(state, `Petition drive falls short in ${getState(picks.stateId)?.name} — try again.`);
      }
    }
  }

  if (eff.vetReveal && picks.vpId) {
    const vp = state.vpShortlist.find((v) => v.id === picks.vpId);
    if (vp) {
      vp.hiddenRevealed = true;
      pushNews(state, `Vetting memo on ${vp.name}: "${vp.hidden}"`, { vet: vp.id });
    }
  }

  if (eff.rivalDamage) {
    for (const rival of state.rivals) {
      if (rival.alive) rival.approval -= rollEffect(rng, eff.rivalDamage);
    }
  }

  if (def.requiresRegionPick && picks.region) {
    for (const st of STATES.filter((s) => s.region === picks.region)) {
      state.stateSupport[st.id] = clamp((state.stateSupport[st.id] ?? 40) + rollEffect(rng, 2), 20, 78);
    }
  }

  return deltas;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function resolveQueuedActions(state) {
  const rng = weekRng(state, 33);
  const lines = [];
  for (const queued of state.weekPlan.actions) {
    const def = ACTIONS.find((a) => a.id === queued.id);
    if (!def) continue;
    const deltas = applyActionEffects(state, def, queued.picks ?? {}, rng);
    lines.push(`${def.label}${formatDeltas(deltas)}`);
  }
  return lines;
}

function formatDeltas(d) {
  const parts = [];
  if (d.cash) parts.push(`cash ${d.cash >= 0 ? '+' : ''}${money(d.cash)}`);
  if (d.approval) parts.push(`approval ${d.approval >= 0 ? '+' : ''}${d.approval}`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

function money(n) {
  return `$${Math.abs(n).toLocaleString('en-US')}`;
}

function pickWeeklyEvent(state, rng) {
  const phase = derivePhase(state.week, state.candidate.party);
  if (TUNING.debateWeeksPrimary.includes(state.week) && phase === 'primary') {
    return EVENTS.find((e) => e.id === 'debate_night');
  }
  if (TUNING.debateWeeksGeneral.includes(state.week) && phase === 'general') {
    return EVENTS.find((e) => e.id === 'debate_night');
  }
  const pool = EVENTS.filter((e) => {
    if (e.weight <= 0) return false;
    if (e.phase === 'any') return true;
    if (e.phase === 'primary' && (phase === 'primary' || phase === 'independent_primary')) return true;
    if (e.phase === 'general' && phase === 'general') return true;
    return false;
  });
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rng.next() * total;
  for (const ev of pool) {
    roll -= ev.weight;
    if (roll <= 0) return ev;
  }
  return pool[0] ?? null;
}

export function endWeek(state) {
  const rng = weekRng(state, 77);
  const summaries = resolveQueuedActions(state);

  state.resources.cash -= state.weeklyBurn;
  state.statsRecap.cashSpent += state.weeklyBurn;

  const event = pickWeeklyEvent(state, rng);
  if (event?.effects?.debateCheck) {
    const perf = state.debateBuff + state.candidate.stats.debate / 10 + rng.int(-2, 4);
    const delta = perf >= 10 ? 4 : perf >= 6 ? 1 : -3;
    state.resources.approval = clamp(state.resources.approval + delta, 10, 72);
    state.resources.momentum = clamp(state.resources.momentum + delta, 0, 30);
    pushNews(state, `Debate night: ${delta >= 2 ? 'pundits score a win' : delta < 0 ? 'rough night on stage' : 'split screen'}`.trim(), {
      approval: delta
    });
  } else if (event?.choices) {
    state.pendingEvent = { ...event, picked: false };
    pushNews(state, event.text);
    return { ok: true, lines: summaries, needsChoice: true };
  } else if (event) {
    applyEventEffects(state, event.effects ?? {}, rng);
    pushNews(state, event.text);
  }

  for (const rival of state.rivals) {
    if (rival.alive) rivalWeeklyTick(rival, rng, state.resources.momentum);
  }

  if (state.week < 26 && state.candidate.party !== 'I') {
    accruePrimaryDelegates(state, rng);
  }

  if (state.week === TUNING.generalStart) {
    ensureGeneralOpponent(state);
    pushNews(state, `General election: ${state.generalOpponent?.name} (${state.generalOpponent?.partyLabel}) wins rival nod.`);
  }

  syncStateSupportFromNational(state);

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
  applyEventEffects(state, choice.effects ?? {}, rng);
  pushNews(state, `${ev.text} → ${choice.label}`);
  state.pendingEvent = null;
  return finishWeekAdvance(state, rng, []);
}

/** Advance calendar after a week is fully resolved (including post-choice). */
export function finishWeekAdvance(state, rng, summaries = []) {
  const phase = derivePhase(state.week, state.candidate.party);

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
      pushNews(state, `Ballot check cleared — ${ev} electoral votes (access path open).`);
      state.nomineeWonPrimary = true;
    } else {
      const prim = resolvePrimaryWeek(state, rng);
      if (!prim.won) {
        gameOverPrimary(state, prim.winner);
        return { ok: true, gameOver: true, primary: prim };
      }
      state.nomineeWonPrimary = true;
      pushNews(state, `Primary season: ${state.candidate.name} wins the nomination.`);
    }
  }

  if (state.week === 26 && state.nomineeWonPrimary) {
    startConventionPrep(state);
  }

  if (state.week === TUNING.electionNightWeek) {
    const night = simulateElectionNight(state, rng);
    state.election = night;
    resetWeekPlan(state);
    return { ok: true, electionNight: true, lines: summaries };
  }

  state.history.push({
    week: state.week,
    approval: nationalApproval(state),
    cash: state.resources.cash,
    momentum: state.resources.momentum
  });

  state.week += 1;
  resetWeekPlan(state);
  pushNews(state, `— Week ${state.week} begins — AP points refresh.`);
  return { ok: true, lines: summaries };
}

function applyEventEffects(state, effects, rng) {
  const r = state.resources;
  if (effects.approval) r.approval = clamp(r.approval + effects.approval, 10, 72);
  if (effects.base) r.base = clamp(r.base + effects.base, 10, 85);
  if (effects.buzz) r.momentum = clamp(r.momentum + Math.round(effects.buzz / 2), 0, 30);
  if (effects.cash) {
    r.cash += effects.cash;
    if (effects.cash > 0) state.statsRecap.cashRaised += effects.cash;
    else state.statsRecap.cashSpent -= effects.cash;
  }
  if (effects.energy) r.energy = clamp(r.energy + effects.energy, 0, TUNING.energyMax);
  if (effects.momentum) r.momentum = clamp(r.momentum + effects.momentum, 0, 30);
}

function syncStateSupportFromNational(state) {
  const nat = nationalApproval(state);
  const drift = (nat - 48) / 40;
  const rng = weekRng(state, 12);
  for (const st of STATES) {
    const cur = state.stateSupport[st.id] ?? 40;
  const noise = rng.int(-1, 1);
    state.stateSupport[st.id] = clamp(cur + drift + noise, 22, 76);
  }
}

export function resolveEventDebateOnly(state) {
  /* handled in endWeek */
}
