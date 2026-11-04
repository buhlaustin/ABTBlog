import { WORKSPACE_TIER, getWorkspaceTier } from './Workspace.js';
import { formatMoney } from './constants.js';
import bundledExecNames from '../data/exec-names.json' with { type: 'json' };
import { assetBaseUrl } from './utils.js';

let execNamesCache = bundledExecNames;

const SALARY_BY_TIER = {
  [WORKSPACE_TIER.SMALL]: 14_000,
  [WORKSPACE_TIER.MEDIUM]: 16_000,
  [WORKSPACE_TIER.LARGE]: 18_500,
  [WORKSPACE_TIER.HUB]: 22_000
};

const MAX_EXECS_BY_TIER = {
  [WORKSPACE_TIER.GARAGE]: 0,
  [WORKSPACE_TIER.SMALL]: 1,
  [WORKSPACE_TIER.MEDIUM]: 3,
  [WORKSPACE_TIER.LARGE]: 6,
  [WORKSPACE_TIER.HUB]: 10
};

export function createInitialExecutives() {
  return {
    roster: [],
    pendingHire: null
  };
}

async function loadExecNames() {
  try {
    const res = await fetch(`${assetBaseUrl()}data/exec-names.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.firstNames?.length) execNamesCache = data;
    }
  } catch {
    /* bundled */
  }
  return execNamesCache;
}

function runSeed(state) {
  if (state.meta?.runSeed != null) return Number(state.meta.runSeed) || 1;
  const name = state.company?.name ?? 'co';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(pool, rng, usedSet) {
  const available = pool.filter((x) => !usedSet.has(x));
  const list = available.length ? available : pool;
  return list[Math.floor(rng() * list.length)];
}

export async function generateExecutiveCandidates(state, roleTitle, count = 4) {
  const data = await loadExecNames();
  const rng = mulberry32(runSeed(state) + roleTitle.length * 997 + (state.executives?.roster?.length ?? 0) * 131);
  const usedNames = new Set((state.executives?.roster ?? []).map((e) => e.name));
  const candidates = [];

  for (let i = 0; i < count; i++) {
    const first = pick(data.firstNames, rng, new Set());
    const last = pick(data.lastNames, rng, new Set());
    const name = `${first} ${last}`;
    usedNames.add(name);
    const former = pick(data.formerCompanies, rng, new Set());
    const snippet = pick(data.bioSnippets, rng, new Set());
    const tier = getWorkspaceTier(state);
    const salary =
      SALARY_BY_TIER[tier] ??
      SALARY_BY_TIER[WORKSPACE_TIER.SMALL] + Math.floor(rng() * 4_000);
    candidates.push({
      id: `exec-cand-${Date.now()}-${i}-${Math.floor(rng() * 1e6)}`,
      roleTitle: roleTitle.trim() || 'COO',
      name,
      bio: `${snippet} Previously at ${former}.`,
      salaryMonthly: salary,
      formerCompany: former
    });
  }
  return candidates;
}

export function maxExecutiveSlots(state) {
  const tier = getWorkspaceTier(state);
  return MAX_EXECS_BY_TIER[tier] ?? 0;
}

export function executivePayrollMonthly(state) {
  return (state.executives?.roster ?? []).reduce((sum, e) => sum + (e.salaryMonthly ?? 0), 0);
}

export function canHireExecutives(state) {
  return maxExecutiveSlots(state) > (state.executives?.roster?.length ?? 0);
}

export async function openExecutiveHireFlow(state, roleTitle = 'COO') {
  if (!canHireExecutives(state)) {
    return { ok: false, reason: 'No open executive seats at your current office tier.' };
  }
  if (!state.executives) state.executives = createInitialExecutives();
  const title = String(roleTitle || 'COO').trim().slice(0, 40) || 'COO';
  const candidates = await generateExecutiveCandidates(state, title);
  state.executives.pendingHire = { roleTitle: title, candidates };
  return { ok: true, candidates };
}

export function hireExecutiveCandidate(state, candidateId) {
  const pending = state.executives?.pendingHire;
  if (!pending) return { ok: false, reason: 'No executive search in progress.' };
  const cand = pending.candidates.find((c) => c.id === candidateId);
  if (!cand) return { ok: false, reason: 'Pick one of the listed candidates.' };
  if (!canHireExecutives(state)) {
    state.executives.pendingHire = null;
    return { ok: false, reason: 'Executive seat filled or tier changed.' };
  }

  state.executives.roster.push({
    id: `exec-${Date.now()}`,
    roleTitle: pending.roleTitle,
    name: cand.name,
    bio: cand.bio,
    salaryMonthly: cand.salaryMonthly,
    formerCompany: cand.formerCompany
  });
  state.executives.pendingHire = null;
  return { ok: true, executive: state.executives.roster[state.executives.roster.length - 1] };
}

export function cancelExecutiveHire(state) {
  if (state.executives) state.executives.pendingHire = null;
}

export function migrateLegacyCoo(state) {
  if (!state.executives) state.executives = createInitialExecutives();
  if (state.executives.cooHired && !state.executives.roster.some((e) => e.roleTitle === 'COO')) {
    state.executives.roster.push({
      id: 'exec-coo-legacy',
      roleTitle: 'COO',
      name: 'Jordan Ellis',
      bio: 'Former ops lead at a unicorn logistics startup. Calm in chaos.',
      salaryMonthly: 14_000,
      formerCompany: 'Macrohard'
    });
  }
  delete state.executives.cooHired;
  delete state.executives.cooOfferShown;
}

function suggestedTitles(data) {
  return data.suggestedTitles ?? ['COO', 'CFO', 'CTO', 'CMO', 'CRO'];
}

function renderPendingHire(state, data) {
  const pending = state.executives.pendingHire;
  if (!pending) return '';
  const cards = pending.candidates
    .map(
      (c) => `<div class="exec-candidate">
        <strong>${escapeHtml(c.name)}</strong>
        <p class="fine-print">${escapeHtml(c.bio)}</p>
        <p class="fine-print">${formatMoney(c.salaryMonthly)}/mo · not in headcount cap</p>
        <button type="button" class="btn btn-primary btn-small" data-hire-exec="${escapeHtml(c.id)}">Hire as ${escapeHtml(pending.roleTitle)}</button>
      </div>`
    )
    .join('');
  return `<div class="exec-hire-modal">
    <h4>Hire ${escapeHtml(pending.roleTitle)}</h4>
    <p class="fine-print">Pick one of four candidates for this run.</p>
    <div class="exec-candidate-grid">${cards}</div>
    <button type="button" class="btn btn-small" id="btn-cancel-exec-hire">Cancel search</button>
  </div>`;
}

export function renderOrgChart(container, state) {
  if (!container) return;
  migrateLegacyCoo(state);
  const data = execNamesCache;
  const ceoName = [state.company?.ceoFirstName, state.company?.ceoLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ceoLabel = ceoName || state.company?.name || 'CEO';
  const slots = maxExecutiveSlots(state);
  const roster = state.executives?.roster ?? [];
  const open = Math.max(0, slots - roster.length);

  const execNodes = roster
    .map(
      (e) =>
        `<div class="org-node org-node-exec"><span class="org-role">${escapeHtml(e.roleTitle)}</span><strong>${escapeHtml(e.name)}</strong><span class="fine-print">${formatMoney(e.salaryMonthly)}/mo · not in headcount cap</span></div>`
    )
    .join('');

  const titleOptions = suggestedTitles(data)
    .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    .join('');

  const hireBlock =
    open > 0 && !state.executives?.pendingHire
      ? `<div class="org-node org-node-open">
          <span class="org-role">Open seat (${open} left)</span>
          <label class="fine-print" for="exec-role-title">Title</label>
          <select id="exec-role-title" class="exec-role-select">${titleOptions}</select>
          <button type="button" class="btn btn-primary btn-small" id="btn-start-exec-hire">Review candidates</button>
        </div>`
      : slots === 0
        ? `<div class="org-node org-node-muted"><span class="org-role">C-suite</span><p class="fine-print">Unlocks when you lease a small office.</p></div>`
        : open === 0
          ? `<div class="org-node org-node-muted"><span class="org-role">C-suite full</span><p class="fine-print">${slots} seats filled — upgrade workspace for more.</p></div>`
          : '';

  container.innerHTML = `
    <h3 class="log-head">Org chart</h3>
    <div class="org-chart">
      <div class="org-node org-node-ceo"><span class="org-role">CEO</span><strong>${escapeHtml(ceoLabel)}</strong></div>
      <div class="org-connector" aria-hidden="true"></div>
      ${execNodes}
      ${hireBlock}
    </div>
    ${renderPendingHire(state, data)}
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
