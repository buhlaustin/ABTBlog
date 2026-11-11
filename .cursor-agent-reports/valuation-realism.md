# Public valuation & cashout realism (integrator report)

## Root causes

1. **Stock splits** doubled cap-table shares while price fell, so `market cap = shares × price` could keep climbing via price ticks on a bloated share count (10M → 80B+).
2. **IPO listing** used `max(floatTarget, valuation/price)` for share count, inflating floats when valuation ran hot.
3. **No macro anchor** — private `estimateEquityValue` hard-capped at $2T but public marks compounded P/S, monthly drift, and desk/IR moves without GDP-scale mean reversion.
4. **Wealth heat** slowed desk payouts but did not curb trading cap vs operating fundamentals at extreme scale.

## Design (no hard cashout cap)

- **`PublicMarketRealism.js`**: ~$142T GDP reference, `macroCapPressureRatio`, stronger mean reversion, softer private valuation curve, trading-price reconciliation vs ARR × P/S + cash.
- **Cosmetic splits**: `displaySplitMultiplier` + `streetSharePrice()` for UI; economic `sharePrice` and cap table unchanged; market cap stable.
- **IPO**: Float-sized share count; lift **listing price** when needed instead of minting shares.
- **Post-IPO**: `reconcileTradingPriceToMacro` on monthly and instant moves; macro drag on wealth heat and fundamental P/S cap.

## Files

- `PublicMarketRealism.js` (new)
- `IPO.js`, `CapTable.js`, `PublicPostIpoEconomy.js`, `constants.js`, `GameState.js`
- `scripts/startup-sim-smoke.mjs`
