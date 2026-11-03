/** Phase 4: AI monthly news + archive. */
export function createInitialNews() {
  return {
    currentMonthArticles: [],
    archive: [],
    layoffQueue: []
  };
}

export function recordLayoffEvent(state, layoffPct) {
  if (!state.news) state.news = createInitialNews();
  state.news.layoffQueue.push({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    layoffPct: Math.round(layoffPct * 100)
  });
}

export function renderNewsPlaceholder(container, state) {
  if (!container) return;
  const layoffs = state?.news?.layoffQueue?.length ?? 0;
  container.innerHTML = `
    <p class="panel-lede">3–4 generated articles per month (parody names) — Phase 4.</p>
    ${
      layoffs
        ? `<p class="fine-print">${layoffs} layoff event(s) queued for AI news when Phase 4 ships.</p>`
        : ''
    }
    <div class="tab-placeholder">No headlines this month yet.</div>
  `;
}
