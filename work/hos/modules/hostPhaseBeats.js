import { PHASES, PHASE_LABELS, WEEKDAYS } from './GameState.js';
import { getLocalNominationHostBeat } from './hohNomPersonas.js';
import { getOriginalBlockLabel } from './vetoCeremonySummary.js';
import { pickRandom } from './utils.js';

/** Prompt kinds sent to NarrativeApi / Lambda. */
export const HOST_PHASE_PRE_KIND = {
  [PHASES.COMPETITION]: 'hoh_competition',
  [PHASES.NOMINATION]: 'nomination_pre_ceremony',
  [PHASES.VETO_COMP]: 'veto_competition',
  [PHASES.VETO_CEREMONY]: 'veto_ceremony_pre',
  [PHASES.VETO]: 'veto_ceremony_pre',
  [PHASES.EVICTION]: 'eviction_pre'
};

export const HOST_BEAT_LABELS = {
  premiere_move_in: 'Season premiere',
  hoh_competition: 'HOH comp (pre)',
  hoh_competition_result: 'HOH crowned',
  nomination_pre_ceremony: 'Nominations (pre)',
  nomination_ceremony: 'Nomination ceremony',
  veto_competition: 'POV comp (pre)',
  veto_competition_result: 'POV winner',
  veto_ceremony_pre: 'Veto meeting (pre)',
  veto_ceremony: 'Veto decision',
  eviction_pre: 'Eviction (pre)',
  eviction_ceremony: 'Eviction',
  finale_live: 'Finale',
  host_line: 'Host',
  daily_beat: 'Daily',
  week_recap: 'Week recap'
};

/**
 * @param {string} phase
 */
export function getHostBeatKindForPhase(phase) {
  if (phase in HOST_PHASE_PRE_KIND) {
    return HOST_PHASE_PRE_KIND[phase];
  }
  return 'host_line';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getNextHostEventPreview(state) {
  if (state.inFinale) {
    return {
      kind: 'finale_live',
      label: 'Finale sequence',
      today: state.finaleAwaitingStep != null
    };
  }

  if (state.isScheduledHouseEventDay() && !state.houseEventComplete) {
    return {
      kind: getHostBeatKindForPhase(state.phase),
      label: PHASE_LABELS[state.phase] || state.phase,
      today: true
    };
  }

  const weekdayPhase = {
    0: PHASES.COMPETITION,
    1: PHASES.NOMINATION,
    2: PHASES.VETO_COMP,
    3: PHASES.VETO_CEREMONY,
    6: PHASES.EVICTION
  };
  const idx = state.weekdayIndex;
  for (let wi = idx + 1; wi <= 6; wi += 1) {
    const mapped = weekdayPhase[wi];
    if (!mapped) continue;
    return {
      kind: getHostBeatKindForPhase(mapped),
      label: PHASE_LABELS[mapped],
      day: WEEKDAYS[wi]
    };
  }

  return {
    kind: HOST_PHASE_PRE_KIND[PHASES.COMPETITION],
    label: PHASE_LABELS[PHASES.COMPETITION],
    day: 'Friday',
    nextWeek: true
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getHostScheduleBanner(state) {
  if (state.gameOver) return '';
  const preview = getNextHostEventPreview(state);
  if (preview.today) {
    return `Host · live — ${preview.label}`;
  }
  if (preview.nextWeek) {
    return `Host · next week ${preview.day} — ${preview.label}`;
  }
  if (preview.day) {
    return `Host · ${preview.day} — ${preview.label}`;
  }
  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {string} kind
 * @param {'api' | 'local'} source
 */
export function recordHostBeat(state, kind, source = 'local') {
  if (!state.hostBeatLog) state.hostBeatLog = [];
  state.hostBeatLog.push({
    week: state.week,
    day: state.day,
    phase: state.phase,
    kind,
    source
  });
  if (state.hostBeatLog.length > 20) {
    state.hostBeatLog = state.hostBeatLog.slice(-20);
  }
  state.lastHostBeatKind = kind;
  state.lastHostBeatSource = source;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildHostBeatIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const items = [];
  const preview = getNextHostEventPreview(state);

  if (preview.today) {
    items.push({
      key: 'host-live',
      name: 'Live now',
      detail: `${preview.label} — host beat plays when the event starts.`
    });
  } else if (preview.day) {
    const weekBit = preview.nextWeek ? ' (next week)' : '';
    items.push({
      key: 'host-next',
      name: 'Next live event',
      detail: `${preview.day}${weekBit} · ${preview.label}`
    });
  }

  const last = state.hostBeatLog?.[state.hostBeatLog.length - 1];
  if (last) {
    const dayName = WEEKDAYS[last.day - 1] || `Day ${last.day}`;
    items.push({
      key: 'host-last',
      name: 'Last host beat',
      detail: `${HOST_BEAT_LABELS[last.kind] || last.kind} · W${last.week} ${dayName} (${last.source})`
    });
  }

  const recent = (state.hostBeatLog || []).slice(-3).reverse();
  for (const row of recent) {
    if (row === last) continue;
    items.push({
      key: `host-log-${row.week}-${row.day}-${row.kind}`,
      name: HOST_BEAT_LABELS[row.kind] || row.kind,
      detail: `Week ${row.week} · ${row.source}`
    });
  }

  if (!items.length) return null;

  return {
    id: 'host-schedule',
    title: 'Host & live nights',
    tone: preview.today ? 'active' : 'neutral',
    items: items.slice(0, 6)
  };
}

/**
 * @param {string} text
 */
export function formatHostFeedEntry(text, kind = null) {
  const entry = {
    type: 'ai-host',
    text: `<strong>Host:</strong> ${text}`
  };
  if (kind) entry.hostBeatKind = kind;
  return entry;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
function twistHostFlavor(state) {
  const parts = [];
  if (state.doubleEvictionWeekActive) parts.push('double eviction');
  if (state.battleBackWeekActive && !state.battleBackResolvedTonight) {
    parts.push('Battle Back');
  }
  if (state.mvpTwistWeekActive && state.mvpRaceOpen) parts.push('MVP race');
  return parts.length ? ` (${parts.join(' · ')})` : '';
}

/**
 * Local Julie-style beats when the narrate API is off or fails.
 * @param {string} kind
 * @param {import('./GameState.js').GameState} state
 * @param {{ hoh?: import('./Contestant.js').Contestant, nominees?: import('./Contestant.js').Contestant[], winner?: import('./Contestant.js').Contestant, evicted?: import('./Contestant.js').Contestant | null }} [extra]
 */
export function getLocalHostPhaseBeat(kind, state, extra = {}) {
  const active = state.getActiveContestants();
  const hoh = extra.hoh || active.find((c) => c.isHOH);
  const player = state.getPlayer();
  const nominees = extra.nominees?.length
    ? extra.nominees
    : state.nominees.map((id) => state.getContestant(id)).filter(Boolean);
  const winner =
    extra.winner ||
    (state.competitionWinner
      ? typeof state.competitionWinner === 'string'
        ? state.getContestant(state.competitionWinner)
        : state.competitionWinner
      : null);
  const evicted = extra.evicted ?? null;
  const vetoHolder = state.vetoHolderId
    ? state.getContestant(state.vetoHolderId)
    : null;
  const block = getOriginalBlockLabel(state);
  const twist = twistHostFlavor(state);
  const count = active.length;

  switch (kind) {
    case 'premiere_move_in':
      return formatHostFeedEntry(
        pickRandom([
          `Welcome to the House of Strategy — ${count} houseguests, one winner. Let's meet the cast.`,
          `The doors are open! ${count} players just moved in — alliances start tonight.`,
          `Season premiere: ${count} strangers, one grand prize. The game starts now.`
        ]),
        kind
      );
    case 'hoh_competition':
      return formatHostFeedEntry(
        pickRandom([
          `Head of Household is live${twist} — one winner controls the week.`,
          `The HOH competition begins${twist}. Safety is on the line.`,
          `Houseguests, strap in — whoever wins HOH holds the keys tonight.`
        ]),
        kind
      );
    case 'hoh_competition_result':
      if (!winner) return null;
      if (winner.isPlayer) {
        return formatHostFeedEntry(
          `Congratulations — you are the new Head of Household! The house is officially afraid.`,
          kind
        );
      }
      return formatHostFeedEntry(
        pickRandom([
          `${winner.name} takes the keys! A new Head of Household is crowned.`,
          `${winner.name} wins HOH — the power shift is real.`,
          `And the new HOH is… ${winner.name}!`
        ]),
        kind
      );
    case 'nomination_pre_ceremony':
      if (!hoh) {
        return formatHostFeedEntry(
          `The nomination ceremony is about to begin${twist} — the block could change everything.`,
          kind
        );
      }
      return formatHostFeedEntry(
        `${hoh.name} has the power — nomination ceremony starts now.`,
        kind
      );
    case 'nomination_ceremony': {
      const local = getLocalNominationHostBeat(hoh, nominees);
      if (local) {
        local.hostBeatKind = kind;
        return local;
      }
      return null;
    }
    case 'veto_competition':
      return formatHostFeedEntry(
        pickRandom([
          `Power of Veto night${twist} — six compete, one walks away with golden safety.`,
          `The veto competition is on! A single win can blow up the block.`,
          `It's POV time — nominees are praying someone else wins this.`
        ]),
        kind
      );
    case 'veto_competition_result':
      if (!vetoHolder) {
        return formatHostFeedEntry(
          `The veto competition is over — the house holds its breath.`,
          kind
        );
      }
      if (vetoHolder.isPlayer) {
        return formatHostFeedEntry(
          `You won the Power of Veto! The house knows you hold a grenade.`,
          kind
        );
      }
      return formatHostFeedEntry(
        `${vetoHolder.name} is holding the Power of Veto.`,
        kind
      );
    case 'veto_ceremony_pre':
      return formatHostFeedEntry(
        block
          ? `Veto meeting — ${block} are on the block and the veto could flip the script.`
          : `The veto meeting is live — will someone save the block?`,
        kind
      );
    case 'veto_ceremony': {
      if (state.vetoUsed && state.vetoSavedNomineeId) {
        const saved = state.getContestant(state.vetoSavedNomineeId);
        return formatHostFeedEntry(
          saved
            ? `The veto comes off the chain — ${saved.name} is saved!`
            : 'The veto was used — the block is shifting.',
          kind
        );
      }
      return formatHostFeedEntry(
        'The veto is not used — tonight\'s nominees stay on the block.',
        kind
      );
    }
    case 'eviction_pre': {
      const names = nominees.map((n) => n.name);
      const de = state.doubleEvictionWeekActive ? ' Double eviction — two may leave tonight.' : '';
      const bb =
        state.battleBackWeekActive && !state.battleBackResolvedTonight
          ? ' Battle Back twist in play.'
          : '';
      return formatHostFeedEntry(
        names.length >= 2
          ? `Live eviction — ${names.join(' and ')} are fighting to stay.${de}${bb}`
          : `Eviction night is here — someone is going home.${de}${bb}`,
        kind
      );
    }
    case 'eviction_ceremony':
      if (!evicted) return null;
      if (evicted.isPlayer) {
        return formatHostFeedEntry(
          'Your game is over — you have been evicted from the House of Strategy.',
          kind
        );
      }
      return formatHostFeedEntry(
        `${evicted.name}, you are evicted from the House of Strategy.`,
        kind
      );
    case 'finale_live':
      return formatHostFeedEntry(
        'Welcome to finale night — jurors, prepare your questions.',
        kind
      );
    case 'host_line':
      return formatHostFeedEntry(
        `${PHASE_LABELS[state.phase] || 'The house'} — let's get to it.`,
        kind
      );
    default:
      return null;
  }
}
