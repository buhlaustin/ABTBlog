/** Board / investor sentiment (0–100). Gates follow-on rounds and enables down rounds. */

export function createInitialSentiment() {
  return { score: 68, lastDelta: 0, lastReason: null };
}

export function clampSentiment(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function adjustSentiment(state, delta, reason) {
  if (!state.sentiment) state.sentiment = createInitialSentiment();
  const next = clampSentiment(state.sentiment.score + delta);
  state.sentiment.lastDelta = next - state.sentiment.score;
  state.sentiment.score = next;
  if (reason) state.sentiment.lastReason = reason;
  return state.sentiment.score;
}

export function sentimentLabel(score) {
  const s = clampSentiment(score);
  if (s >= 75) return 'Supportive';
  if (s >= 55) return 'Cautious';
  if (s >= 35) return 'Restless';
  return 'Hostile';
}

export function runwayMonths(state) {
  const burn = state.finance?.monthlyBurn ?? 0;
  const cash = state.finance?.cash ?? 0;
  if (burn <= 0) return null;
  return cash / burn;
}

/** Call after layoffs finalize. */
export function onLayoffSentiment(state, layoffPct) {
  if (layoffPct >= 0.15) adjustSentiment(state, -14, 'Major layoffs spooked the board.');
  else if (layoffPct > 0) adjustSentiment(state, -5, 'Headcount cuts noted in the board deck.');
}

/** Call at month end after revenue is finalized. */
export function onMonthEndSentiment(state, priorRevenue, currentRevenue) {
  if (priorRevenue > 0 && currentRevenue < priorRevenue * 0.7) {
    adjustSentiment(state, -8, 'Revenue slipped vs last month.');
  } else if (currentRevenue > priorRevenue * 1.05) {
    adjustSentiment(state, 3, 'Board liked the revenue trend.');
  }
}

/** After public stock tick. */
export function onStockSentiment(state, deltaPct) {
  if (deltaPct <= -0.06) adjustSentiment(state, -5, 'Stock drawdown worried lead investors.');
  else if (deltaPct >= 0.08) adjustSentiment(state, 3, 'Public market pop helped morale in the boardroom.');
}

export function onBoardSentiment(state, delta) {
  adjustSentiment(state, delta, 'Board task completed.');
}

export function canRaiseSeriesA(state) {
  const arr = state.finance?.arr ?? 0;
  return Boolean(
    state.flags?.seedRoundClosed &&
      !state.flags?.seriesAClosed &&
      !state.flags?.ipoFiled &&
      arr >= 2_000_000
  );
}

export function canRaiseSeriesB(state) {
  const arr = state.finance?.arr ?? 0;
  return Boolean(
    state.flags?.seriesAClosed &&
      !state.flags?.seriesBClosed &&
      !state.flags?.ipoFiled &&
      arr >= 12_000_000
  );
}

/** Minimum sentiment to close without a board block. */
export function seriesAGateSentiment(state) {
  return state.sentiment?.score ?? 50;
}

export function seriesBGateSentiment(state) {
  return Math.max(25, (state.sentiment?.score ?? 50) - 5);
}

export function isDownRoundLikely(state) {
  const runway = runwayMonths(state);
  const score = state.sentiment?.score ?? 50;
  return runway != null && runway < 4 && score < 55;
}
