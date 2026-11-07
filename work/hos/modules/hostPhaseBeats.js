import { PHASES, PHASE_LABELS } from './GameState.js';
import { getLocalNominationHostBeat } from './hohNomPersonas.js';
import { getOriginalBlockLabel } from './vetoCeremonySummary.js';

/** Prompt kinds sent to NarrativeApi / Lambda. */
export const HOST_PHASE_PRE_KIND = {
  [PHASES.COMPETITION]: 'hoh_competition',
  [PHASES.NOMINATION]: 'nomination_pre_ceremony',
  [PHASES.VETO_COMP]: 'veto_competition',
  [PHASES.VETO_CEREMONY]: 'veto_ceremony_pre',
  [PHASES.VETO]: 'veto_ceremony_pre',
  [PHASES.EVICTION]: 'eviction_pre'
};

/**
 * @param {string} phase
 */
export function getHostBeatKindForPhase(phase) {
  return HOST_PHASE_PRE_KIND[phase] || 'host_line';
}

/**
 * @param {string} text
 */
export function formatHostFeedEntry(text) {
  return {
    type: 'ai-host',
    text: `<strong>Host:</strong> ${text}`
  };
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

  switch (kind) {
    case 'hoh_competition':
      return formatHostFeedEntry(
        `Houseguests, ${PHASE_LABELS[PHASES.COMPETITION] || 'HOH'} is live — one reign could reset the entire week.`
      );
    case 'hoh_competition_result':
      if (!winner) return null;
      return formatHostFeedEntry(
        `${winner.name} takes the keys! A new Head of Household is crowned.`
      );
    case 'nomination_pre_ceremony':
      if (!hoh) {
        return formatHostFeedEntry(
          'The nomination ceremony is about to begin — the block could change everything.'
        );
      }
      return formatHostFeedEntry(
        `${hoh.name} has the power — the nomination ceremony starts now.`
      );
    case 'nomination_ceremony': {
      const local = getLocalNominationHostBeat(hoh, nominees);
      return local || null;
    }
    case 'veto_competition':
      return formatHostFeedEntry(
        `It's Power of Veto night — six will compete, but only one walks away with the golden veto.`
      );
    case 'veto_competition_result':
      if (!vetoHolder) {
        return formatHostFeedEntry('The veto competition is over — chaos in the house.');
      }
      return formatHostFeedEntry(
        `${vetoHolder.name} is holding the Power of Veto.`
      );
    case 'veto_ceremony_pre':
      return formatHostFeedEntry(
        block
          ? `Veto meeting — ${block} are on the block and the veto could flip the script.`
          : 'The veto meeting is live — will someone save the block?'
      );
    case 'veto_ceremony': {
      if (state.vetoUsed && state.vetoSavedNomineeId) {
        const saved = state.getContestant(state.vetoSavedNomineeId);
        return formatHostFeedEntry(
          saved
            ? `The veto comes off the chain — ${saved.name} is saved!`
            : 'The veto was used — the block is shifting.'
        );
      }
      return formatHostFeedEntry(
        'The veto is not used — tonight\'s nominees stay on the block.'
      );
    }
    case 'eviction_pre': {
      const names = nominees.map((n) => n.name);
      const de = state.doubleEvictionWeekActive ? ' Double eviction — two may leave tonight.' : '';
      return formatHostFeedEntry(
        names.length >= 2
          ? `Live eviction — ${names.join(' and ')} are fighting to stay.${de}`
          : `Eviction night is here — someone is going home.${de}`
      );
    }
    case 'eviction_ceremony':
      if (!evicted) return null;
      return formatHostFeedEntry(
        `${evicted.name}, you are evicted from the House of Strategy.`
      );
    case 'host_line':
      return formatHostFeedEntry(
        `${PHASE_LABELS[state.phase] || 'The house'} — let's get to it.`
      );
    default:
      return null;
  }
}
