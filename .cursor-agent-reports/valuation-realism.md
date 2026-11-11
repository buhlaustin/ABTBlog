# Public valuation & cashout realism (integrator report)

## Root causes

1. **Stock splits** doubled cap-table shares while price fell, so `market cap = shares × price` could keep climbing via price ticks on a bloated share count (10M → 80B+).
2. **IPO listing** used `max(floatTarget, valuation/price)` for share count, inflating floats when valuation ran hot.
3. **No macro anchor** — private `estimateEquityValue` hard-capped at $2T but public marks compounded P/S, monthly drift, and desk/IR moves without GDP-scale mean reversion.
4. **Wealth heat** slowed desk payouts but did not curb trading cap vs operating fundamentals at extreme scale.

## Design (no hard cashout cap)

- **`PublicMarketRealism.js`**: ~$142T GDP reference, `macroCapPressureRatio` tuned so **~$1–3T** (trillionaire band) stays playable and **hundreds of trillions** (e.g. ~$720T) hits max pressure / reconciliation — not a hard cap on selling out.
- **Splits**: Real 2-for-1 cap-table splits when sticker is high; rare if listing price and month-1 clamps stay sane.
- **`guardListingOperatingPrice`**: Post-IPO re-rating guard applies to **operating** value only so balance-sheet cash still flows into model cap.
- **IPO**: Float-sized share count; lift **listing price** when needed instead of minting shares.
- **Post-IPO**: `reconcileTradingPriceToMacro` on monthly and instant moves; macro drag on wealth heat and fundamental P/S cap.

## Files

- `PublicMarketRealism.js` (new)
- `IPO.js`, `CapTable.js`, `PublicPostIpoEconomy.js`, `constants.js`, `GameState.js`
- `scripts/startup-sim-smoke.mjs`
