import { fetchGameJson } from './utils.js';
import { formatMoney } from './constants.js';
import { calendarTurn } from './XC.js';
import { progressionTier } from './ProgressionEconomy.js';
import { recordCashOutflow } from './Finance.js';
import { easeCompetitorPressure, bumpCompetitorPressure } from './Competitor.js';
import { setGameFeedback } from './GameFeedback.js';
import bundled from '../data/acquisition-targets.json' with { type: 'json' };

let catalog = bundled.companies ?? [];
let hydrated = false;

export function createInitialAcquisitionsState() {
  return { owned: [] };
}

async function loadCatalog() {
  if (hydrated) return catalog;
  try {
    const data = await fetchGameJson('data/acquisition-targets.json');
    if (Array.isArray(data?.companies) && data.companies.length) catalog = data.companies;
  } catch {
    /* bundled */
  }
  hydrated = true;
  return catalog;
}

export function preloadAcquisitionCatalog() {
  return loadCatalog();
}

export function getAcquisitionCatalog() {
  return catalog;
}

function hash01(seed, id, salt = 0) {
  let h = (seed ^ salt) >>> 0;
  const s = String(id);
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b1);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

export function acquisitionsUnlocked(state) {
  return Boolean(state.flags?.xcResidencyComplete);
}

function ownedIds(state) {
  return new Set((state.acquisitions?.owned ?? []).map((h) => h.id));
}

export function isTargetVisible(state, company) {
  if (company.isRival && company.rivalCategory !== state.company?.categoryId) return false;
  return true;
}

/** Ask price swings monthly with run seed and progression. */
export function targetAskPrice(state, company) {
  if (ownedIds(state).has(company.id)) return null;
  const turn = calendarTurn(state);
  const seed = state.meta?.runSeed ?? 1;
  const vol = 0.82 + hash01(seed, company.id, turn) * 0.38;
  const tierBoost = 1 + progressionTier(state) * 0.035;
  return Math.round(company.basePrice * vol * tierBoost);
}

export function marketPriceLabel(state, company) {
  const ask = targetAskPrice(state, company);
  if (ask == null) return 'Owned';
  const seed = state.meta?.runSeed ?? 1;
  const turn = calendarTurn(state);
  const vol = 0.82 + hash01(seed, company.id, turn) * 0.38;
  const trend = vol >= 1.02 ? 'hot' : vol <= 0.92 ? 'soft' : 'fair';
  return { ask, trend };
}

function holdingHealth(holding) {
  return Math.max(0.55, Math.min(2.2, Number(holding.health) || 1));
}

export function subsidiaryMrr(state, holding, company) {
  if (!company) return 0;
  return Math.max(0, Math.round(company.baseMrr * holdingHealth(holding)));
}

export function totalSubsidiaryMrr(state) {
  if (!state.acquisitions?.owned?.length) return 0;
  let sum = 0;
  for (const h of state.acquisitions.owned) {
    const def = catalog.find((c) => c.id === h.id);
    if (def) sum += subsidiaryMrr(state, h, def);
  }
  return sum;
}

export function subsidiarySalePrice(state, holding, company) {
  const turn = calendarTurn(state);
  const seed = state.meta?.runSeed ?? 1;
  const vol = 0.88 + hash01(seed, `${company.id}-exit`, turn) * 0.28;
  const health = holdingHealth(holding);
  const invested = holding.investedTotal ?? 0;
  const core = company.basePrice * health * vol;
  return Math.round(core + invested * 0.82);
}

export function purchaseTarget(state, targetId) {
  if (!acquisitionsUnlocked(state)) {
    return { ok: false, reason: 'Finish your X Combinator batch before buying companies.' };
  }
  if (!state.acquisitions) state.acquisitions = createInitialAcquisitionsState();
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Company not on the market.' };
  if (!isTargetVisible(state, company)) return { ok: false, reason: 'That target is not in your market.' };
  if (ownedIds(state).has(company.id)) return { ok: false, reason: 'You already own this company.' };

  const price = targetAskPrice(state, company);
  if ((state.finance?.cash ?? 0) < price) {
    return { ok: false, reason: `Need ${formatMoney(price)} cash (you have ${formatMoney(state.finance?.cash ?? 0)}).` };
  }

  state.finance.cash -= price;
  recordCashOutflow(state, price, 'acquisition');
  state.acquisitions.owned.push({
    id: company.id,
    acquiredTurn: calendarTurn(state),
    health: 1,
    investedTotal: 0
  });

  if (company.isRival) {
    state.world.competitorAcquired = true;
    if (state.world?.competitor) state.world.competitor.pressure = 0;
    easeCompetitorPressure(state, 5);
  }

  const mrr = subsidiaryMrr(state, state.acquisitions.owned.at(-1), company);
  return { ok: true, company, price, mrr };
}

export function reinvestInSubsidiary(state, targetId, amountRaw) {
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 5000) return { ok: false, reason: 'Minimum reinvestment is $5,000.' };
  if ((state.finance?.cash ?? 0) < amount) {
    return { ok: false, reason: 'Not enough cash.' };
  }
  const holding = state.acquisitions?.owned?.find((h) => h.id === targetId);
  if (!holding) return { ok: false, reason: 'You do not own that company.' };
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Unknown subsidiary.' };

  state.finance.cash -= amount;
  recordCashOutflow(state, amount, 'acquisition-reinvest');
  holding.investedTotal = (holding.investedTotal ?? 0) + amount;
  const delta = (amount / company.basePrice) * 0.35;
  holding.health = holdingHealth(holding) + delta;

  return {
    ok: true,
    company,
    amount,
    health: holdingHealth(holding),
    mrr: subsidiaryMrr(state, holding, company)
  };
}

export function sellSubsidiary(state, targetId) {
  const idx = state.acquisitions?.owned?.findIndex((h) => h.id === targetId) ?? -1;
  if (idx < 0) return { ok: false, reason: 'You do not own that company.' };
  const holding = state.acquisitions.owned[idx];
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Unknown subsidiary.' };

  const proceeds = subsidiarySalePrice(state, holding, company);
  state.finance.cash += proceeds;
  state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + proceeds;
  state.acquisitions.owned.splice(idx, 1);

  if (company.isRival) {
    state.world.competitorAcquired = false;
    bumpCompetitorPressure(state, 2);
  }

  return { ok: true, company, proceeds };
}

/** Permanent monthly cash from portfolio — called at month close. */
export function applySubsidiaryMrrPayout(state) {
  const total = totalSubsidiaryMrr(state);
  if (!total) return { total: 0, lines: [] };
  state.finance.cash += total;
  state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + total;
  state.finance.subsidiaryMrr = total;
  return {
    total,
    lines: [`Portfolio MRR: +${formatMoney(total)} from subsidiaries.`]
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function segmentLabel(segment) {
  if (segment === 'enterprise') return 'Enterprise';
  if (segment === 'mid') return 'Mid-market';
  return 'Small';
}

export function renderCompaniesPanel(container, state) {
  if (!container) return;
  const unlocked = acquisitionsUnlocked(state);
  const portfolioMrr = totalSubsidiaryMrr(state);
  const owned = state.acquisitions?.owned ?? [];

  const ownedRows = owned
    .map((h) => {
      const co = catalog.find((c) => c.id === h.id);
      if (!co) return '';
      const mrr = subsidiaryMrr(state, h, co);
      const exit = subsidiarySalePrice(state, h, co);
      const displayName = co.isRival ? (state.world?.competitor?.name ?? co.name) : co.name;
      return `<tr>
        <td><strong>${escapeHtml(displayName)}</strong>${co.isRival ? ' <span class="fine-print">(rival)</span>' : ''}<br><span class="fine-print">${escapeHtml(segmentLabel(co.segment))} · health ${holdingHealth(h).toFixed(2)}×</span></td>
        <td class="num">${formatMoney(mrr)}/mo</td>
        <td class="num">${formatMoney(h.investedTotal ?? 0)}</td>
        <td class="num">${formatMoney(exit)}</td>
        <td class="num">
          <button type="button" class="btn btn-small" data-acquisition-reinvest="${escapeHtml(co.id)}">Reinvest</button>
          <button type="button" class="btn btn-small btn-danger" data-acquisition-sell="${escapeHtml(co.id)}">Sell</button>
        </td>
      </tr>`;
    })
    .join('');

  const marketRows = catalog
    .filter((c) => isTargetVisible(state, c) && !ownedIds(state).has(c.id))
    .map((co) => {
      const { ask, trend } = marketPriceLabel(state, co);
      const displayName = co.isRival ? (state.world?.competitor?.name ?? co.name) : co.name;
      const trendNote =
        trend === 'hot' ? ' · sellers market' : trend === 'soft' ? ' · soft ask' : '';
      const canAfford = (state.finance?.cash ?? 0) >= ask;
      return `<tr>
        <td><strong>${escapeHtml(displayName)}</strong>${co.isRival ? ' <span class="fine-print">(your rival)</span>' : ''}<br><span class="fine-print">${escapeHtml(co.description)}</span></td>
        <td>${escapeHtml(segmentLabel(co.segment))}</td>
        <td class="num">${formatMoney(co.baseMrr)}/mo</td>
        <td class="num">${formatMoney(ask)}${trendNote}</td>
        <td class="num"><button type="button" class="btn btn-primary btn-small" data-acquisition-buy="${escapeHtml(co.id)}" ${canAfford ? '' : 'disabled'}>Acquire</button></td>
      </tr>`;
    })
    .join('');

  const lockNote = unlocked
    ? ''
    : `<p class="desk-feedback error" role="alert">Complete your X Combinator batch to unlock acquisitions.</p>`;

  container.innerHTML = `
    <p class="panel-lede">Buy companies for permanent portfolio MRR. Prices move each month; reinvest to raise health, MRR, and exit value.</p>
    ${lockNote}
    <p class="fine-print"><strong>Portfolio MRR:</strong> ${formatMoney(portfolioMrr)}/mo from ${owned.length} subsidiary${owned.length === 1 ? '' : 'ies'}. Paid automatically when you close each month.</p>
    <section class="acquisitions-section">
      <h3 class="panel-subtitle">Your companies</h3>
      ${
        owned.length
          ? `<div class="table-scroll"><table class="data-table acquisitions-table">
        <thead><tr><th>Company</th><th>MRR</th><th>Reinvested</th><th>Est. exit</th><th></th></tr></thead>
        <tbody>${ownedRows}</tbody>
      </table></div>`
          : '<p class="fine-print">No acquisitions yet — browse the market below.</p>'
      }
    </section>
    <section class="acquisitions-section">
      <h3 class="panel-subtitle">Market (${catalog.filter((c) => isTargetVisible(state, c)).length} targets)</h3>
      <div class="table-scroll"><table class="data-table acquisitions-table">
        <thead><tr><th>Target</th><th>Size</th><th>Base MRR</th><th>Ask (dynamic)</th><th></th></tr></thead>
        <tbody>${marketRows || '<tr><td colspan="5">Everything on the market is yours.</td></tr>'}</tbody>
      </table></div>
    </section>
    <p id="companies-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showCompaniesFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
