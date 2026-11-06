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
const REV_MULT_CAP_FROM_PROPERTY = 0.38;

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

export function propertyHoldingsSummary(state) {
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
  revMult = Math.min(REV_MULT_CAP_FROM_PROPERTY, revMult);
  return {
    holdings: bag.holdings,
    totalUnits: units,
    opexMonthly: Math.round(opexMo),
    revenueMultBonus: Math.round(revMult * 1000) / 1000,
    mrrGrantMonthly: Math.round(mrrGrant),
    lifetimeCapex: bag.lifetimeCapex ?? 0,
    lifetimeOpex: bag.lifetimeOpex ?? 0,
    lifetimeMrrGranted: bag.lifetimeMrrGranted ?? 0
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

function pushPropertyHistory(state, entry) {
  const bag = ensureFinanceProperty(state);
  bag.history.unshift({
    ...entry,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  if (bag.history.length > 16) bag.history.length = 16;
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
  const minArr = program.minArr ?? 0;
  const arr = getArr(state);
  if (arr < minArr) {
    return { ok: false, reason: `Need ${formatMoney(minArr)} ARR (have ${formatMoney(arr)}).` };
  }
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
    capex
  });

  const unitWord = qty === 1 ? program.unitSingular ?? 'unit' : program.unitPlural ?? 'units';
  const summary = `${program.tabTitle}: +${qty} ${tier.label} (${qty} ${unitWord}) — ${formatMoney(capex)} capex.`;
  return { ok: true, summary, capex, qty };
}

/** Month-start OPEX and contracted enrollment / interchange MRR. */
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

  const mrr = summary.mrrGrantMonthly;
  if (mrr > 0) {
    state.finance.mrr = (state.finance.mrr ?? 0) + mrr;
    state.finance.arr = Math.round((state.finance.mrr ?? 0) * 12);
    state.finance.monthlyRevenue = (state.finance.monthlyRevenue ?? 0) + mrr;
    state.finance.cash = (state.finance.cash ?? 0) + mrr;
    state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + mrr;
    accrueFiscalRevenue(state, mrr);
    state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + mrr;
    ensureFinanceProperty(state).lifetimeMrrGranted = (state.financeProperty.lifetimeMrrGranted ?? 0) + mrr;
    lines.push(`Property contracted yield — +${formatMoney(mrr)} MRR (${formatMoney(mrr * 12)} ARR run-rate).`);
  }

  return lines;
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
        t.revenueMultEach ? `+${((t.revenueMultEach ?? 0) * 100).toFixed(1)}% desk rev× each` : null,
        t.mrrGrantEach ? `+${formatMoney(t.mrrGrantEach)}/mo contracted each` : null,
        t.opexEachMo ? `${formatMoney(t.opexEachMo)}/mo OPEX each` : null
      ]
        .filter(Boolean)
        .join(' · ');
      return `<li><strong>${escapeHtml(t.label)}</strong> — ${escapeHtml(t.detail)}<br><span class="fine-print">${escapeHtml(effects)} · held ${held}/${t.maxHoldings ?? 99}</span></li>`;
    })
    .join('');

  const holdingRows = summary.holdings.length
    ? summary.holdings
        .map((h) => {
          const resolved = getPropertyTier(h.tierId);
          const tier = resolved?.tier;
          return `<tr><td>${escapeHtml(h.tierLabel ?? tier?.label ?? h.tierId)}</td><td class="num">${h.quantity ?? 0}</td><td class="num">${tier?.opexEachMo ? formatMoney((tier.opexEachMo ?? 0) * (h.quantity ?? 0)) : '—'}</td></tr>`;
        })
        .join('')
    : `<tr><td colspan="3">No ${escapeHtml(program.unitPlural ?? 'units')} yet — pick a tier below.</td></tr>`;

  const histRows = (state.financeProperty?.history ?? []).length
    ? (state.financeProperty.history ?? [])
        .slice(0, 6)
        .map(
          (h) =>
            `<tr><td>${escapeHtml(h.tierLabel ?? '—')}</td><td class="num">+${h.quantity ?? 0}</td><td class="num">${formatMoney(h.capex ?? 0)}</td><td class="fine-print">${escapeHtml(h.year ? `Y${h.year} M${h.month}` : '—')}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="4">No acquisitions yet.</td></tr>';

  return `
    ${panelSnapshotSection(
      panelMetricGroup(
        escapeHtml(program.tabTitle),
        panelMetricGrid('4', [
          panelStatCard('Units live', String(summary.totalUnits), { hero: summary.totalUnits > 0 }),
          panelStatCard('Desk rev× bonus', summary.revenueMultBonus > 0 ? `+${(summary.revenueMultBonus * 100).toFixed(1)}%` : '—'),
          panelStatCard('Contracted MRR', summary.mrrGrantMonthly > 0 ? formatMoney(summary.mrrGrantMonthly) : '—'),
          panelStatCard('OPEX / mo', summary.opexMonthly > 0 ? formatMoney(summary.opexMonthly) : '—')
        ])
      ),
      { ariaLabel: program.tabTitle }
    )}
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">${escapeHtml(program.headline)}</h3>
      <p class="fine-print">${escapeHtml(program.blurb)}</p>
      ${arrGate}
      <ul class="instrument-list fine-print">${tierCards}</ul>
      <div class="finance-inline-form ceo-salary-row">
        <label for="property-tier-select">Tier</label>
        <select id="property-tier-select" ${disabled}>${tierOptions}</select>
        <label for="property-qty-input">${escapeHtml(program.quantityLabel ?? 'Quantity')}</label>
        <input id="property-qty-input" type="number" min="1" max="${MAX_PURCHASE_QTY}" step="1" value="1" ${disabled}>
        <button type="button" class="btn btn-primary btn-small" id="btn-acquire-property" ${disabled}>Acquire</button>
      </div>
      <p class="fine-print">Up to ${MAX_PURCHASE_QTY} per purchase · capex hits company cash immediately · OPEX and contracted MRR run at each month start.</p>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Your ${escapeHtml(program.unitPlural ?? 'holdings')}</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Tier</th><th>Qty</th><th>OPEX/mo</th></tr></thead>
          <tbody>${holdingRows}</tbody>
        </table>
      </div>
      <p class="fine-print">Lifetime capex ${formatMoney(summary.lifetimeCapex)} · OPEX paid ${formatMoney(summary.lifetimeOpex)} · contracted yield booked ${formatMoney(summary.lifetimeMrrGranted)}.</p>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Recent acquisitions</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Tier</th><th>Qty</th><th>Capex</th><th>When</th></tr></thead>
          <tbody>${histRows}</tbody>
        </table>
      </div>
    </section>
  `;
}
