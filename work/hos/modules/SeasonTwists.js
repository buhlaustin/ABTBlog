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
  state.mvpCampaignedToday = false;

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
    state.mvpRaceOpen = true;
    state.mvpCampaignPoints = {};
    state.mvpHolderId = null;
    state.mvpPowerAvailable = false;
  }
}

export function tickMvpCampaignAI(state) {
  if (!state.mvpRaceOpen || state.mvpHolderId) return [];
  const lines = [];
  const actives = state.getActiveContestants().filter((c) => !c.isPlayer);
  const picks = actives.sort(() => Math.random() - 0.5).slice(0, Math.min(3, actives.length));
  for (const c of picks) {
    const pts = randomInt(4, 12) + Math.floor(c.social / 8);
    addMvpCampaignPoints(state, c.id, pts);
    lines.push({
      type: 'narrative',
      text: `${c.name} works the house on MVP talk (+${pts} support).`
    });
  }
  return lines;
}

export function addMvpCampaignPoints(state, contestantId, points) {
  if (!state.mvpCampaignPoints) state.mvpCampaignPoints = {};
  state.mvpCampaignPoints[contestantId] = (state.mvpCampaignPoints[contestantId] || 0) + points;
}

/**
 * Crowns MVP from campaign totals among active houseguests.
 * @returns {object[]}
 */
export function finalizeMvpRace(state) {
  const results = [];
  if (!state.mvpTwistWeekActive || !state.mvpRaceOpen || state.mvpHolderId) {
    return results;
  }

  const actives = state.getActiveContestants();
  if (actives.length === 0) {
    state.mvpRaceOpen = false;
    return results;
  }

  let best = actives[0];
  let bestPts = state.mvpCampaignPoints[best.id] || 0;
  for (const c of actives) {
    const pts = state.mvpCampaignPoints[c.id] || 0;
    if (pts > bestPts) {
      bestPts = pts;
      best = c;
    } else if (pts === bestPts && pts > 0) {
      const tieBreak = c.competition + c.social + randomInt(0, 10);
      const bestBreak = best.competition + best.social;
      if (tieBreak > bestBreak) best = c;
    }
  }

  if (bestPts === 0) {
    let fallback = actives[0];
    let bestScore = -Infinity;
    for (const c of actives) {
      const score = c.competition * 1.1 + c.social + randomInt(0, 15);
      if (score > bestScore) {
        bestScore = score;
        fallback = c;
      }
    }
    best = fallback;
    results.push({
      type: 'narrative',
      text: 'MVP support was quiet all week — the house gives the nod to whoever looked strongest in comps.'
    });
  } else {
    results.push({
      type: 'success',
      text: `<strong>${best.name}</strong> wins MVP with ${bestPts} campaign support.`
    });
  }

  state.mvpHolderId = best.id;
  state.mvpPowerAvailable = true;
  state.mvpRaceOpen = false;
  state.mvpTwistSeasonUsed = true;
  results.push({
    type: 'warning',
    text: `${best.name} holds a one-time <strong>double eviction vote</strong> tonight.`
  });
  return results;
}

export function getMvpRaceLeader(state) {
  if (!state.mvpRaceOpen) return null;
  const actives = state.getActiveContestants();
  let leader = null;
  let best = -1;
  for (const c of actives) {
    const pts = state.mvpCampaignPoints?.[c.id] || 0;
    if (pts > best) {
      best = pts;
      leader = c;
    }
  }
  return leader && best > 0 ? { contestant: leader, points: best } : null;
}

/**
 * @returns {{ competitors: import('./Contestant.js').Contestant[], playerCompeting: boolean, results: object[] }|null}
 */
export function prepareBattleBack(state) {
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
    return { competitors: [], playerCompeting: false, results, skip: true };
  }

  const pool = state.contestants.filter((c) => c.evicted && !c.isJuror);
  if (!pool.some((c) => c.id === first.id)) {
    pool.unshift(first);
  }

  const competitors = pool.slice(0, Math.min(4, pool.length));
  const player = state.getPlayer();
  const playerCompeting = Boolean(player && competitors.some((c) => c.id === player.id));

  if (playerCompeting) {
    results.push({
      type: 'warning',
      text: 'You are in the Battle Back field — your competition result adds to your score before a winner is crowned.'
    });
  }

  return { competitors, playerCompeting, results, skip: false };
}

export function computeBattleBackScores(state, competitors, playerPerformanceBonus = 0) {
  const scores = new Map();
  for (const c of competitors) {
    let base = c.competition + c.social * 0.5 + randomInt(0, 40);
    if (c.isPlayer) {
      base += playerPerformanceBonus;
    }
    scores.set(c.id, base);
  }
  return scores;
}

/**
 * @returns {{ results: object[], reentered: import('./Contestant.js').Contestant|null }}
 */
export function resolveBattleBack(state, competitors, scores, introAlreadyLogged = false) {
  const results = [];
  const first = state.getContestant(state.firstEvictedId);

  if (!introAlreadyLogged) {
    results.push({
      type: 'drama',
      text: '<strong>Battle Back Twist</strong> — Evicted houseguests face off; one winner re-enters before tonight’s eviction.'
    });
  }

  if (!competitors.length) {
    return { results, reentered: null };
  }

  for (const c of competitors) {
    results.push({
      type: 'narrative',
      text: `${c.name} posts a Battle Back score of ${Math.round(scores.get(c.id) ?? 0)}.`
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

  if (first && winner.id !== first.id) {
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

/** @deprecated path — auto-resolves when no player in pool */
export function runBattleBack(state) {
  const prep = prepareBattleBack(state);
  if (prep.skip) {
    state.battleBackSeasonUsed = true;
    state.battleBackWeekActive = false;
    return { results: prep.results, reentered: null };
  }
  const scores = computeBattleBackScores(state, prep.competitors);
  const resolved = resolveBattleBack(state, prep.competitors, scores, true);
  return { results: [...prep.results, ...resolved.results], reentered: resolved.reentered };
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
      text: `<strong>Battle Back week</strong> — Before vote 1, pre-jury evictees compete (up to four). ${name} is the season’s first boot.${state.getPlayer()?.id === state.firstEvictedId ? ' <strong>You</strong> can play if you were evicted first.' : ''}`
    });
  }
  if (state.mvpTwistWeekActive && state.mvpRaceOpen) {
    lines.push({
      type: 'warning',
      text: '<strong>MVP twist week</strong> — Use <strong>Campaign for MVP</strong> in social phase (once per day). Most support earns a <strong>double eviction vote</strong> Thursday.'
    });
  } else if (state.mvpTwistWeekActive && state.mvpPowerAvailable) {
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
  if (state.mvpTwistWeekActive && state.mvpRaceOpen) {
    const lead = getMvpRaceLeader(state);
    parts.push(lead ? `MVP race: ${lead.contestant.name} leads` : 'MVP race — campaign this week');
  } else if (state.mvpTwistWeekActive && state.mvpPowerAvailable) {
    const holder = state.getContestant(state.mvpHolderId);
    parts.push(holder ? `MVP: ${holder.name} (2× vote)` : 'MVP twist active');
  }
  return parts.join(' · ');
}

export const TWIST_SETUP_RULES = [
  {
    id: 'double-eviction',
    title: 'Double eviction',
    body: 'Once per season when eight or fewer houseguests remain. Vote 1, pause with Continue, then Round 2 HOH → noms → POV → Vote 2 the same night.'
  },
  {
    id: 'twist-battle-back',
    title: 'Battle Back',
    body: '~3 weeks after the first pre-jury eviction. Up to four evicted players compete before Vote 1; one re-enters. If you were first boot, you play an interactive comp segment.'
  },
  {
    id: 'twist-mvp',
    title: 'MVP twist week',
    body: 'Hidden week between 5–9. Campaign in social phase (once/day); highest support gets one double eviction vote Thursday.'
  }
];
