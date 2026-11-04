import { WORKSPACE_TIER, getWorkspaceTier } from './Workspace.js';
import { formatMoney } from './constants.js';

const COO_CANDIDATE = {
  id: 'coo-jordan-ellis',
  role: 'COO',
  name: 'Jordan Ellis',
  bio: 'Former ops lead at a unicorn logistics startup. Calm in chaos.',
  salaryMonthly: 14_000
};

export function createInitialExecutives() {
  return {
    cooHired: false,
    cooOfferShown: false
  };
}

export function executivePayrollMonthly(state) {
  let total = 0;
  if (state.executives?.cooHired) total += COO_CANDIDATE.salaryMonthly;
  return total;
}

export function canOfferCoo(state) {
  const tier = getWorkspaceTier(state);
  if (tier === WORKSPACE_TIER.GARAGE) return false;
  if (state.executives?.cooHired) return false;
  return true;
}

export function hireCoo(state) {
  if (!canOfferCoo(state)) {
    return { ok: false, reason: 'COO hire unlocks with your first office lease.' };
  }
  if (!state.executives) state.executives = createInitialExecutives();
  state.executives.cooHired = true;
  return { ok: true, executive: COO_CANDIDATE };
}

export function renderOrgChart(container, state) {
  if (!container) return;
  const ceoName = [state.company?.ceoFirstName, state.company?.ceoLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ceoLabel = ceoName || state.company?.name || 'CEO';
  const cooBlock = state.executives?.cooHired
    ? `<div class="org-node org-node-exec"><span class="org-role">COO</span><strong>${COO_CANDIDATE.name}</strong><span class="fine-print">${formatMoney(COO_CANDIDATE.salaryMonthly)}/mo · not in headcount cap</span></div>`
    : canOfferCoo(state)
      ? `<div class="org-node org-node-open"><span class="org-role">COO</span><p class="fine-print">Build your exec bench — hire ${COO_CANDIDATE.name}.</p><button type="button" class="btn btn-primary btn-small" id="btn-hire-coo">Hire ${COO_CANDIDATE.name}</button></div>`
      : `<div class="org-node org-node-muted"><span class="org-role">COO</span><p class="fine-print">Unlocks when you lease an office.</p></div>`;

  container.innerHTML = `
    <h3 class="log-head">Org chart</h3>
    <div class="org-chart">
      <div class="org-node org-node-ceo"><span class="org-role">CEO</span><strong>${escapeHtml(ceoLabel)}</strong></div>
      <div class="org-connector" aria-hidden="true"></div>
      ${cooBlock}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export { COO_CANDIDATE };
