import { randomInt } from './utils.js';

/**
 * Optional season twists — announce at week start; resolve on live nights without skipping eviction.
 */

export function initTwistSchedule(state) {
  if (state.mvpTwistEnabled && state.mvpTwistScheduledWeek == null) {
    state.mvpTwistScheduledWeek = randomInt(5, 9);
  }
}

export function trackFirstEvicted(state, evicted) {
  if (!state.battleBackEnabled || state.firstEvictedId || !evicted || evicted.isJuror) return;
  state.firstEvictedId = evicted.id;
  state.battleBackScheduledWeek = Math.max(4, state.week + 3);
}

export function evaluateTwistsForNewWeek(state) {
  state.battleBackWeekActive = false;
  state.mvpTwistWeekActive = false;
  state.battleBackResolvedTonight = false;

  if (
    state.battleBackEnabled
    && !state.battleBackSeasonUsed
    && state.firstEvictedId
    && state.battleBackScheduledWeek != null
    && state.week === state.battleBackScheduledWeek
  ) {
    const first = state.getContestant(state.firstEvictedId);
    if (first?.evicted && !first.isJuror) {
      state.battleBackWeekActive = true;
    }
  }

  if (
    state.mvpTwistEnabled
    && !state.mvpTwistSeasonUsed
    && state.mvpTwistScheduledWeek != null
    && state.week === state.mvpTwistScheduledWeek
  ) {
    state.mvpTwistWeekActive = true;
    crownMvp(state);
  }
}

function crownMvp(state) {
  const actives = state.getActiveContestants();
  if (actives.length === 0) return;

  let best = actives[0];
  let bestScore = -Infinity;
  for (const c of actives) {
    const score = c.competition * 1.2 + c.social + randomInt(0, 25);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  state.mvpHolderId = best.id;
  state.mvpPowerAvailable = true;
  state.mvpTwistSeasonUsed = true;
}

/**
 * @returns {{ results: object[], reentered: import('./Contestant.js').Contestant|null }}
 */
export function runBattleBack(state) {
  const results = [];
  const first = state.getContestant(state.firstEvictedId);

  results.push({
    type: 'drama',
    text: '<strong>Battle Back Twist</strong> — Evicted houseguests face off; one winner re-enters before tonight’s eviction.'
  });

  if (!first || !first.evicted || first.isJuror) {
    results.push({
      type: 'system',
      text: 'No eligible first boot for Battle Back. Tonight’s eviction proceeds as scheduled.'
    });
    return { results, reentered: null };
  }

  const pool = state.contestants.filter((c) => c.evicted && !c.isJuror);
  if (!pool.some((c) => c.id === first.id)) {
    pool.unshift(first);
  }

  const competitors = pool.slice(0, Math.min(4, pool.length));
  const scores = new Map();
  for (const c of competitors) {
    const base = c.competition + c.social * 0.5;
    scores.set(c.id, base + randomInt(0, 40));
  }

  for (const c of competitors) {
    results.push({
      type: 'narrative',
      text: `${c.name} posts a Battle Back score of ${Math.round(scores.get(c.id))}.`
    });
  }

  let winner = competitors[0];
  let best = scores.get(winner.id) ?? 0;
  for (const c of competitors) {
    const s = scores.get(c.id) ?? 0;
    if (s > best) {
      best = s;
      winner = c;
    }
  }

  results.push({
    type: 'success',
    text: `<strong>${winner.name}</strong> wins the Battle Back!`
  });

  if (winner.id !== first.id) {
    results.push({
      type: 'narrative',
      text: `The season’s first evictee (${first.name}) falls short — ${winner.name} returns to the house instead.`
    });
  }

  winner.evicted = false;
  winner.isJuror = false;
  winner.evictedWeek = null;
  winner.isNominated = false;
  winner.isHOH = false;
  winner.hasVeto = false;

  results.push({
    type: 'drama',
    text: `${winner.name} is back in the game. Eviction night continues with ${state.getActiveContestants().length} houseguests.`
  });

  state.battleBackSeasonUsed = true;
  state.battleBackWeekActive = false;

  return { results, reentered: winner };
}

export function getTwistWeekAnnouncements(state) {
  const lines = [];
  if (state.doubleEvictionWeekActive) {
    lines.push({
      type: 'warning',
      text: '<strong>Double Eviction week</strong> — Thursday features two eviction votes with a full power cycle between them. Use <strong>Continue</strong> after each live event.'
    });
  }
  if (state.battleBackWeekActive) {
    const first = state.getContestant(state.firstEvictedId);
    const name = first?.name ?? 'the first boot';
    lines.push({
      type: 'warning',
      text: `<strong>Battle Back week</strong> — Before tonight’s vote, evicted players compete. ${name} (and other pre-jury boots) can fight to re-enter.`
    });
  }
  if (state.mvpTwistWeekActive && state.mvpPowerAvailable) {
    const holder = state.getContestant(state.mvpHolderId);
    const holderName = holder?.name ?? 'an houseguest';
    lines.push({
      type: 'warning',
      text: `<strong>MVP twist week</strong> — ${holderName} holds a one-time <strong>double eviction vote</strong> this week.`
    });
  }
  return lines;
}

export function getTwistRulesBanner(state) {
  const parts = [];
  if (state.doubleEvictionWeekActive || state.doubleEvictionAwaitingRound2 || state.doubleEvictionRound2Cycle) {
    parts.push('Double eviction active');
  }
  if (state.battleBackWeekActive) {
    parts.push('Battle Back tonight');
  }
  if (state.mvpTwistWeekActive && state.mvpPowerAvailable) {
    const holder = state.getContestant(state.mvpHolderId);
    parts.push(holder ? `MVP: ${holder.name} (2× vote)` : 'MVP twist active');
  }
  return parts.join(' · ');
}
