/** Phase 4: AI monthly news + archive. */
export function createInitialNews() {
  return {
    currentMonthArticles: [],
    archive: []
  };
}

export function renderNewsPlaceholder(container) {
  if (!container) return;
  container.innerHTML = `
    <p class="panel-lede">3–4 generated articles per month (parody names) — Phase 4.</p>
    <div class="tab-placeholder">No headlines this month yet.</div>
  `;
}
