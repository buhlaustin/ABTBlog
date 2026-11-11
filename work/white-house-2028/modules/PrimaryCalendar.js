import { PRIMARY_SCHEDULE, getState } from './Data.js';
import { pushNews } from './GameState.js';

export function statesVotingThisWeek(week) {
  const row = PRIMARY_SCHEDULE.find((r) => r.week === week);
  return row?.states ?? [];
}

/** Weekly primary contests — award delegates before the week-26 finale. */
export function resolveWeeklyPrimaries(state, rng) {
  if (state.candidate.party === 'I') return null;
  const voting = statesVotingThisWeek(state.week);
  if (!voting.length) return null;

  const lines = [];
  let playerDel = 0;

  for (const id of voting) {
    const st = getState(id);
    if (!st) continue;
    const playerScore =
      (state.stateSupport[id] ?? 40) +
      (id === state.candidate.homeState ? 5 : 0) +
      (state.resources.momentum ?? 0) * 0.25 +
      rng.int(0, 6);
    let bestRival = null;
    let best = -1;
    for (const r of state.rivals) {
      const score = r.approval + rng.int(0, 8);
      if (score > best) {
        best = score;
        bestRival = r;
      }
    }
    const del = Math.max(2, Math.round(st.ev * 0.22));
    if (playerScore >= best) {
      playerDel += del;
      state.delegates = (state.delegates ?? 0) + del;
      lines.push(`${st.name}: you +${del}`);
    } else {
      bestRival.delegates = (bestRival.delegates ?? 0) + del;
      lines.push(`${st.name}: ${bestRival.name} +${del}`);
    }
  }

  if (lines.length) {
    pushNews(state, `Primary calendar: ${lines.join('; ')}.`, { delegates: playerDel });
  }
  return { playerDel, voting };
}
