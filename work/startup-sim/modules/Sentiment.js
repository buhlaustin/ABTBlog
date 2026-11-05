/** Board / investor sentiment (0–100). Only active after Series A seats a lead investor. */

export function hasInstitutionalBoard(state) {
  return Boolean(state.flags?.seriesAClosed);
}

/** Called when Series A closes — board approval tracking begins. */
export function seatInstitutionalBoard(state, reason = 'Series A lead takes a board seat.') {
  if (!state.sentiment) state.sentiment = createInitialSentiment();
  state.sentiment.score = 68;
  state.sentiment.lastDelta = 0;
  state.sentiment.lastReason = reason;
  return state.sentiment.score;
}

export function createInitialSentiment() {
  return { score: 68, lastDelta: 0, lastReason: null };
}

export function clampSentiment(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function adjustSentiment(state, delta, reason) {
  if (!state.sentiment) state.sentiment = createInitialSentiment();
  const prior = state.sentiment.score;
  const next = clampSentiment(prior + delta);
  const applied = next - prior;
  state.sentiment.lastDelta = applied;
  state.sentiment.score = next;
  if (reason) state.sentiment.lastReason = reason;
  if (hasInstitutionalBoard(state) && applied !== 0) {
    if (!state.board) state.board = { sentimentHistory: [] };
    if (!state.board.sentimentHistory) state.board.sentimentHistory = [];
    state.board.sentimentHistory.unshift({
      score: next,
      delta: applied,
      reason: reason ?? 'Update',
      month: state.calendar?.monthIndex,
      year: state.calendar?.year
    });
    state.board.sentimentHistory = state.board.sentimentHistory.slice(0, 12);
  }
  return state.sentiment.score;
}

export function sentimentLabel(score) {
  const s = clampSentiment(score);
  if (s >= 75) return 'Supportive';
  if (s >= 55) return 'Cautious';
  if (s >= 35) return 'Restless';
  return 'Hostile';
}

/** Pre-board label for the same 0–100 trust score. */
export function marketTrustLabel(score) {
  const s = clampSentiment(score);
  if (s >= 75) return 'Strong';
  if (s >= 55) return 'Steady';
  if (s >= 35) return 'Shaky';
  return 'Toxic';
}

export function runwayMonths(state) {
  const burn = state.finance?.monthlyBurn ?? 0;
  const cash = state.finance?.cash ?? 0;
  if (burn <= 0) return null;
  return cash / burn;
}

/** Call after layoffs finalize. */
export function onLayoffSentiment(state, layoffPct) {
  if (!hasInstitutionalBoard(state)) return;
  if (layoffPct >= 0.15) adjustSentiment(state, -14, 'Major layoffs spooked the board.');
  else if (layoffPct > 0) adjustSentiment(state, -5, 'Headcount cuts noted in the board deck.');
}

/** Call at month end after revenue is finalized. */
export function onMonthEndSentiment(state, priorRevenue, currentRevenue) {
  if (!hasInstitutionalBoard(state)) return;
  if (priorRevenue > 0 && currentRevenue < priorRevenue * 0.7) {
    adjustSentiment(state, -8, 'Revenue slipped vs last month.');
  } else if (currentRevenue > priorRevenue * 1.05) {
    adjustSentiment(state, 3, 'Board liked the revenue trend.');
  }
}

/** After public stock tick. */
export function onStockSentiment(state, deltaPct) {
  if (!hasInstitutionalBoard(state)) return;
  if (deltaPct <= -0.06) adjustSentiment(state, -5, 'Stock drawdown worried lead investors.');
  else if (deltaPct >= 0.08) adjustSentiment(state, 3, 'Public market pop helped morale in the boardroom.');
}

export function onBoardSentiment(state, delta) {
  if (!hasInstitutionalBoard(state)) return;
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
  if (!hasInstitutionalBoard(state)) return false;
  const runway = runwayMonths(state);
  const score = state.sentiment?.score ?? 50;
  return runway != null && runway < 4 && score < 55;
}
