import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { payFromPersonalBank } from './CeoEconomics.js';
import { calendarTurn } from './GameCalendar.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';
import bundledAlmaMaterCatalog from '../data/ceo-alma-maters.json' with { type: 'json' };

const BUILTIN_ALMA_MATERS = Array.isArray(bundledAlmaMaterCatalog) ? bundledAlmaMaterCatalog : [];

const ALUMNI_TYPE_LABELS = {
  research: 'Research university',
  liberal_arts: 'Liberal arts',
  hbcu: 'HBCU',
  community: 'Community college'
};

const REGION_ORDER = [
  'Northeast',
  'Mid-Atlantic',
  'South',
  'Midwest',
  'Mountain',
  'West',
  'Canada',
  'Regional'
];

let almaMaterCache = null;

/** Preset gift lanes — all debited from personal bank. */
export const ALUMNI_GIFT_FUNDS = [
  {
    id: 'annual-fund',
    label: 'Annual fund',
    blurb: 'Reunion giving, class gift, unrestricted alumni fund.',
    chips: [5_000, 25_000, 100_000]
  },
  {
    id: 'scholarship',
    label: 'Scholarship & access',
    blurb: 'Named scholarship or first-gen pipeline support.',
    chips: [50_000, 250_000, 1_000_000]
  },
  {
    id: 'capital',
    label: 'Capital campaign',
    blurb: 'Business school wing, athletics, or research lab naming.',
    chips: [500_000, 5_000_000, 25_000_000]
  }
];

const RECOGNITION_TIERS = [
  { minLifetime: 25_000_000, label: 'Leadership society (naming level)' },
  { minLifetime: 5_000_000, label: 'Campaign cabinet' },
  { minLifetime: 1_000_000, label: 'Trustee circle' },
  { minLifetime: 250_000, label: 'Dean’s council' },
  { minLifetime: 50_000, label: 'Scholarship patron' },
  { minLifetime: 5_000, label: 'Annual fund donor' },
  { minLifetime: 0, label: 'Friend of the university' }
];

export async function preloadCeoAlmaMaterCatalog() {
  if (almaMaterCache) return almaMaterCache;
  almaMaterCache = BUILTIN_ALMA_MATERS;
  if (typeof window !== 'undefined') {
    try {
      const data = await fetchGameJson('data/ceo-alma-maters.json');
      if (Array.isArray(data) && data.length) almaMaterCache = data;
    } catch {
      /* bundled catalog */
    }
  }
  return almaMaterCache;
}

export function alumniSchoolTypeLabel(type) {
  return ALUMNI_TYPE_LABELS[type] ?? 'College or university';
}

export function getAlmaMaterCatalogCount() {
  return getCeoAlmaMaterCatalogSync().length;
}

export function getCeoAlmaMaterCatalogSync() {
  return almaMaterCache ?? BUILTIN_ALMA_MATERS;
}

export function getAlmaMaterById(id) {
  return getCeoAlmaMaterCatalogSync().find((s) => s.id === id) ?? null;
}

export function resolveCompanyAlmaMater(state) {
  const id = state.company?.almaMaterId;
  if (!id) return null;
  return getAlmaMaterById(id);
}

export function defaultAlmaMaterId() {
  return getAlmaMaterById('state-flagship')?.id ?? getAlmaMaterById('maryville-college')?.id ?? 'maryville-college';
}

export function populateAlmaMaterSelect(selectEl) {
  if (!selectEl) return;
  const list = [...getCeoAlmaMaterCatalogSync()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
  const keep = selectEl.querySelector('option[value=""]');
  const prior = selectEl.value;
  selectEl.innerHTML = '';
  if (keep) selectEl.appendChild(keep);

  const byRegion = {};
  for (const school of list) {
    const region = school.region ?? 'Regional';
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(school);
  }
  const regions = [
    ...REGION_ORDER.filter((r) => byRegion[r]?.length),
    ...Object.keys(byRegion).filter((r) => !REGION_ORDER.includes(r)).sort()
  ];
  for (const region of regions) {
    const group = document.createElement('optgroup');
    group.label = region;
    for (const school of byRegion[region]) {
      const opt = document.createElement('option');
      opt.value = school.id;
      const typeNote = school.type ? ` · ${alumniSchoolTypeLabel(school.type)}` : '';
      opt.textContent = `${school.label}${typeNote}`;
      group.appendChild(opt);
    }
    selectEl.appendChild(group);
  }
  if (prior && getAlmaMaterById(prior)) selectEl.value = prior;
}

export function alumniRecognitionLabel(lifetime) {
  const n = Math.max(0, Number(lifetime) || 0);
  const tier = RECOGNITION_TIERS.find((t) => n >= t.minLifetime);
  return tier?.label ?? RECOGNITION_TIERS[RECOGNITION_TIERS.length - 1].label;
}

function ensureAlumniGiving(state) {
  if (!state.ceo) return null;
  if (state.ceo.alumniGivingLifetime == null) state.ceo.alumniGivingLifetime = 0;
  if (!state.ceo.alumniDonationLog) state.ceo.alumniDonationLog = [];
  return state.ceo;
}

function pushAlumniLog(state, entry) {
  const ceo = ensureAlumniGiving(state);
  if (!ceo) return;
  ceo.alumniDonationLog.unshift({
    ...entry,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  if (ceo.alumniDonationLog.length > 16) ceo.alumniDonationLog.length = 16;
}

function applyAlumniGiftEffects(state, amount) {
  const lines = [];
  if (amount >= 25_000) {
    state.sentiment = state.sentiment ?? { score: 68 };
    const bump = amount >= 1_000_000 ? 3 : amount >= 100_000 ? 2 : 1;
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + bump);
    lines.push(`Alumni press release — market sentiment +${bump}.`);
  }
  if (amount >= 100_000 && state.product) {
    state.product.buzz = (state.product.buzz ?? 0) + 1;
    lines.push('Campus keynote clip — product buzz +1.');
  }
  return lines;
}

export function canDonateToAlmaMater(state, amountRaw) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const school = resolveCompanyAlmaMater(state);
  if (!school) return { ok: false, reason: 'Set your alma mater when founding the company.' };
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 500) return { ok: false, reason: 'Minimum alumni gift is $500.' };
  const bal = state.ceo?.bankBalance ?? 0;
  if (bal < amount) {
    return { ok: false, reason: `Personal bank is ${formatMoney(bal)} — cannot give ${formatMoney(amount)}.` };
  }
  return { ok: true, amount, school };
}

export function donateToAlmaMater(state, amountRaw, fundId = 'annual-fund') {
  const gate = canDonateToAlmaMater(state, amountRaw);
  if (!gate.ok) return gate;

  const fund = ALUMNI_GIFT_FUNDS.find((f) => f.id === fundId) ?? ALUMNI_GIFT_FUNDS[0];
  const school = gate.school;
  const label = `${school.shortLabel ?? school.label} — ${fund.label}`;
  const paid = payFromPersonalBank(state, gate.amount, label, 'alumni_giving');
  if (paid <= 0) {
    return { ok: false, reason: 'Personal bank is empty.' };
  }

  const ceo = ensureAlumniGiving(state);
  ceo.alumniGivingLifetime = (ceo.alumniGivingLifetime ?? 0) + paid;
  const recognition = alumniRecognitionLabel(ceo.alumniGivingLifetime);
  pushAlumniLog(state, {
    fundId: fund.id,
    fundLabel: fund.label,
    amount: paid,
    schoolId: school.id,
    schoolLabel: school.label
  });

  const effectLines = applyAlumniGiftEffects(state, paid);
  return {
    ok: true,
    amount: paid,
    lifetime: ceo.alumniGivingLifetime,
    recognition,
    effectLines,
    summary: `Gave ${formatMoney(paid)} to ${school.label} (${fund.label}). Lifetime alumni giving ${formatMoney(ceo.alumniGivingLifetime)} — ${recognition}.${effectLines.length ? ` ${effectLines.join(' ')}` : ''}`
  };
}

function renderDonationHistory(state) {
  const log = state.ceo?.alumniDonationLog ?? [];
  if (!log.length) return '';
  const rows = log
    .slice(0, 6)
    .map(
      (h) =>
        `<tr><td>${escapeHtml(h.fundLabel ?? '—')}</td><td class="num">${formatMoney(h.amount)}</td><td class="fine-print">${escapeHtml(h.year ? `Y${h.year} M${h.month}` : '—')}</td></tr>`
    )
    .join('');
  return `<details class="ceo-debit-details"><summary>Recent alumni gifts</summary>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>Fund</th><th>Amount</th><th>When</th></tr></thead><tbody>${rows}</tbody></table></div>
  </details>`;
}

export function renderCeoAlumniSection(state, { disabled = '' } = {}) {
  const school = resolveCompanyAlmaMater(state);
  const lifetime = state.ceo?.alumniGivingLifetime ?? 0;
  const recognition = alumniRecognitionLabel(lifetime);
  const bank = state.ceo?.bankBalance ?? 0;

  if (!school) {
    return `<section class="finance-section finance-card ceo-alumni-section">
      <h3 class="finance-section-title">Alma mater giving</h3>
      <p class="fine-print">This save has no alma mater on file — start a new run and pick your school on the setup screen.</p>
    </section>`;
  }

  const fundBlocks = ALUMNI_GIFT_FUNDS.map((fund) => {
    const chips = fund.chips
      .map(
        (amt) =>
          `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-alumni-give="${amt}" data-ceo-alumni-fund="${escapeHtml(fund.id)}" ${disabled}>${formatMoney(amt)}</button>`
      )
      .join('');
    return `<div class="finance-action ceo-alumni-fund">
      <p><strong>${escapeHtml(fund.label)}</strong></p>
      <p class="fine-print">${escapeHtml(fund.blurb)}</p>
      <div class="finance-charity-chips">${chips}</div>
    </div>`;
  }).join('');

  const typeLabel = school.type ? alumniSchoolTypeLabel(school.type) : null;
  const regionLabel = school.region ?? null;

  return `<section class="finance-section finance-card ceo-alumni-section" aria-label="Alumni donations">
    <div class="finance-section-head">
      <h3 class="finance-section-title">Alma mater giving</h3>
      <span class="growth-channel-badge growth-channel-badge--inline">${escapeHtml(school.shortLabel ?? school.label)}</span>
    </div>
    <p class="fine-print">Personal gifts to <strong>${escapeHtml(school.label)}</strong>${regionLabel ? ` (${escapeHtml(regionLabel)}${typeLabel ? ` · ${escapeHtml(typeLabel)}` : ''})` : ''} — separate from general philanthropy and from company charity on Finance. Large gifts can move sentiment and buzz; recognition tracks lifetime alumni giving.</p>
    ${panelMetricGrid('3', [
      panelStatCard('Personal bank', formatMoney(bank), { hero: bank > 0 }),
      panelStatCard('Lifetime to alma mater', formatMoney(lifetime), { hero: lifetime > 0 }),
      panelStatCard('Recognition', recognition)
    ])}
    ${fundBlocks}
    <div class="finance-inline-form ceo-salary-row">
      <label class="visually-hidden" for="ceo-alumni-give-input">Custom alumni gift</label>
      <select id="ceo-alumni-fund-select" aria-label="Gift fund" ${disabled}>
        ${ALUMNI_GIFT_FUNDS.map(
          (f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`
        ).join('')}
      </select>
      <input id="ceo-alumni-give-input" type="number" min="500" step="500" placeholder="Custom amount" ${disabled}>
      <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-alumni-give-custom" ${disabled}>Give</button>
    </div>
    ${renderDonationHistory(state)}
  </section>`;
}
