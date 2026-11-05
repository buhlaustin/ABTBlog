import { STAGES, formatMoney } from './constants.js';
import { getFounderRow, recalculateCapTablePercentages } from './CapTable.js';
import { isFundraisingBlockedByScenario } from './ScenarioEffects.js';
import { getArr } from './Workspace.js';

export const ANGEL_SAFE_AMOUNT = 50_000;
export const ANGEL_SAFE_CAP = 1_500_000;
export const ANGEL_SAFE_MAX_ROUNDS = 6;
const EST_PCT = Math.round((ANGEL_SAFE_AMOUNT / ANGEL_SAFE_CAP) * 1000) / 10;

export function angelSafesClosedCount(state) {
  return (state.finance?.instruments ?? []).filter((i) => i.type === 'safe' && i.id?.startsWith('angel-')).length;
}

export function canCloseAngelSafe(state) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  if (state.stage !== STAGES.GARAGE) {
    return { ok: false, reason: 'Angel SAFEs are available while you are still in the garage.' };
  }
  if (state.flags?.seedRoundClosed) {
    return { ok: false, reason: 'Angel SAFEs close before your priced seed round.' };
  }
  if (isFundraisingBlockedByScenario(state)) {
    return { ok: false, reason: 'Fundraising paused by recent fallout.' };
  }
  if (angelSafesClosedCount(state) >= ANGEL_SAFE_MAX_ROUNDS) {
    return { ok: false, reason: `Cap of ${ANGEL_SAFE_MAX_ROUNDS} angel SAFEs for this stage.` };
  }
  const arr = getArr(state);
  const traction =
    arr >= 5_000 ||
    (state.product?.level ?? 0) >= 1 ||
    (state.finance?.lifetimeRevenue ?? 0) >= 8_000;
  if (!traction) {
    return {
      ok: false,
      reason: 'Need early traction (product level, revenue, or ~$5k ARR) before angels wire.'
    };
  }
  return { ok: true };
}

export function closeAngelSafe(state) {
  const gate = canCloseAngelSafe(state);
  if (!gate.ok) return gate;

  const n = angelSafesClosedCount(state) + 1;
  const id = `angel-${n}`;
  const founder = getFounderRow(state);
  const founderShares = founder?.shares ?? 10_000_000;
  const pct = ANGEL_SAFE_AMOUNT / ANGEL_SAFE_CAP;
  const investorShares = Math.round(founderShares * (pct / (1 - pct)));

  state.finance.cash = (state.finance.cash ?? 0) + ANGEL_SAFE_AMOUNT;
  if (!state.finance.instruments) state.finance.instruments = [];
  state.finance.instruments.push({
    type: 'safe',
    id,
    label: `Angel SAFE #${n}`,
    amount: ANGEL_SAFE_AMOUNT,
    cap: ANGEL_SAFE_CAP,
    discount: 0,
    estConversionPct: EST_PCT
  });

  const table = state.capTable.filter((r) => r.id !== id);
  table.push({
    id,
    name: `Angel syndicate #${n} (SAFE)`,
    shares: investorShares,
    class: 'investor'
  });
  state.capTable = recalculateCapTablePercentages(table);
  if (!state.finance.valuation || state.finance.valuation < ANGEL_SAFE_CAP) {
    state.finance.valuation = ANGEL_SAFE_CAP;
  }

  return {
    ok: true,
    raised: ANGEL_SAFE_AMOUNT,
    cap: ANGEL_SAFE_CAP,
    round: n,
    summary: `Angel SAFE #${n}: ${formatMoney(ANGEL_SAFE_AMOUNT)} on ${formatMoney(ANGEL_SAFE_CAP)} post-money cap (~${EST_PCT}% est.).`
  };
}
