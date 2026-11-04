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

const ROLE_BIO_LEADS = {
  COO: [
    'Operator who scales teams without breaking culture.',
    'Process nerd who makes weekly ops reviews actually useful.',
    'Former chief of staff who learned to say no to the CEO politely.'
  ],
  CFO: [
    'Finance leader obsessed with runway and clean audits.',
    'FP&A hawk who models three scenarios before breakfast.',
    'Ex-auditor who keeps the board out of surprise restatements.'
  ],
  CTO: [
    'Technical exec who still reads diffs on Friday nights.',
    'Architecture-first leader who hates one-off hacks.',
    'Shipped two zero-downtime migrations and talks about both.'
  ],
  CMO: [
    'Brand builder who turns buzz into pipeline.',
    'Demand-gen lead who A/B tests the A/B tests.',
    'Storyteller who makes analysts care about your wedge.'
  ],
  CRO: [
    'Revenue leader who lives in the CRM.',
    'Quota crusher who coaches reps on discovery calls.',
    'Enterprise closer who speaks procurement fluently.'
  ],
  CPO: [
    'Product exec who talks to customers every week.',
    'Roadmap diplomat between sales promises and eng reality.',
    'Metrics-driven PM who killed a beloved feature once.'
  ],
  CHRO: [
    'People leader who hires fast and fires fair.',
    'Culture carrier who fixes broken performance reviews.',
    'Comp whisperer who keeps exec hires from blowing the band.'
  ],
  CIO: [
    'Systems exec who untangles enterprise messes.',
    'Integration veteran who survived three ERP go-lives.',
    'Data governance nerd the board actually listens to.'
  ],
  CSO: [
    'Security-minded exec for when the board asks hard questions.',
    'Incident commander who ran a tabletop that saved a deal.',
    'Zero-trust advocate with scars from a phishing test fail.'
  ],
  'General Counsel': [
    'Startup lawyer who has seen every term sheet trick.',
    'Commercial counsel who redlines without killing momentum.',
    'IP hawk who stopped a nasty trademark surprise early.'
  ],
  'VP Engineering': [
    'Engineering leader who ships predictable quarters.',
    'Platform builder who cut deploy time in half.',
    'Manager of managers who protects maker time.'
  ],
  'VP Sales': [
    'Sales leader who builds repeatable outbound.',
    'Playbook author who made SDR handoffs boringly reliable.',
    'Channel partner whisperer with a rolodex of resellers.'
  ],
  'VP Marketing': [
    'Marketing leader who measures everything.',
    'Category creator who owns a niche on LinkedIn.',
    'Launch captain who coordinated three successful GA days.'
  ],
  'VP Product': [
    'Product leader who connects roadmap to revenue.',
    'Discovery obsessive who banned solution-first PRDs.',
    'Pricing experimenter who found a packaging win.'
  ],
  'VP Operations': [
    'Ops leader who makes chaos boring.',
    'Vendor negotiator who re-signed AWS with a discount.',
    'Support-to-ops bridge who fixed SLA misses.'
  ],
  'VP Finance': [
    'Finance leader who models scenarios in spreadsheets.',
    'Controller-minded exec who closed books in five days.',
    'Treasury hawk who sweats idle cash.'
  ]
};

function roleBio(roleTitle, snippet, former, rng, candidateIndex) {
  const pool = ROLE_BIO_LEADS[roleTitle];
  const lead = Array.isArray(pool)
    ? pool[candidateIndex % pool.length]
    : pool ?? `Seasoned ${roleTitle} for high-growth startups.`;
  const extra = pick(
    [
      'Known for crisp board updates.',
      'Brings a network of operators and angels.',
      'Has zero patience for vanity metrics.',
      'Turned around a messy cap table once already.',
      'Still answers Slack from former reports.',
      'Will challenge your hiring plan with data.'
    ],
    rng,
    new Set()
  );
  return `${snippet} Previously at ${former}. ${lead} ${extra}`;
}

export async function generateExecutiveCandidates(state, roleTitle, count = 4) {
  const data = await loadExecNames();
  const rng = mulberry32(runSeed(state) + roleTitle.length * 997 + (state.executives?.roster?.length ?? 0) * 131);
  const usedNames = new Set((state.executives?.roster ?? []).map((e) => e.name));
  const usedSnippets = new Set();
  const candidates = [];

  for (let i = 0; i < count; i++) {
    const first = pick(data.firstNames, rng, new Set());
    const last = pick(data.lastNames, rng, new Set());
    const name = `${first} ${last}`;
    usedNames.add(name);
    const former = pick(data.formerCompanies, rng, new Set());
    const snippet = pick(data.bioSnippets, rng, usedSnippets);
    usedSnippets.add(snippet);
    const tier = getWorkspaceTier(state);
    const salary =
      SALARY_BY_TIER[tier] ??
      SALARY_BY_TIER[WORKSPACE_TIER.SMALL] + Math.floor(rng() * 4_000);
    candidates.push({
      id: `exec-cand-${Date.now()}-${i}-${Math.floor(rng() * 1e6)}`,
      roleTitle: roleTitle.trim() || 'COO',
      name,
      bio: roleBio(roleTitle, snippet, former, rng, i),
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

export function fireExecutive(state, executiveId) {
  const roster = state.executives?.roster ?? [];
  const idx = roster.findIndex((e) => e.id === executiveId);
  if (idx < 0) return { ok: false, reason: 'Executive not found.' };
  const removed = roster[idx];
  state.executives.roster = roster.filter((e) => e.id !== executiveId);
  return { ok: true, removed };
}

export function filledExecutiveTitles(state) {
  return new Set((state.executives?.roster ?? []).map((e) => e.roleTitle));
}

export function availableExecutiveTitles(state, data = execNamesCache) {
  const filled = filledExecutiveTitles(state);
  return (data.suggestedTitles ?? ['COO', 'CFO', 'CTO', 'CMO', 'CRO']).filter((t) => !filled.has(t));
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
        `<div class="org-node org-node-exec"><span class="org-role">${escapeHtml(e.roleTitle)}</span><strong>${escapeHtml(e.name)}</strong><span class="fine-print">${formatMoney(e.salaryMonthly)}/mo · not in headcount cap</span>
        <button type="button" class="btn btn-ghost btn-small" data-fire-exec="${escapeHtml(e.id)}">Release</button></div>`
    )
    .join('');

  const openTitles = availableExecutiveTitles(state, data);
  const titleOptions = openTitles
    .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    .join('');

  const hireBlock =
    open > 0 && openTitles.length > 0 && !state.executives?.pendingHire
      ? `<div class="org-node org-node-open">
          <span class="org-role">Open seat (${open} left)</span>
          <label class="fine-print" for="exec-role-title">Title</label>
          <select id="exec-role-title" class="exec-role-select">${titleOptions}</select>
          <button type="button" class="btn btn-primary btn-small" id="btn-start-exec-hire">Review candidates</button>
        </div>`
    : open > 0 && !openTitles.length && !state.executives?.pendingHire
      ? `<div class="org-node org-node-muted"><span class="org-role">C-suite</span><p class="fine-print">All listed titles are filled — release someone to hire a different role.</p></div>`
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
