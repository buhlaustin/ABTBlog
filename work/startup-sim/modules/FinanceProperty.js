import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { getArr } from './Workspace.js';
import { accrueFiscalExpense, accrueFiscalRevenue } from './CorporateTax.js';
import { calendarTurn } from './GameCalendar.js';
import {
  escapeHtml,
  panelStatCard,
  panelMetricGrid,
  panelMetricGroup,
  panelSnapshotSection
} from './PanelChrome.js';
import bundledPrograms from '../data/finance-property-programs.json' with { type: 'json' };

const MAX_PURCHASE_QTY = 12;
const REV_MULT_CAP_FROM_PROPERTY = 0.45;
const LADDER_SYNERGY_REV_MULT = 0.035;
const SCALE_UNITS_PER_STEP = 6;
const SCALE_BONUS_PER_STEP = 0.008;
const SCALE_BONUS_CAP = 0.04;
const LADDER_MRR_YIELD_MULT = 1.1;

let programsCache = null;

function bundledProgramsList() {
  return bundledPrograms?.programs ?? [];
}

export async function preloadFinancePropertyPrograms() {
  if (programsCache?.length) return programsCache;
  try {
    const remote = await fetchGameJson('data/finance-property-programs.json');
    const list = remote?.programs ?? [];
    programsCache = list.length >= bundledProgramsList().length ? list : bundledProgramsList();
  } catch {
    programsCache = bundledProgramsList();
  }
  return programsCache;
}

export function getFinancePropertyProgramsSync() {
  return programsCache?.length ? programsCache : bundledProgramsList();
}

export function getPropertyProgramForCategory(categoryId) {
  return getFinancePropertyProgramsSync().find((p) => p.categoryId === categoryId) ?? null;
}

export function getPropertyProgram(state) {
  const categoryId = state.company?.categoryId ?? state.company?.category;
  return getPropertyProgramForCategory(categoryId);
}

export function getPropertyTier(tierId) {
  for (const program of getFinancePropertyProgramsSync()) {
    const tier = program.tiers?.find((t) => t.id === tierId);
    if (tier) return { program, tier };
  }
  return null;
}

export function createInitialFinancePropertyState() {
  return {
    holdings: [],
    lifetimeCapex: 0,
    lifetimeOpex: 0,
    lifetimeMrrGranted: 0,
    lifetimeContractedCash: 0,
    history: []
  };
}

function trackCompanyExpense(state, amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (!n || !state.finance) return;
  state.finance.lifetimeExpenses = (state.finance.lifetimeExpenses ?? 0) + n;
  accrueFiscalExpense(state, n);
  state.finance.lifetimeProfit = (state.finance.lifetimeRevenue ?? 0) - state.finance.lifetimeExpenses;
}

function ensureFinanceProperty(state) {
  if (!state.financeProperty) {
    state.financeProperty = createInitialFinancePropertyState();
  }
  const bag = state.financeProperty;
  if (!bag.holdings) bag.holdings = [];
  if (!bag.history) bag.history = [];
  if (bag.lifetimeContractedCash == null) bag.lifetimeContractedCash = 0;
  return bag;
}

export function propertyUnlocked(state) {
  const program = getPropertyProgram(state);
  if (!program) return false;
  if (program.requiresSeed && !state.flags?.seedRoundClosed) return false;
  return true;
}

export function propertyFinanceTabVisible(state) {
  const program = getPropertyProgram(state);
  if (!program) return false;
  if (program.requiresSeed && !state.flags?.seedRoundClosed) return false;
  return true;
}

function holdingsForTier(state, tierId) {
  const bag = ensureFinanceProperty(state);
  return bag.holdings.find((h) => h.tierId === tierId)?.quantity ?? 0;
}

function propertyLadderComplete(state, program) {
  const tiers = program?.tiers ?? [];
  if (tiers.length < 2) return false;
  return tiers.every((t) => holdingsForTier(state, t.id) >= 1);
}

function propertyScaleBonus(totalUnits) {
  const steps = Math.floor(totalUnits / SCALE_UNITS_PER_STEP);
  return Math.min(SCALE_BONUS_CAP, steps * SCALE_BONUS_PER_STEP);
}

function rawHoldingsTotals(state) {
  const bag = ensureFinanceProperty(state);
  let units = 0;
  let opexMo = 0;
  let revMult = 0;
  let mrrGrant = 0;
  for (const h of bag.holdings) {
    const resolved = getPropertyTier(h.tierId);
    if (!resolved) continue;
    const { tier } = resolved;
    const q = h.quantity ?? 0;
    units += q;
    opexMo += q * (tier.opexEachMo ?? 0);
    revMult += q * (tier.revenueMultEach ?? 0);
    mrrGrant += q * (tier.mrrGrantEach ?? 0);
  }
  return { units, opexMo, revMult, mrrGrant };
}

export function propertyHoldingsSummary(state) {
  const program = getPropertyProgram(state);
  const raw = rawHoldingsTotals(state);
  const bag = ensureFinanceProperty(state);
  const ladderComplete = program ? propertyLadderComplete(state, program) : false;
  const scaleBonus = propertyScaleBonus(raw.units);
  const synergyBonus = ladderComplete ? LADDER_SYNERGY_REV_MULT : 0;
  let revMult = raw.revMult + synergyBonus + scaleBonus;
  revMult = Math.min(REV_MULT_CAP_FROM_PROPERTY, revMult);
  const mrrYieldMult = ladderComplete ? LADDER_MRR_YIELD_MULT : 1;
  const mrrGrantMonthly = Math.round(raw.mrrGrant * mrrYieldMult);

  return {
    holdings: bag.holdings,
    totalUnits: raw.units,
    opexMonthly: Math.round(raw.opexMo),
    baseRevenueMultBonus: Math.round(raw.revMult * 1000) / 1000,
    synergyBonus,
    scaleBonus,
    ladderComplete,
    revenueMultBonus: Math.round(revMult * 1000) / 1000,
    mrrGrantMonthly,
    mrrYieldMult,
    lifetimeCapex: bag.lifetimeCapex ?? 0,
    lifetimeOpex: bag.lifetimeOpex ?? 0,
    lifetimeMrrGranted: bag.lifetimeMrrGranted ?? 0,
    lifetimeContractedCash: bag.lifetimeContractedCash ?? 0
  };
}

export function propertyRevenueMultBonus(state) {
  return propertyHoldingsSummary(state).revenueMultBonus;
}

export function propertyMrrGrantMonthly(state) {
  return propertyHoldingsSummary(state).mrrGrantMonthly;
}

export function propertyOpexMonthly(state) {
  return propertyHoldingsSummary(state).opexMonthly;
}

export function previewPropertyAcquire(state, tierId, quantityRaw) {
  const gate = canAcquireFinanceProperty(state, tierId, quantityRaw);
  if (!gate.ok) return gate;
  const { tier, qty, capex, program } = gate;
  const before = propertyHoldingsSummary(state);
  const addRev = qty * (tier.revenueMultEach ?? 0);
  const addOpex = qty * (tier.opexEachMo ?? 0);
  const addMrr = qty * (tier.mrrGrantEach ?? 0);
  const afterUnits = before.totalUnits + qty;
  const afterScale = propertyScaleBonus(afterUnits);
  const willCompleteLadder =
    program.tiers?.every((t) => {
      const held = holdingsForTier(state, t.id) + (t.id === tier.id ? qty : 0);
      return held >= 1;
    }) ?? false;
  const synergyAfter = willCompleteLadder ? LADDER_SYNERGY_REV_MULT : before.synergyBonus;
  const revAfter = Math.min(
    REV_MULT_CAP_FROM_PROPERTY,
    before.baseRevenueMultBonus + addRev + synergyAfter + afterScale
  );
  return {
    ok: true,
    capex,
    qty,
    tier,
    addOpexMonthly: addOpex,
    addMrrBooked: addMrr,
    revMultAfter: revAfter,
    opexAfter: before.opexMonthly + addOpex,
    mrrCashAfter: Math.round((before.mrrGrantMonthly / (before.mrrYieldMult || 1) + addMrr) * (willCompleteLadder ? LADDER_MRR_YIELD_MULT : before.mrrYieldMult))
  };
}

function pushPropertyHistory(state, entry) {
  const bag = ensureFinanceProperty(state);
  bag.history.unshift({
    ...entry,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  if (bag.history.length > 20) bag.history.length = 20;
}

function tierArrGate(tier, program, state) {
  const arr = getArr(state);
  const need = tier.minArrEach ?? program.minArr ?? 0;
  if (arr < need) {
    return { ok: false, reason: `Need ${formatMoney(need)} ARR for ${tier.label} (have ${formatMoney(arr)}).` };
  }
  return { ok: true };
}

function tierPrerequisiteGate(state, tier) {
  if (!tier.requiresTierId) return { ok: true };
  const need = tier.requiresTierMinQty ?? 1;
  const have = holdingsForTier(state, tier.requiresTierId);
  if (have < need) {
    const req = getPropertyTier(tier.requiresTierId);
    const label = req?.tier?.label ?? 'prior tier';
    return { ok: false, reason: `Need ${need}× ${label} first (have ${have}).` };
  }
  return { ok: true };
}

export function canAcquireFinanceProperty(state, tierId, quantityRaw) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const program = getPropertyProgram(state);
  if (!program) return { ok: false, reason: 'No property program for your category.' };
  if (!propertyUnlocked(state)) {
    return { ok: false, reason: program.requiresSeed ? 'Close seed to unlock category property deals.' : 'Property not unlocked.' };
  }
  const resolved = getPropertyTier(tierId);
  if (!resolved || resolved.program.categoryId !== program.categoryId) {
    return { ok: false, reason: 'Unknown property tier for your category.' };
  }
  const { tier } = resolved;
  const qty = Math.max(0, Math.min(MAX_PURCHASE_QTY, Math.round(Number(quantityRaw) || 0)));
  if (qty < 1) return { ok: false, reason: 'Choose at least 1 unit.' };
  const arrGate = tierArrGate(tier, program, state);
  if (!arrGate.ok) return arrGate;
  const preGate = tierPrerequisiteGate(state, tier);
  if (!preGate.ok) return preGate;
  const held = holdingsForTier(state, tierId);
  const maxH = tier.maxHoldings ?? 99;
  if (held + qty > maxH) {
    return { ok: false, reason: `Cap ${maxH} ${program.unitPlural ?? 'units'} for ${tier.label} (have ${held}).` };
  }
  const capex = (tier.capexEach ?? 0) * qty;
  const cash = state.finance?.cash ?? 0;
  if (cash < capex) {
    return { ok: false, reason: `Need ${formatMoney(capex)} company cash (have ${formatMoney(cash)}).` };
  }
  return { ok: true, program, tier, qty, capex };
}

function applyPropertyMrrBooked(state, deltaMrr) {
  const n = Math.round(Number(deltaMrr) || 0);
  if (!n || !state.finance) return;
  state.finance.mrr = (state.finance.mrr ?? 0) + n;
  state.finance.arr = Math.round((state.finance.mrr ?? 0) * 12);
}

export function acquireFinanceProperty(state, { tierId, quantityRaw }) {
  const gate = canAcquireFinanceProperty(state, tierId, quantityRaw);
  if (!gate.ok) return gate;
  const { program, tier, qty, capex } = gate;
  state.finance.cash -= capex;
  trackCompanyExpense(state, capex);

  const bag = ensureFinanceProperty(state);
  let row = bag.holdings.find((h) => h.tierId === tier.id);
  if (!row) {
    row = { tierId: tier.id, tierLabel: tier.label, quantity: 0 };
    bag.holdings.push(row);
  }
  row.quantity = (row.quantity ?? 0) + qty;
  row.tierLabel = tier.label;
  bag.lifetimeCapex = (bag.lifetimeCapex ?? 0) + capex;

  const mrrBooked = (tier.mrrGrantEach ?? 0) * qty;
  if (mrrBooked > 0) {
    applyPropertyMrrBooked(state, mrrBooked);
    bag.lifetimeMrrGranted = (bag.lifetimeMrrGranted ?? 0) + mrrBooked;
  }

  let buzz = (tier.buzzEach ?? 0) * qty;
  if (buzz > 0) {
    state.product = state.product ?? { level: 0, buzz: 0 };
    state.product.buzz = (state.product.buzz ?? 0) + buzz;
  }
  const sentimentBump = (tier.sentimentEach ?? 0) * qty;
  if (sentimentBump > 0) {
    state.sentiment = state.sentiment ?? { score: 68 };
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + sentimentBump);
  }

  pushPropertyHistory(state, {
    action: 'acquire',
    tierId: tier.id,
    tierLabel: tier.label,
    quantity: qty,
    capex,
    mrrBooked
  });

  const after = propertyHoldingsSummary(state);
  const unitWord = qty === 1 ? program.unitSingular ?? 'unit' : program.unitPlural ?? 'units';
  const extras = [];
  if (after.ladderComplete) extras.push('full ladder synergy live');
  if (mrrBooked > 0) extras.push(`+${formatMoney(mrrBooked)}/mo booked to ARR`);
  const extraNote = extras.length ? ` (${extras.join('; ')})` : '';
  const summary = `${program.tabTitle}: +${qty} ${tier.label} — ${formatMoney(capex)} capex${extraNote}.`;
  return { ok: true, summary, capex, qty };
}

/** Month-start OPEX and contracted cash yield (MRR already on books from acquire). */
export function tickFinancePropertyAtMonthStart(state) {
  const lines = [];
  if (!propertyUnlocked(state)) return lines;
  const summary = propertyHoldingsSummary(state);
  if (summary.totalUnits <= 0) return lines;

  const opex = summary.opexMonthly;
  if (opex > 0) {
    state.finance.cash = Math.max(0, (state.finance.cash ?? 0) - opex);
    trackCompanyExpense(state, opex);
    ensureFinanceProperty(state).lifetimeOpex = (state.financeProperty.lifetimeOpex ?? 0) + opex;
    lines.push(`Category property OPEX — ${formatMoney(opex)} (${summary.totalUnits} units).`);
  }

  const cashYield = summary.mrrGrantMonthly;
  if (cashYield > 0) {
    state.finance.cash = (state.finance.cash ?? 0) + cashYield;
    state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + cashYield;
    accrueFiscalRevenue(state, cashYield);
    state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + cashYield;
    ensureFinanceProperty(state).lifetimeContractedCash =
      (state.financeProperty.lifetimeContractedCash ?? 0) + cashYield;
    const ladderNote = summary.ladderComplete ? ' (ladder +10% yield)' : '';
    lines.push(`Property contracted yield — ${formatMoney(cashYield)} cash${ladderNote}.`);
  }

  return lines;
}

export function propertyDeskBanner(state) {
  if (!propertyUnlocked(state)) return '';
  const s = propertyHoldingsSummary(state);
  if (s.totalUnits < 1) return '';
  const parts = [];
  if (s.revenueMultBonus > 0) parts.push(`+${(s.revenueMultBonus * 100).toFixed(1)}% desk rev× from property`);
  if (s.mrrGrantMonthly > 0) parts.push(`${formatMoney(s.mrrGrantMonthly)}/mo contracted yield at month start`);
  if (s.opexMonthly > 0) parts.push(`${formatMoney(s.opexMonthly)}/mo property OPEX`);
  if (!parts.length) return '';
  return `<p class="fine-print launch-phase-banner"><strong>${escapeHtml(getPropertyProgram(state)?.tabTitle ?? 'Property')}</strong> — ${escapeHtml(parts.join(' · '))}.</p>`;
}

export function renderFinancePropertyPanel(state) {
  const program = getPropertyProgram(state);
  if (!program) {
    return `<section class="finance-section finance-card">
      <h3 class="finance-section-title">Property</h3>
      <p class="fine-print">No category property program is configured for this company type.</p>
    </section>`;
  }

  if (!propertyUnlocked(state)) {
    return `<section class="finance-section finance-card">
      <h3 class="finance-section-title">${escapeHtml(program.tabTitle)}</h3>
      <p class="fine-print"><strong>${escapeHtml(program.headline)}</strong> — ${escapeHtml(program.blurb)}</p>
      ${program.teaser ? `<p class="fine-print">${escapeHtml(program.teaser)}</p>` : ''}
      <p class="fine-print">Close seed to start acquiring category property.</p>
    </section>`;
  }

  const disabled = state.flags?.gameOver ? 'disabled' : '';
  const summary = propertyHoldingsSummary(state);
  const arr = getArr(state);
  const minArr = program.minArr ?? 0;
  const arrGate =
    arr < minArr
      ? `<p class="finance-alert" role="alert">Need ${formatMoney(minArr)} ARR to acquire (currently ${formatMoney(arr)}).</p>`
      : '';

  const synergyBlock = `<section class="finance-section finance-card">
      <h3 class="finance-section-title">Portfolio synergies</h3>
      <ul class="instrument-list fine-print">
        <li><strong>Full ladder</strong> — own at least 1 unit in every tier → +${(LADDER_SYNERGY_REV_MULT * 100).toFixed(1)}% desk rev× and +10% contracted cash yield.</li>
        <li><strong>Scale</strong> — every ${SCALE_UNITS_PER_STEP} live units → +${(SCALE_BONUS_PER_STEP * 100).toFixed(1)}% desk rev× (cap +${(SCALE_BONUS_CAP * 100).toFixed(0)}%).</li>
        <li><strong>Booked MRR</strong> — enrollment / interchange tiers add to company MRR once at acquire; each month you collect matching cash (not double-counted on MRR).</li>
      </ul>
      ${
        summary.ladderComplete
          ? '<p class="finance-alert finance-alert--ok">Full tier ladder active — synergy bonuses applied.</p>'
          : `<p class="fine-print">${summary.totalUnits} units live · ${program.tiers?.length ?? 0} tiers in your category ladder.</p>`
      }
    </section>`;

  const tierOptions = (program.tiers ?? [])
    .map((t) => {
      const held = holdingsForTier(state, t.id);
      const maxH = t.maxHoldings ?? 99;
      return `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)} — ${formatMoney(t.capexEach ?? 0)} each · ${held}/${maxH} held</option>`;
    })
    .join('');

  const tierCards = (program.tiers ?? [])
    .map((t) => {
      const held = holdingsForTier(state, t.id);
      const effects = [
        t.capacityStat ? escapeHtml(t.capacityStat) : null,
        t.revenueMultEach ? `+${((t.revenueMultEach ?? 0) * 100).toFixed(1)}% desk rev× each` : null,
        t.mrrGrantEach ? `+${formatMoney(t.mrrGrantEach)}/mo booked each` : null,
        t.opexEachMo ? `${formatMoney(t.opexEachMo)}/mo OPEX each` : null
      ]
        .filter(Boolean)
        .join(' · ');
      const gates = [];
      if (t.minArrEach) gates.push(`${formatMoney(t.minArrEach)} ARR`);
      if (t.requiresTierId) {
        const req = getPropertyTier(t.requiresTierId);
        gates.push(`requires ${t.requiresTierMinQty ?? 1}× ${req?.tier?.label ?? 'prior tier'}`);
      }
      const gateLine = gates.length ? `<br><span class="fine-print">Gate: ${escapeHtml(gates.join(' · '))}</span>` : '';
      return `<li><strong>${escapeHtml(t.label)}</strong> — ${escapeHtml(t.detail)}<br><span class="fine-print">${effects} · held ${held}/${t.maxHoldings ?? 99}</span>${gateLine}</li>`;
    })
    .join('');

  const defaultTier = program.tiers?.[0]?.id;
  const preview = defaultTier ? previewPropertyAcquire(state, defaultTier, 1) : null;
  const previewBlock =
    preview?.ok
      ? `<p class="fine-print finance-alert finance-alert--ok" id="property-acquire-preview">Example: 1× ${escapeHtml(preview.tier.label)} → ${formatMoney(preview.capex)} capex · desk rev× → +${(preview.revMultAfter * 100).toFixed(1)}% · OPEX ${formatMoney(preview.opexAfter)}/mo${preview.addMrrBooked ? ` · +${formatMoney(preview.addMrrBooked)} MRR booked` : ''}.</p>`
      : '';

  const holdingRows = summary.holdings.length
    ? summary.holdings
        .map((h) => {
          const resolved = getPropertyTier(h.tierId);
          const tier = resolved?.tier;
          const mrrLine = tier?.mrrGrantEach ? formatMoney((tier.mrrGrantEach ?? 0) * (h.quantity ?? 0)) : '—';
          return `<tr><td>${escapeHtml(h.tierLabel ?? tier?.label ?? h.tierId)}</td><td class="num">${h.quantity ?? 0}</td><td class="num">${tier?.opexEachMo ? formatMoney((tier.opexEachMo ?? 0) * (h.quantity ?? 0)) : '—'}</td><td class="num">${mrrLine}</td></tr>`;
        })
        .join('')
    : `<tr><td colspan="4">No ${escapeHtml(program.unitPlural ?? 'units')} yet — pick a tier below.</td></tr>`;

  const histRows = (state.financeProperty?.history ?? []).length
    ? (state.financeProperty.history ?? [])
        .slice(0, 8)
        .map((h) => {
          const action = h.action === 'acquire' ? 'Acquire' : escapeHtml(h.action ?? '—');
          return `<tr><td>${action}</td><td>${escapeHtml(h.tierLabel ?? '—')}</td><td class="num">+${h.quantity ?? 0}</td><td class="num">${formatMoney(h.capex ?? 0)}</td><td class="fine-print">${escapeHtml(h.year ? `Y${h.year} M${h.month}` : '—')}</td></tr>`;
        })
        .join('')
    : '<tr><td colspan="5">No acquisitions yet.</td></tr>';

  return `
    ${panelSnapshotSection(
      panelMetricGroup(
        escapeHtml(program.tabTitle),
        panelMetricGrid('4', [
          panelStatCard('Units live', String(summary.totalUnits), { hero: summary.totalUnits > 0 }),
          panelStatCard('Desk rev× bonus', summary.revenueMultBonus > 0 ? `+${(summary.revenueMultBonus * 100).toFixed(1)}%` : '—'),
          panelStatCard('Contracted cash/mo', summary.mrrGrantMonthly > 0 ? formatMoney(summary.mrrGrantMonthly) : '—'),
          panelStatCard('OPEX / mo', summary.opexMonthly > 0 ? formatMoney(summary.opexMonthly) : '—')
        ])
      ),
      { ariaLabel: program.tabTitle }
    )}
    ${panelMetricGrid('3', [
      panelStatCard('Ladder synergy', summary.ladderComplete ? 'Active' : '—', {
        tone: summary.ladderComplete ? 'pos' : null
      }),
      panelStatCard('Scale bonus', summary.scaleBonus > 0 ? `+${(summary.scaleBonus * 100).toFixed(1)}%` : '—'),
      panelStatCard('Lifetime yield cash', formatMoney(summary.lifetimeContractedCash))
    ])}
    ${synergyBlock}
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">${escapeHtml(program.headline)}</h3>
      <p class="fine-print">${escapeHtml(program.blurb)}</p>
      ${program.playbook ? `<p class="fine-print"><strong>Playbook:</strong> ${escapeHtml(program.playbook)}</p>` : ''}
      ${arrGate}
      <ul class="instrument-list fine-print">${tierCards}</ul>
      ${previewBlock}
      <div class="finance-inline-form ceo-salary-row">
        <label for="property-tier-select">Tier</label>
        <select id="property-tier-select" ${disabled}>${tierOptions}</select>
        <label for="property-qty-input">${escapeHtml(program.quantityLabel ?? 'Quantity')}</label>
        <input id="property-qty-input" type="number" min="1" max="${MAX_PURCHASE_QTY}" step="1" value="1" ${disabled}>
        <button type="button" class="btn btn-primary btn-small" id="btn-acquire-property" ${disabled}>Acquire</button>
      </div>
      <p class="fine-print">Up to ${MAX_PURCHASE_QTY} per purchase · higher tiers may require prior holdings and ARR · rev× cap ${(REV_MULT_CAP_FROM_PROPERTY * 100).toFixed(0)}% from property.</p>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Your ${escapeHtml(program.unitPlural ?? 'holdings')}</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Tier</th><th>Qty</th><th>OPEX/mo</th><th>Booked MRR</th></tr></thead>
          <tbody>${holdingRows}</tbody>
        </table>
      </div>
      <p class="fine-print">Lifetime capex ${formatMoney(summary.lifetimeCapex)} · OPEX paid ${formatMoney(summary.lifetimeOpex)} · MRR booked ${formatMoney(summary.lifetimeMrrGranted)} · yield cash collected ${formatMoney(summary.lifetimeContractedCash)}.</p>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Recent activity</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Type</th><th>Tier</th><th>Qty</th><th>Capex</th><th>When</th></tr></thead>
          <tbody>${histRows}</tbody>
        </table>
      </div>
    </section>
  `;
}
