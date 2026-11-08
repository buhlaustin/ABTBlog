import { PHASES } from './GameState.js';

/**
 * Snapshot Saturday nominees for recap copy (cleared on new week).
 * @param {import('./GameState.js').GameState} state
 */
export function snapshotVetoWeekBlock(state) {
  if (!state.nominees?.length) return;
  state.vetoWeekBlockSnapshot = state.nominees.slice();
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getOriginalBlockLabel(state, { html = false } = {}) {
  const ids = state.vetoWeekBlockSnapshot?.length
    ? state.vetoWeekBlockSnapshot
    : state.nominees;
  const names = ids
    .map((id) => state.getContestant(id)?.name)
    .filter(Boolean);
  if (!names.length) return '';
  if (html) {
    return names.map((n) => `<strong>${escapeName(n)}</strong>`).join(' and ');
  }
  return names.join(' and ');
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildVetoBlockBanner(state) {
  const phase = state.phase;
  const vetoPhases = [PHASES.VETO_COMP, PHASES.VETO_CEREMONY, PHASES.VETO, PHASES.EVICTION];
  if (!vetoPhases.includes(phase)) return '';

  const active = state.getActiveNominees();
  const holder = state.vetoHolderId ? state.getContestant(state.vetoHolderId) : null;

  if (state.vetoUsed && state.vetoSavedNomineeId) {
    const saved = state.getContestant(state.vetoSavedNomineeId);
    const onBlock = active.map((n) => n.name);
    const pending = active.length < 2 && saved && !saved.isNominated;
    if (pending) {
      return `Veto used on ${saved.name} · HOH must name a replacement · On block: ${onBlock.join(', ') || '—'}`;
    }
  }

  if (!active.length) return '';

  const names = active.map((n) => n.name).join(' and ');
  let line = `On the block: ${names}`;
  if (holder) line += ` · Veto: ${holder.name}`;
  if (state.vetoUsed) line += ' · Veto used';
  else if (phase === PHASES.VETO_CEREMONY || phase === PHASES.VETO) line += ' · Veto meeting live';
  return line;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildVetoBlockIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  /** @type {{ key: string, name: string, detail: string }[]} */
  const items = [];

  const orig = getOriginalBlockLabel(state);
  const active = state.getActiveNominees();
  if (orig && active.length) {
    items.push({
      key: 'veto-block-orig',
      name: 'Original noms',
      detail: orig
    });
    items.push({
      key: 'veto-block-now',
      name: 'Current block',
      detail: active.map((n) => `${n.name} (${n.threat} threat)`).join(' · ')
    });
  }

  const holder = state.vetoHolderId ? state.getContestant(state.vetoHolderId) : null;
  if (holder) {
    items.push({
      key: 'veto-holder',
      name: 'Veto holder',
      detail: holder.name + (holder.isPlayer ? ' (you)' : '')
    });
  }

  if (state.lastVetoRecapText && state.lastVetoRecapWeek === state.week) {
    items.push({
      key: 'veto-recap',
      name: 'Last veto recap',
      detail: state.lastVetoRecapText
    });
  }

  if (!items.length) return null;

  return {
    id: 'veto-week',
    title: 'Veto week',
    tone: 'neutral',
    items
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildVetoBlockOutlook(state) {
  const banner = buildVetoBlockBanner(state);
  if (!banner) return { visible: false };

  const active = state.getActiveNominees();
  return {
    visible: true,
    banner,
    nomineeNames: active.map((n) => n.name),
    vetoHolder: state.vetoHolderId
      ? state.getContestant(state.vetoHolderId)?.name ?? null
      : null,
    vetoUsed: Boolean(state.vetoUsed),
    awaitingReplacement: Boolean(
      state.vetoUsed
      && state.vetoSavedNomineeId
      && active.length < 2
    )
  };
}

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

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
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
  const origBlock = getOriginalBlockLabel(state, { html: true });
  const origPrefix = origBlock ? `Week started <strong>${origBlock}</strong> → ` : '';

  if (!opts.vetoUsed) {
    return {
      type: 'veto-summary',
      text: `<span class="veto-summary-label">Veto recap</span> · ${origPrefix}${holder} did not use the veto · Final block: ${block}.`
    };
  }

  const saved = opts.savedNominee
    ?? (state.vetoSavedNomineeId ? state.getContestant(state.vetoSavedNomineeId) : null);
  const savedName = escapeName(saved?.name ?? 'a nominee');

  if (opts.replacement) {
    const replName = escapeName(opts.replacement.name);
    return {
      type: 'veto-summary',
      text: `<span class="veto-summary-label">Veto recap</span> · ${origPrefix}${holder} saved <strong>${savedName}</strong> → HOH replaced with <strong>${replName}</strong> · Final block: ${block}.`
    };
  }

  return {
    type: 'veto-summary',
    text: `<span class="veto-summary-label">Veto recap</span> · ${origPrefix}${holder} saved <strong>${savedName}</strong> · Final block: ${block}.`
  };
}

/**
 * @param {object[]} results
 * @param {import('./GameState.js').GameState} state
 * @param {Parameters<typeof buildVetoCeremonySummaryEntry>[1]} opts
 */
export function appendVetoCeremonySummary(results, state, opts) {
  const entry = buildVetoCeremonySummaryEntry(state, opts);
  results.push(entry);
  state.lastVetoRecapText = stripTags(entry.text);
  state.lastVetoRecapWeek = state.week;
  const holder = opts.vetoWinner
    ?? (state.vetoHolderId ? state.getContestant(state.vetoHolderId) : null);
  state.addHistory({
    type: 'veto_ceremony',
    holderId: holder?.id ?? null,
    vetoUsed: Boolean(opts.vetoUsed),
    savedId: opts.savedNominee?.id ?? null,
    replacementId: opts.replacement?.id ?? null,
    powerRound: state.doubleEvictionRound > 1 ? 2 : 1
  });
  state.vetoSavedNomineeId = null;
}

/**
 * Plain line for replacement picker header.
 * @param {import('./GameState.js').GameState} state
 */
export function describePendingVetoReplacement(state) {
  if (!state.vetoSavedNomineeId) return '';
  const saved = state.getContestant(state.vetoSavedNomineeId);
  if (!saved) return '';
  const remaining = state.getActiveNominees().map((n) => n.name).join(' and ');
  return `Veto saved <strong>${escapeName(saved.name)}</strong> — pick who joins ${remaining || 'the block'} for eviction.`;
}
