import { STAGES } from './GameState.js';

const FOUNDER_AUTHORIZED = 10_000_000;

export function recalculateCapTablePercentages(capTable) {
  const total = capTable.reduce((s, r) => s + (r.shares ?? 0), 0);
  if (total <= 0) return capTable;
  for (const row of capTable) {
    row.pct = Math.round((row.shares / total) * 1000) / 10;
  }
  return capTable;
}

export function getFounderRow(state) {
  return state.capTable?.find((r) => r.id === 'founder');
}

/** Issue XC SAFE: +$500k cash, ~6% fully-diluted to XC holder. */
export function applyXCSafe(state) {
  if (state.flags?.xcAccepted) {
    return { ok: false, reason: 'Already accepted into X Combinator.' };
  }
  if (!state.flags?.xcUnlocked) {
    return { ok: false, reason: 'Reach $500k lifetime revenue to apply.' };
  }

  const founder = getFounderRow(state);
  const founderShares = founder?.shares ?? FOUNDER_AUTHORIZED;
  const xcShares = Math.round(founderShares * (0.06 / 0.94));

  state.finance.cash = (state.finance.cash ?? 0) + 500_000;
  if (!state.finance.instruments) state.finance.instruments = [];
  state.finance.instruments.push({
    type: 'safe',
    id: 'xc',
    label: 'X Combinator SAFE',
    amount: 500_000,
    cap: 8_000_000,
    discount: 0.2,
    estConversionPct: 6
  });

  const table = state.capTable.filter((r) => r.id !== 'xc');
  table.push({
    id: 'xc',
    name: 'X Combinator (SAFE)',
    shares: xcShares,
    class: 'investor'
  });
  state.capTable = recalculateCapTablePercentages(table);

  state.flags.xcAccepted = true;
  state.stage = STAGES.XC;
  state.finance.valuation = 8_000_000;
  return { ok: true, xcShares };
}

/**
 * Seed round: $3M on $15M post (~20% to seed investors) + 10% ESOP.
 * Requires XC acceptance.
 */
export function applySeedRound(state) {
  if (!state.flags?.xcAccepted) {
    return { ok: false, reason: 'Complete X Combinator acceptance first.' };
  }
  if (!state.flags?.xcResidencyComplete) {
    return { ok: false, reason: 'Finish the 3-month XC batch first.' };
  }
  if (!state.offices?.hubId) {
    return { ok: false, reason: 'Choose a permanent hub office first.' };
  }
  if (state.flags?.seedRoundClosed) {
    return { ok: false, reason: 'Seed round already closed.' };
  }

  const preMoney = 12_000_000;
  const postMoney = 15_000_000;
  const raised = 3_000_000;

  let rows = state.capTable.map((r) => ({ ...r }));
  const totalBefore = rows.reduce((s, r) => s + r.shares, 0);
  const seedShares = Math.round(totalBefore * (raised / (postMoney - raised)));
  rows.push({
    id: 'seed',
    name: 'Seed investors',
    shares: seedShares,
    class: 'investor'
  });

  let total = rows.reduce((s, r) => s + r.shares, 0);
  const esopShares = Math.round(total * (0.1 / 0.9));
  rows.push({
    id: 'esop',
    name: 'Employee option pool',
    shares: esopShares,
    class: 'option'
  });

  state.capTable = recalculateCapTablePercentages(rows);
  state.finance.cash = (state.finance.cash ?? 0) + raised;
  state.finance.valuation = postMoney;
  state.finance.lastRound = {
    name: 'Seed',
    raised,
    preMoney,
    postMoney,
    closedMonth: state.calendar.monthIndex,
    closedYear: state.calendar.year
  };
  state.flags.seedRoundClosed = true;
  return { ok: true, raised, postMoney };
}

export function seedRoundPreview(state) {
  if (
    !state.flags?.xcAccepted ||
    !state.flags?.xcResidencyComplete ||
    !state.offices?.hubId ||
    state.flags?.seedRoundClosed
  ) {
    return null;
  }
  const founder = getFounderRow(state);
  const founderPct = founder?.pct ?? 100;
  return {
    raised: 3_000_000,
    preMoney: 12_000_000,
    postMoney: 15_000_000,
    founderPctNow: founderPct,
    founderPctAfterApprox: Math.round(founderPct * 0.72 * 10) / 10,
    note: '~20% to seed investors and 10% ESOP (pro-forma).'
  };
}

export function renderCapTableRows(state) {
  return (state.capTable ?? [])
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td class="num">${(r.shares ?? 0).toLocaleString()}</td><td class="num">${r.pct ?? 0}%</td><td>${r.class ?? '—'}</td></tr>`
    )
    .join('');
}
