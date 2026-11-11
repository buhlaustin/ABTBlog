import { STAGES } from './constants.js';
import { getArr } from './Workspace.js';
import { PUBLIC_FLOAT_ROW_ID, totalOutstandingShares } from './CapTable.js';

/** Rough 2026 global GDP (USD) — soft anchor, not a hard wealth cap. */
export const GLOBAL_GDP_USD_BENCHMARK = 142_000_000_000_000;

/** Personal / company marks around here are rare but plausible (≈ trillionaire). */
export const TRILLIONAIRE_BAND_USD = 1_000_000_000_000;

function isPublicCompanyState(state) {
  return Boolean(state.flags?.ipoFiled && state.stage === STAGES.PUBLIC && !state.flags?.takenPrivate);
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
  const tri = TRILLIONAIRE_BAND_USD;
  if (cap <= 50_000_000_000) return 0;
  if (cap <= 500_000_000_000) return ((cap - 50_000_000_000) / 450_000_000_000) * 0.1;
  if (cap <= tri * 3) return 0.1 + ((cap - 500_000_000_000) / (tri * 2.5)) * 0.18;
  if (cap <= tri * 30) return 0.28 + ((cap - tri * 3) / (tri * 27)) * 0.32;
  if (cap <= gdp) return 0.6 + ((cap - tri * 30) / Math.max(tri, gdp - tri * 30)) * 0.25;
  const logExcess = Math.log10(Math.max(1, cap / gdp));
  return Math.min(0.98, 0.85 + logExcess * 0.28);
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

/** Cap model price right after listing so the tape cannot “catch up” 50× in one month. */
/** Slow re-rating of operating value after IPO — does not clip balance-sheet cash / share. */
export function guardListingOperatingPrice(state, operatingPx) {
  const pm = state.publicMarket ?? {};
  const trade = pm.sharePrice ?? pm.ipoPrice ?? operatingPx;
  const ipo = pm.ipoPrice ?? trade;
  const months = pm.monthsPublic ?? 0;
  if (months > 30) return operatingPx;
  const monthMult =
    months <= 1 ? 1.1 : months <= 3 ? 1.22 : months <= 6 ? 1.38 : months <= 12 ? 1.65 : 2.4;
  const ceiling = Math.max(trade * 1.04, ipo * monthMult);
  const floor = Math.min(trade * 0.96, ipo * 0.84);
  return Math.round(Math.min(Math.max(operatingPx, floor), ceiling) * 100) / 100;
}

/** @deprecated name — use guardListingOperatingPrice */
export function guardListingFundamentalPrice(state, modelPx) {
  return guardListingOperatingPrice(state, modelPx);
}

/** Hard cap on monthly % move (applied after wealth-heat scaling). */
export function clampPublicMonthlyDelta(state, deltaPct) {
  const months = state.publicMarket?.monthsPublic ?? 0;
  let maxUp = months <= 1 ? 0.07 : months <= 3 ? 0.1 : months <= 6 ? 0.14 : months <= 18 ? 0.2 : 0.32;
  const maxDown = months <= 6 ? -0.14 : -0.22;
  return Math.max(maxDown, Math.min(maxUp, deltaPct));
}

/** Snaps trading price into a fundamental band — loose when mature. */
export function clampPriceToFundamentalBand(state, price, fundamental) {
  const months = state.publicMarket?.monthsPublic ?? 0;
  const fund = Math.max(0.01, Number(fundamental) || price);
  const lo = fund * (months <= 6 ? 0.9 : 0.78);
  const hi = fund * (months <= 6 ? 1.12 : 1.38);
  return Math.round(Math.min(Math.max(price, lo), hi) * 100) / 100;
}

/** Per-month budget for desk / IR instant moves (resets at month open). */
export function consumeInstantStockMoveBudget(state, scaledPct) {
  const pm = state.publicMarket;
  if (!pm) return scaledPct;
  const months = pm.monthsPublic ?? 0;
  const cap = months <= 3 ? 0.09 : months <= 12 ? 0.14 : 0.22;
  if (pm.instantMoveBudgetPct == null) pm.instantMoveBudgetPct = cap;
  const mag = Math.min(Math.abs(scaledPct), pm.instantMoveBudgetPct);
  pm.instantMoveBudgetPct = Math.max(0, pm.instantMoveBudgetPct - mag);
  return Math.sign(scaledPct || 1) * mag;
}

export function resetInstantStockMoveBudget(state) {
  const pm = state.publicMarket;
  if (!pm) return;
  const months = pm.monthsPublic ?? 0;
  pm.instantMoveBudgetPct = months <= 3 ? 0.09 : months <= 12 ? 0.14 : 0.22;
}

/** Optional board split when sticker runs hot — max once per 6 months (same gate as manual). */
export function autoStockSplitIfNeeded(state) {
  const price = state.publicMarket?.sharePrice ?? 0;
  if (price < 420) return null;
  return { needed: true, reason: 'high sticker' };
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
  let fairCap = arr * ps + netCash;
  if (tradingCap > GLOBAL_GDP_USD_BENCHMARK * 0.5) {
    fairCap = Math.min(fairCap, GLOBAL_GDP_USD_BENCHMARK * (0.45 + (1 - pressure) * 0.35));
  }
  if (pressure < 0.08 || fairCap <= 0) return proposedPrice;
  const maxPremium = 1.22 + (1 - pressure) * 0.55;
  const capAllowed = fairCap * maxPremium;
  if (tradingCap <= capAllowed) return proposedPrice;
  const floor = (pm.ipoPrice ?? proposedPrice) * 0.15;
  const clamped = Math.max(floor, capAllowed / shares);
  return Math.round(clamped * 100) / 100;
}

/** Headless: $1T-scale marks are fine; hundreds of trillions are not. */
export function macroPressureAllowsTrillionaire(capUsd) {
  return macroCapPressureRatio(capUsd) < 0.35;
}

export function macroPressureBlocksFantasyWealth(capUsd) {
  return macroCapPressureRatio(capUsd) > 0.88;
}

const PUBLIC_CAP_TIER_FLOORS = [
  0,
  500_000_000,
  2_000_000_000,
  10_000_000_000,
  50_000_000_000,
  200_000_000_000
];

/** How deep the public book is — deeper float over time, not a dampener on displayed stock %. */
function publicMarketDepth(state) {
  if (!isPublicCompanyState(state)) return 0;
  const months = Math.max(0, state.publicMarket?.monthsPublic ?? 0);
  const monthsRamp = 1 - Math.exp(-months / 20);
  const cap = marketCapFromState(state);
  let tier = 0;
  for (let i = 1; i < PUBLIC_CAP_TIER_FLOORS.length; i += 1) {
    if (cap >= PUBLIC_CAP_TIER_FLOORS[i]) tier = i;
  }
  const capRamp = (tier + 1) / 6;
  return Math.min(1, Math.max(0, monthsRamp * 0.52 + capRamp * 0.48));
}

export function publicFloatShares(state) {
  const row = (state.capTable ?? []).find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
  return Math.max(1, Math.round(row?.shares ?? 0));
}

/**
 * Haircut when selling a block into the float — sticker price is not what you bank.
 * Thin books and macro-sized caps bite harder (trillionaire exits still work; fantasy caps do not).
 */
export function blockSaleLiquidityHaircut(state, sharesToSell) {
  if (!isPublicCompanyState(state) || sharesToSell <= 0) return 0;
  const float = publicFloatShares(state);
  const participation = Math.min(1, sharesToSell / float);
  const depth = publicMarketDepth(state);
  let impact = participation * (0.22 + (1 - depth) * 0.42);
  const tradingPx = state.publicMarket?.sharePrice ?? 0;
  const fairPx = state.publicMarket?.fundamentalPrice ?? tradingPx;
  if (fairPx > 0 && tradingPx > fairPx * 1.12) {
    const disconnect = (tradingPx - fairPx) / tradingPx;
    impact += disconnect * 0.55;
  }
  const pressure = macroCapPressureRatio(marketCapFromState(state));
  impact += pressure * participation * 0.38;
  return Math.min(0.88, Math.max(0, impact));
}

/** Per-share cash you actually receive when selling `sharesToSell` (fees + liquidity). */
export function effectiveBlockSalePrice(state, sharesToSell) {
  const quote = state.publicMarket?.sharePrice ?? 0;
  if (quote <= 0 || sharesToSell <= 0) return 0;
  const saleCost = 0.006;
  const haircut = blockSaleLiquidityHaircut(state, sharesToSell);
  return Math.round(quote * (1 - haircut - saleCost) * 100) / 100;
}

/** Per-share cost when buying a block on the open market (slippage + fees). */
export function effectiveBlockBuyPrice(state, sharesToBuy) {
  const quote = state.publicMarket?.sharePrice ?? 0;
  if (quote <= 0 || sharesToBuy <= 0) return 0;
  const tradeCost = 0.008;
  const slippage = blockSaleLiquidityHaircut(state, sharesToBuy);
  return Math.round(quote * (1 + slippage + tradeCost) * 100) / 100;
}

/**
 * When the tape rejects an inflated quote, treasury pays real stabilization (buybacks, liquidity).
 */
export function macroStabilizationFee(state, priceBefore, priceAfterReconcile) {
  if (!isPublicCompanyState(state)) return 0;
  const shares = totalOutstandingShares(state);
  if (shares <= 0 || priceAfterReconcile >= priceBefore) return 0;
  const gapCap = shares * (priceBefore - priceAfterReconcile);
  if (gapCap <= 0) return 0;
  const pressure = macroCapPressureRatio(shares * priceBefore);
  const fee = Math.round(gapCap * 0.018 * (0.35 + pressure * 0.65));
  const cash = state.finance?.cash ?? 0;
  return Math.min(cash, Math.max(0, fee));
}
