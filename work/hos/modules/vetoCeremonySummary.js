/**
 * Player-facing veto ceremony recap for the story feed.
 */

/**
 * @param {import('./GameState.js').GameState} state
 */
function formatFinalBlock(state) {
  const names = state
    .getActiveNominees()
    .map((n) => n.name)
    .filter(Boolean);
  if (!names.length) return 'no active nominees';
  return names.map((n) => `<strong>${escapeName(n)}</strong>`).join(' and ');
}

function escapeName(name) {
  return String(name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {{
 *   vetoWinner?: import('./Contestant.js').Contestant | null,
 *   savedNominee?: import('./Contestant.js').Contestant | null,
 *   replacement?: import('./Contestant.js').Contestant | null,
 *   vetoUsed: boolean
 * }} opts
 */
export function buildVetoCeremonySummaryEntry(state, opts) {
  const vetoWinner = opts.vetoWinner
    ?? (state.vetoHolderId ? state.getContestant(state.vetoHolderId) : null);
  const block = formatFinalBlock(state);
  const holder = escapeName(vetoWinner?.name ?? 'Veto holder');

  if (!opts.vetoUsed) {
    return {
      type: 'veto-summary',
      text: `<span class="veto-summary-label">Veto recap</span> · ${holder} did not use the veto · Final block: ${block}.`
    };
  }

  const saved = opts.savedNominee
    ?? (state.vetoSavedNomineeId ? state.getContestant(state.vetoSavedNomineeId) : null);
  const savedName = escapeName(saved?.name ?? 'a nominee');

  if (opts.replacement) {
    const replName = escapeName(opts.replacement.name);
    return {
      type: 'veto-summary',
      text: `<span class="veto-summary-label">Veto recap</span> · ${holder} saved <strong>${savedName}</strong> → HOH replaced with <strong>${replName}</strong> · Final block: ${block}.`
    };
  }

  return {
    type: 'veto-summary',
    text: `<span class="veto-summary-label">Veto recap</span> · ${holder} saved <strong>${savedName}</strong> · Final block: ${block}.`
  };
}

/**
 * @param {object[]} results
 * @param {import('./GameState.js').GameState} state
 * @param {Parameters<typeof buildVetoCeremonySummaryEntry>[1]} opts
 */
export function appendVetoCeremonySummary(results, state, opts) {
  results.push(buildVetoCeremonySummaryEntry(state, opts));
  state.vetoSavedNomineeId = null;
}
