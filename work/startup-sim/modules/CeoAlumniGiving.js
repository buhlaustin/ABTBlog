import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { payFromPersonalBank } from './CeoEconomics.js';
import { calendarTurn } from './GameCalendar.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';
import bundledAlmaMaterCatalog from '../data/ceo-alma-maters.json' with { type: 'json' };
import {
  ALUMNI_INVESTMENT_VEHICLES,
  alumniInvestingBalance,
  alumniInvestorRecognitionLabel
} from './CeoAlumniInvesting.js';
import { ensureAlmaMaterGrades, influenceAlmaGradesFromGift, renderAlmaMaterGradesPanel } from './CeoAlmaMaterGrades.js';

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
    blurb: 'Business school wing, research lab, or campus building naming.',
    chips: [500_000, 5_000_000, 25_000_000]
  },
  {
    id: 'research-innovation',
    label: 'Research & innovation fund',
    blurb: 'Labs, endowed chairs, and commercialization bridges.',
    chips: [75_000, 400_000, 2_500_000]
  },
  {
    id: 'entrepreneurship-center',
    label: 'Entrepreneurship center',
    blurb: 'Incubator, demo days, and founder-in-residence stipends.',
    chips: [100_000, 750_000, 4_000_000]
  },
  {
    id: 'arts-culture',
    label: 'Arts & culture endowment',
    blurb: 'Museum wing, performance hall, or visiting artist series.',
    chips: [50_000, 350_000, 3_000_000]
  },
  {
    id: 'diversity-equity',
    label: 'Access & equity fund',
    blurb: 'First-gen scholarships, mentorship, and bridge programs.',
    chips: [25_000, 200_000, 1_500_000]
  },
  {
    id: 'global-programs',
    label: 'Global campus programs',
    blurb: 'Study abroad, satellite campuses, and faculty exchange.',
    chips: [80_000, 500_000, 2_000_000]
  }
];

/** Athletics-specific lanes (also roll into lifetime alumni giving). */
export const ALUMNI_ATHLETICS_PROGRAMS = [
  {
    id: 'boosters',
    label: 'Varsity booster fund',
    blurb: 'Travel, equipment, and game-day operations for all sports.',
    chips: [2_500, 15_000, 75_000]
  },
  {
    id: 'scholarships',
    label: 'Student-athlete scholarships',
    blurb: 'Endowed or annual aid for roster spots — AD sends a personal thank-you video.',
    chips: [25_000, 125_000, 500_000]
  },
  {
    id: 'coaching',
    label: 'Coaching & recruiting',
    blurb: 'Staff retention, recruiting travel, and summer camps.',
    chips: [50_000, 200_000, 1_000_000]
  },
  {
    id: 'facilities',
    label: 'Facilities & training complex',
    blurb: 'Fields, courts, weight room upgrades, and sports medicine space.',
    chips: [150_000, 1_000_000, 8_000_000]
  },
  {
    id: 'stadium',
    label: 'Stadium / arena naming',
    blurb: 'Your name on the press box, concourse, or court — homecoming forever.',
    chips: [500_000, 5_000_000, 20_000_000]
  }
];

const ATHLETICS_BOOSTER_TIERS = [
  { minLifetime: 5_000_000, label: 'Hall of fame donor' },
  { minLifetime: 1_000_000, label: 'Stadium circle' },
  { minLifetime: 250_000, label: 'Team captain club' },
  { minLifetime: 25_000, label: 'Varsity booster club' },
  { minLifetime: 0, label: 'Fan supporter' }
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

export function athleticsBoosterLabel(lifetime) {
  const n = Math.max(0, Number(lifetime) || 0);
  const tier = ATHLETICS_BOOSTER_TIERS.find((t) => n >= t.minLifetime);
  return tier?.label ?? ATHLETICS_BOOSTER_TIERS[ATHLETICS_BOOSTER_TIERS.length - 1].label;
}

export function alumniAthleticsLifetime(state) {
  return Math.max(0, state.ceo?.alumniAthleticsLifetime ?? 0);
}

function ensureAlumniGiving(state) {
  if (!state.ceo) return null;
  if (state.ceo.alumniGivingLifetime == null) state.ceo.alumniGivingLifetime = 0;
  if (state.ceo.alumniAthleticsLifetime == null) state.ceo.alumniAthleticsLifetime = 0;
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

function applyAthleticsGiftEffects(state, amount, program) {
  const lines = [];
  if (amount >= 50_000 && state.product) {
    state.product.buzz = (state.product.buzz ?? 0) + 1;
    lines.push('Sideline feature on the athletics livestream — product buzz +1.');
  }
  if (program?.id === 'stadium' && amount >= 500_000) {
    state.sentiment = state.sentiment ?? { score: 68 };
    const bump = amount >= 5_000_000 ? 3 : 2;
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + bump);
    lines.push(`Stadium naming announcement — sentiment +${bump}.`);
  } else if (amount >= 250_000) {
    state.sentiment = state.sentiment ?? { score: 68 };
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + 1);
    lines.push('Athletics press release — sentiment +1.');
  }
  return lines;
}

function recordAlumniGift(state, { school, fundLabel, fundId, amount, athletics = false, programId = null }) {
  const ceo = ensureAlumniGiving(state);
  ceo.alumniGivingLifetime = (ceo.alumniGivingLifetime ?? 0) + amount;
  if (athletics) {
    ceo.alumniAthleticsLifetime = (ceo.alumniAthleticsLifetime ?? 0) + amount;
  }
  pushAlumniLog(state, {
    fundId,
    fundLabel,
    amount,
    athletics,
    programId,
    schoolId: school.id,
    schoolLabel: school.label
  });
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

  recordAlumniGift(state, {
    school,
    fundLabel: fund.label,
    fundId: fund.id,
    amount: paid,
    athletics: false
  });
  const ceo = ensureAlumniGiving(state);
  const recognition = alumniRecognitionLabel(ceo.alumniGivingLifetime);
  const effectLines = applyAlumniGiftEffects(state, paid);
  const gradeLines = influenceAlmaGradesFromGift(state, { fundId: fund.id, amount: paid, athletics: false });
  return {
    ok: true,
    amount: paid,
    lifetime: ceo.alumniGivingLifetime,
    recognition,
    effectLines,
    gradeLines,
    summary: `Gave ${formatMoney(paid)} to ${school.label} (${fund.label}). Lifetime alumni giving ${formatMoney(ceo.alumniGivingLifetime)} — ${recognition}.${effectLines.length ? ` ${effectLines.join(' ')}` : ''}${gradeLines.length ? ` Campus: ${gradeLines.join('; ')}.` : ''}`
  };
}

export function donateToAlmaMaterAthletics(state, amountRaw, programId = 'boosters') {
  const gate = canDonateToAlmaMater(state, amountRaw);
  if (!gate.ok) return gate;

  const program =
    ALUMNI_ATHLETICS_PROGRAMS.find((p) => p.id === programId) ?? ALUMNI_ATHLETICS_PROGRAMS[0];
  const school = gate.school;
  const fundLabel = `Athletics — ${program.label}`;
  const paid = payFromPersonalBank(state, gate.amount, `${school.shortLabel ?? school.label} — ${fundLabel}`, 'alumni_athletics');
  if (paid <= 0) {
    return { ok: false, reason: 'Personal bank is empty.' };
  }

  recordAlumniGift(state, {
    school,
    fundLabel,
    fundId: `athletics:${program.id}`,
    amount: paid,
    athletics: true,
    programId: program.id
  });
  const ceo = ensureAlumniGiving(state);
  const recognition = alumniRecognitionLabel(ceo.alumniGivingLifetime);
  const booster = athleticsBoosterLabel(ceo.alumniAthleticsLifetime);
  const effectLines = [
    ...applyAlumniGiftEffects(state, paid),
    ...applyAthleticsGiftEffects(state, paid, program)
  ];
  const gradeLines = influenceAlmaGradesFromGift(state, {
    fundId: `athletics:${program.id}`,
    amount: paid,
    athletics: true,
    programId: program.id
  });
  return {
    ok: true,
    amount: paid,
    lifetime: ceo.alumniGivingLifetime,
    athleticsLifetime: ceo.alumniAthleticsLifetime,
    recognition,
    booster,
    effectLines,
    gradeLines,
    summary: `Gave ${formatMoney(paid)} to ${school.label} athletics (${program.label}). Athletics giving ${formatMoney(ceo.alumniAthleticsLifetime)} — ${booster}. Total alumni ${formatMoney(ceo.alumniGivingLifetime)} — ${recognition}.${effectLines.length ? ` ${effectLines.join(' ')}` : ''}${gradeLines.length ? ` Campus: ${gradeLines.join('; ')}.` : ''}`
  };
}

function renderDonationHistory(state) {
  const log = state.ceo?.alumniDonationLog ?? [];
  if (!log.length) return '';
  const rows = log
    .slice(0, 6)
    .map(
      (h) =>
        `<tr><td>${escapeHtml(h.fundLabel ?? '—')}${h.athletics ? ' <span class="task-tag">Athletics</span>' : ''}</td><td class="num">${formatMoney(h.amount)}</td><td class="fine-print">${escapeHtml(h.year ? `Y${h.year} M${h.month}` : '—')}</td></tr>`
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

  const athleticsLifetime = alumniAthleticsLifetime(state);
  const booster = athleticsBoosterLabel(athleticsLifetime);
  const investBalance = alumniInvestingBalance(state);
  const investLifetime = state.ceo?.alumniInvestLifetime ?? 0;
  const investorRecognition = alumniInvestorRecognitionLabel(investLifetime);

  const investBlocks = ALUMNI_INVESTMENT_VEHICLES.map((vehicle) => {
    const pos = state.ceo?.alumniInvestPositions?.[vehicle.id];
    const bal = pos?.balance ?? 0;
    const chips = vehicle.chips
      .map(
        (amt) =>
          `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-alumni-invest="${amt}" data-ceo-alumni-vehicle="${escapeHtml(vehicle.id)}" ${disabled}>${formatMoney(amt)}</button>`
      )
      .join('');
  const withdraw =
    vehicle.withdrawable && bal > 0
      ? `<button type="button" class="btn btn-ghost btn-small" data-ceo-alumni-invest-withdraw="${Math.min(bal, Math.max(1000, Math.round(bal * 0.25)))}" data-ceo-alumni-vehicle="${escapeHtml(vehicle.id)}" ${disabled}>Withdraw ${formatMoney(Math.min(bal, Math.max(1000, Math.round(bal * 0.25))))}</button>`
      : '';
    return `<div class="finance-action ceo-alumni-invest-vehicle">
      <p><strong>${escapeHtml(vehicle.label)}</strong>${bal > 0 ? ` <span class="task-tag">${formatMoney(bal)}</span>` : ''}</p>
      <p class="fine-print">${escapeHtml(vehicle.blurb)}</p>
      <div class="finance-charity-chips">${chips}</div>
      ${withdraw}
    </div>`;
  }).join('');

  const athleticsBlocks = ALUMNI_ATHLETICS_PROGRAMS.map((program) => {
    const chips = program.chips
      .map(
        (amt) =>
          `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-alumni-athletics-give="${amt}" data-ceo-alumni-athletics-program="${escapeHtml(program.id)}" ${disabled}>${formatMoney(amt)}</button>`
      )
      .join('');
    return `<div class="finance-action ceo-alumni-athletics-program">
      <p><strong>${escapeHtml(program.label)}</strong></p>
      <p class="fine-print">${escapeHtml(program.blurb)}</p>
      <div class="finance-charity-chips">${chips}</div>
    </div>`;
  }).join('');

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
    <p class="fine-print">Personal gifts to <strong>${escapeHtml(school.label)}</strong>${regionLabel ? ` (${escapeHtml(regionLabel)}${typeLabel ? ` · ${escapeHtml(typeLabel)}` : ''})` : ''} — gifts, athletics, and <strong>alumni investment sleeves</strong> (DAF, venture LP, endowment pools) from your personal bank. Large gifts can move sentiment and buzz.</p>
    ${panelMetricGrid('3', [
      panelStatCard('Personal bank', formatMoney(bank), { hero: bank > 0 }),
      panelStatCard('Lifetime to alma mater', formatMoney(lifetime), { hero: lifetime > 0 }),
      panelStatCard('Recognition', recognition)
    ])}
    ${panelMetricGrid('3', [
      panelStatCard('Athletics giving', athleticsLifetime > 0 ? formatMoney(athleticsLifetime) : '—', {
        hero: athleticsLifetime > 0
      }),
      panelStatCard('Booster status', booster),
      panelStatCard('Alumni investing', investBalance > 0 ? formatMoney(investBalance) : '—', { hero: investBalance > 0 })
    ])}
    ${panelMetricGrid('2', [
      panelStatCard('Committed to sleeves', investLifetime > 0 ? formatMoney(investLifetime) : '—'),
      panelStatCard('Investor status', investorRecognition)
    ])}
    ${renderAlmaMaterGradesPanel(state)}
    <h4 class="finance-subhead">Alumni investing</h4>
    <p class="fine-print">Capital that stays on campus balance sheets — monthly marks, partial giving credit toward recognition, taxable returns in your personal filing.</p>
    ${investBlocks}
    <h4 class="finance-subhead">Academic &amp; campus funds</h4>
    ${fundBlocks}
    <h4 class="finance-subhead">Athletics funding</h4>
    <p class="fine-print">Support ${escapeHtml(school.shortLabel ?? school.label)} varsity programs from your personal bank. Athletics gifts count toward total alumni recognition and build a separate <strong>booster status</strong> track.</p>
    ${athleticsBlocks}
    <div class="finance-inline-form ceo-salary-row">
      <label class="visually-hidden" for="ceo-alumni-give-input">Custom alumni gift</label>
      <select id="ceo-alumni-fund-select" aria-label="Gift fund" ${disabled}>
        <optgroup label="Academic &amp; campus">
          ${ALUMNI_GIFT_FUNDS.map(
            (f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`
          ).join('')}
        </optgroup>
        <optgroup label="Athletics">
          ${ALUMNI_ATHLETICS_PROGRAMS.map(
            (p) => `<option value="athletics:${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`
          ).join('')}
        </optgroup>
      </select>
      <input id="ceo-alumni-give-input" type="number" min="500" step="500" placeholder="Custom amount" ${disabled}>
      <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-alumni-give-custom" ${disabled}>Give</button>
    </div>
    ${renderDonationHistory(state)}
  </section>`;
}
