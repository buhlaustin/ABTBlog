import { STAGES } from './constants.js';
import { getArr } from './Workspace.js';
import { totalOutstandingShares } from './CapTable.js';

/** Rough 2026 global GDP (USD) — soft anchor, not a hard wealth cap. */
export const GLOBAL_GDP_USD_BENCHMARK = 142_000_000_000_000;

function isPublicCompanyState(state) {
  return Boolean(state.flags?.ipoFiled && state.stage === STAGES.PUBLIC);
}

function treasuryNetCash(state) {
  const cash = state.finance?.cash ?? 0;
  const loan = state.finance?.loan?.balance ?? 0;
  const rbf = state.finance?.rbf?.active ? state.finance?.rbf?.owed ?? 0 : 0;
  return Math.round(cash - loan - rbf);
}

export function marketCapFromState(state) {
  if (!isPublicCompanyState(state)) return 0;
  const shares = totalOutstandingShares(state);
  const price = state.publicMarket?.sharePrice ?? 0;
  return Math.round(shares * price);
}

/**
 * 0–1 pressure as company market cap approaches / exceeds macro scale.
 * Drives mean reversion and lower permissible P/S — no hard stop on cashout.
 */
export function macroCapPressureRatio(marketCapUsd) {
  const cap = Math.max(0, Number(marketCapUsd) || 0);
  const gdp = GLOBAL_GDP_USD_BENCHMARK;
  if (cap <= gdp * 0.008) return 0;
  if (cap <= gdp * 0.05) return ((cap - gdp * 0.008) / (gdp * 0.042)) * 0.12;
  if (cap <= gdp * 0.25) return 0.12 + ((cap - gdp * 0.05) / (gdp * 0.2)) * 0.28;
  if (cap <= gdp) return 0.4 + ((cap - gdp * 0.25) / (gdp * 0.75)) * 0.35;
  const logExcess = Math.log10(Math.max(1, cap / gdp));
  return Math.min(0.92, 0.75 + logExcess * 0.14);
}

export function macroMeanReversionBoost(state) {
  if (!isPublicCompanyState(state)) return 0;
  return macroCapPressureRatio(marketCapFromState(state)) * 0.42;
}

/** Trim fundamental P/S as the company becomes macro-sized. */
export function macroAdjustedPsCap(state, basePs) {
  const cap = marketCapFromState(state);
  const pressure = isPublicCompanyState(state) ? macroCapPressureRatio(cap) : 0;
  const arr = Math.max(getArr(state), (state.finance?.mrr ?? 0) * 12, 1);
  const impliedPs = cap > 0 ? cap / arr : 0;
  let ps = basePs;
  if (impliedPs > 40) ps *= 0.88;
  if (impliedPs > 80) ps *= 0.82;
  return Math.max(3.5, ps * (1 - pressure * 0.72));
}

/**
 * Soft private valuation ceiling — asymptotic, not a cliff.
 * Keeps pre-IPO marks from implying 100× GDP before the tape even opens.
 */
export function softPrivateEquityCap(rawEstimate, state) {
  const arr = Math.max(getArr(state), (state.finance?.mrr ?? 0) * 12, 1);
  const gdp = GLOBAL_GDP_USD_BENCHMARK;
  const arrAnchor = Math.min(rawEstimate, arr * 85 + Math.max(0, treasuryNetCash(state)));
  const macroStretch = gdp * (0.12 + Math.min(0.55, Math.log10(Math.max(arr, 1e6) / 1e6) * 0.08));
  const blended = rawEstimate * 0.42 + arrAnchor * 0.38 + macroStretch * 0.2;
  if (rawEstimate <= macroStretch * 1.05) return Math.round(Math.min(rawEstimate, blended));
  const excess = rawEstimate - macroStretch;
  const softened = macroStretch + excess / (1 + excess / (gdp * 0.35));
  return Math.round(Math.min(rawEstimate, Math.max(blended, softened)));
}

export function splitDisplayMultiplier(state) {
  return Math.max(1, state.publicMarket?.displaySplitMultiplier ?? 1);
}

/** Sticker price after cumulative splits (economic price is unchanged). */
export function streetSharePrice(state) {
  const economic = state.publicMarket?.sharePrice ?? 0;
  if (economic <= 0) return 0;
  return Math.round((economic / splitDisplayMultiplier(state)) * 100) / 100;
}

/** Street-facing share count (splits adjust this, not the cap table). */
export function displayOutstandingShares(state) {
  const economic = totalOutstandingShares(state);
  return Math.round(economic * splitDisplayMultiplier(state));
}

/**
 * After price moves, pull trading cap toward operating value when macro pressure is high.
 */
export function reconcileTradingPriceToMacro(state, proposedPrice) {
  if (!isPublicCompanyState(state)) return proposedPrice;
  const shares = totalOutstandingShares(state);
  if (shares <= 0) return proposedPrice;
  const pm = state.publicMarket ?? {};
  const arr = Math.max((state.finance?.mrr ?? 0) * 12, getArr(state), 1);
  const netCash = Math.max(0, treasuryNetCash(state));
  const tradingCap = shares * proposedPrice;
  const pressure = macroCapPressureRatio(tradingCap);
  const ps = Math.min(45, (pm.priceSalesMultiple ?? 12) * (1 - pressure * 0.35));
  const fairCap = arr * ps + netCash;
  if (pressure < 0.2 || fairCap <= 0) return proposedPrice;
  const maxPremium = 1.35 + (1 - pressure) * 0.85;
  const capAllowed = fairCap * maxPremium;
  if (tradingCap <= capAllowed) return proposedPrice;
  const floor = (pm.ipoPrice ?? proposedPrice) * 0.15;
  const clamped = Math.max(floor, capAllowed / shares);
  return Math.round(clamped * 100) / 100;
}
