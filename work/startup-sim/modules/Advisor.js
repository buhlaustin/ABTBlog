import { isNarrativeApiEnabled } from './NarrativeApi.js';

/** Phase 4: chief-of-staff chat with game context. */
export function renderAdvisorPlaceholder(container) {
  if (!container) return;
  const api = isNarrativeApiEnabled() ? 'connected' : 'offline (scripted tips in Phase 4)';
  container.innerHTML = `
    <p class="panel-lede">Your AI chief of staff — Phase 4.</p>
    <p class="fine-print">Narrative API: ${api}</p>
    <div class="tab-placeholder">Advisor chat not wired yet.</div>
  `;
}
