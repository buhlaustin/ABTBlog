import { formatMoney } from './constants.js';
import { formatCalendarStamp } from './GameCalendar.js';
import {
  panelStatCard,
  escapeHtml,
  panelMetricGroup,
  panelMetricGrid,
  panelMetricStack
} from './PanelChrome.js';
import { ceoPersonalBankBalance } from './CeoEconomics.js';
import {
  acquisitionsUnlocked,
  portfolioPulseSummary,
  setCompaniesSection,
  totalSubsidiaryMrr,
  portfolioExitValue,
  portfolioInvestedTotal,
  portfolioSynergyMult,
  portfolioMix,
  marketBrief,
  subsidiaryMrr,
  subsidiarySalePrice,
  subsidiaryValuationMark,
  marketPriceLabel,
  categorySynergyMult,
  inferredMarketCategory,
  getAcquisitionCatalog,
  REINVEST_PROGRAMS,
  resolveReinvestProgram,
  monthsHeld,
  holdingIntegrationMrrFactor,
  listMarketTargets,
  isAcquisitionFireSale,
  MARKET_PAGE_SIZE,
  ACQUISITION_DILIGENCE_COST
} from './Acquisitions.js';

export { setCompaniesSection, portfolioPulseSummary };

const catalog = () => getAcquisitionCatalog();

function segmentLabel(segment) {
  if (segment === 'giant') return 'Giant';
  if (segment === 'enterprise') return 'Enterprise';
  if (segment === 'mid') return 'Mid-market';
  return 'Small';
}

function displayName(state, company) {
  return company.isRival ? state.world?.competitor?.name ?? company.name : company.name;
}

function trendBadge(trend) {
  if (trend === 'hot') return '<span class="tag tag-hot">Hot</span>';
  if (trend === 'soft') return '<span class="tag tag-soft">Soft</span>';
  return '<span class="tag tag-fair">Fair</span>';
}

function integrationBar(holding) {
  const left = holding.integrationMonthsLeft ?? 0;
  if (left <= 0) return '<span class="fine-print">Integrated</span>';
  const pct = Math.round(holdingIntegrationMrrFactor(holding) * 100);
  return `<span class="integration-bar" title="${left} month(s) to full MRR"><span style="width:${pct}%"></span></span> <span class="fine-print">${pct}% MRR · ${left} mo left</span>`;
}

function markDriftChip(holding) {
  const mark = subsidiaryValuationMark(holding);
  const driftPct = (Number(holding.lastValuationDriftPct) || 0) * 100;
  if (Math.abs(driftPct) < 0.05) {
    return `<span class="companies-mark-chip">${mark.toFixed(2)}× mark</span>`;
  }
  const tone = driftPct >= 0 ? 'pos' : 'neg';
  const sign = driftPct >= 0 ? '+' : '';
  return `<span class="companies-mark-chip companies-mark-chip--${tone}">${mark.toFixed(2)}× · ${sign}${driftPct.toFixed(1)}% mo</span>`;
}

function renderPortfolioMixBar(mix) {
  const total = (mix.small ?? 0) + (mix.mid ?? 0) + (mix.enterprise ?? 0) + (mix.giant ?? 0);
  if (total <= 0) return '';
  const pct = (n) => Math.max(4, Math.round((n / total) * 100));
  return `<div class="companies-mix-bar" role="img" aria-label="MRR mix by segment">
    <span class="companies-mix-seg companies-mix-seg--small" style="width:${pct(mix.small)}%" title="Small ${formatMoney(mix.small)}/mo"></span>
    <span class="companies-mix-seg companies-mix-seg--mid" style="width:${pct(mix.mid)}%" title="Mid ${formatMoney(mix.mid)}/mo"></span>
    <span class="companies-mix-seg companies-mix-seg--ent" style="width:${pct(mix.enterprise)}%" title="Enterprise ${formatMoney(mix.enterprise)}/mo"></span>
    <span class="companies-mix-seg companies-mix-seg--giant" style="width:${pct(mix.giant)}%" title="Giant ${formatMoney(mix.giant)}/mo"></span>
  </div>
  <p class="fine-print companies-mix-legend">Small ${formatMoney(mix.small)} · Mid ${formatMoney(mix.mid)} · Enterprise ${formatMoney(mix.enterprise)} · Giant ${formatMoney(mix.giant)}</p>`;
}

function renderHoldingCard(state, h, options = {}) {
  const personal = Boolean(options.personal);
  const co = catalog().find((c) => c.id === h.id);
  if (!co) return '';
  const mrr = subsidiaryMrr(state, h, co);
  const exit = subsidiarySalePrice(state, h, co);
  const name = displayName(state, co);
  const costBasis = (h.purchasePrice ?? 0) + (h.investedTotal ?? 0);
  const roi = costBasis > 0 ? ((exit - costBasis) / costBasis) * 100 : 0;
  const roiTone = roi >= 0 ? 'pos' : 'neg';
  const cat = inferredMarketCategory(state, co);
  const syn =
    categorySynergyMult(state, co) > 1
      ? `<span class="tag tag-synergy">${cat === state.company?.categoryId ? 'Vertical fit' : 'Rival lock-in'}</span>`
      : '';
  const pct2 = Math.round(exit * 0.02);
  const pct5 = Math.round(exit * 0.05);
  const pct10 = Math.round(exit * 0.1);
  const defaultProgram = resolveReinvestProgram(h.lastReinvestProgram ?? 'product');
  const programOptions = REINVEST_PROGRAMS.map(
    (p) =>
      `<option value="${escapeHtml(p.id)}"${defaultProgram.id === p.id ? ' selected' : ''}>${escapeHtml(p.label)}</option>`
  ).join('');

  return `<article class="companies-holding-card finance-card">
    <header class="companies-holding-head">
      <div>
        <h4 class="companies-holding-title">${escapeHtml(name)}</h4>
        <p class="fine-print">${escapeHtml(segmentLabel(co.segment))} · held ${monthsHeld(state, h)} mo${personal ? ' · personal deal' : ''} ${syn}</p>
      </div>
      ${markDriftChip(h)}
    </header>
    ${integrationBar(h)}
    ${panelMetricGrid('4', [
      panelStatCard('MRR', `${formatMoney(mrr)}/mo`),
      panelStatCard('Basis', formatMoney(costBasis)),
      panelStatCard('Est. exit', formatMoney(exit)),
      panelStatCard('ROI', `${roi >= 0 ? '+' : ''}${roi.toFixed(0)}%`, { tone: roiTone })
    ])}
    <div class="companies-holding-actions">
      <button type="button" class="btn btn-small btn-danger" ${personal ? `data-acquisition-sell-personal="${escapeHtml(co.id)}"` : `data-acquisition-sell="${escapeHtml(co.id)}"`}>Sell</button>
      ${
        personal
          ? ''
          : `<details class="reinvest-panel companies-reinvest-optional">
        <summary class="fine-print">Optional capital</summary>
        <p class="fine-print">Marks drift monthly — deploy capital only for a health boost.</p>
        <label class="visually-hidden" for="reinvest-program-${escapeHtml(co.id)}">Program</label>
        <select id="reinvest-program-${escapeHtml(co.id)}" class="reinvest-program-select" data-reinvest-program-for="${escapeHtml(co.id)}">${programOptions}</select>
        <p class="fine-print reinvest-program-blurb" data-reinvest-blurb-for="${escapeHtml(co.id)}">${escapeHtml(defaultProgram.blurb)}</p>
        <div class="reinvest-pct-row">
          <button type="button" class="btn btn-ghost btn-small" data-acquisition-reinvest-pick="${escapeHtml(co.id)}" data-reinvest-pct="2">2% · ${formatMoney(pct2)}</button>
          <button type="button" class="btn btn-ghost btn-small" data-acquisition-reinvest-pick="${escapeHtml(co.id)}" data-reinvest-pct="5">5% · ${formatMoney(pct5)}</button>
          <button type="button" class="btn btn-ghost btn-small" data-acquisition-reinvest-pick="${escapeHtml(co.id)}" data-reinvest-pct="10">10% · ${formatMoney(pct10)}</button>
        </div>
        <div class="name-row reinvest-custom-row">
          <label class="fine-print" for="reinvest-pct-${escapeHtml(co.id)}">Custom %</label>
          <input id="reinvest-pct-${escapeHtml(co.id)}" type="number" min="0.5" max="25" step="0.5" value="3" class="reinvest-pct-input" data-reinvest-pct-input="${escapeHtml(co.id)}">
          <button type="button" class="btn btn-primary btn-small" data-acquisition-reinvest-submit="${escapeHtml(co.id)}">Deploy</button>
        </div>
      </details>`
      }
    </div>
  </article>`;
}

function renderPulseSection(state, pulse, mix, marketAll) {
  const synergyPct = `${((pulse.synergy - 1) * 100).toFixed(1)}%`;
  const unrealTone = pulse.unrealized >= 0 ? 'pos' : 'neg';
  const fireIds = state.acquisitions?.fireSaleIds ?? [];
  const fireNote =
    fireIds.length > 0
      ? `<p class="finance-alert finance-alert--ok" role="status"><strong>Fire sales</strong> — ${fireIds.length} target${fireIds.length === 1 ? '' : 's'} at −15% on the Market tab.</p>`
      : '';

  return `
    <section class="finance-section panel-snapshot" aria-label="Portfolio pulse">
      ${panelMetricStack(
        panelMetricGroup(
          'Portfolio performance',
          panelMetricGrid('4', [
            panelStatCard('Portfolio MRR', `${formatMoney(pulse.portfolioMrr)}/mo`, { hero: true }),
            panelStatCard('Est. exit', formatMoney(pulse.exitVal)),
            panelStatCard('Unrealized', formatMoney(pulse.unrealized), { tone: unrealTone }),
            panelStatCard('Synergy stack', synergyPct)
          ])
        ),
        panelMetricGroup(
          'Treasury & market',
          `${panelMetricGrid('4', [
            panelStatCard('Dry powder', formatMoney(pulse.cash)),
            panelStatCard('Cost basis', formatMoney(pulse.invested)),
            panelStatCard('Lifetime MRR paid', formatMoney(pulse.lifetime)),
            panelStatCard('Listed targets', String(marketAll.length))
          ])}<p class="fine-print finance-details-note">Due diligence ${formatMoney(ACQUISITION_DILIGENCE_COST)} · marks ~±3.5%/mo · optional reinvest for health</p>`
        )
      )}
    </section>
    ${pulse.owned ? renderPortfolioMixBar(mix) : ''}
    ${fireNote}`;
}

function renderHoldingsSection(state) {
  const owned = state.acquisitions?.owned ?? [];
  const personal = state.acquisitions?.personalOwned ?? [];
  if (!owned.length && !personal.length) {
    return `<p class="fine-print">No holdings yet — open the <strong>Market</strong> tab (company cash or <strong>Buy personally</strong> from your CEO bank).</p>`;
  }
  const parts = [];
  if (personal.length) {
    parts.push(
      `<h4 class="log-head">Personal portfolio</h4><div class="companies-holding-grid">${personal.map((h) => renderHoldingCard(state, h, { personal: true })).join('')}</div>`
    );
  }
  if (owned.length) {
    parts.push(
      `<h4 class="log-head">Corporate subsidiaries</h4><div class="companies-holding-grid">${owned.map((h) => renderHoldingCard(state, h)).join('')}</div>`
    );
  }
  return parts.join('');
}

function renderMarketSection(state) {
  const cash = state.finance?.cash ?? 0;
  const personalCash = ceoPersonalBankBalance(state);
  const filter = state.acquisitions?.marketSegment ?? 'all';
  const sort = state.acquisitions?.marketSort ?? 'ask';
  const search = state.acquisitions?.marketSearch ?? '';
  const marketAll = listMarketTargets(state);
  const page = state.acquisitions?.marketPage ?? 0;
  const pageSlice = marketAll.slice(page * MARKET_PAGE_SIZE, (page + 1) * MARKET_PAGE_SIZE);
  const maxPage = Math.max(0, Math.ceil(marketAll.length / MARKET_PAGE_SIZE) - 1);
  const filterBtn = (id, label) =>
    `<button type="button" class="companies-filter ${filter === id ? 'active' : ''}" data-companies-filter="${id}">${label}</button>`;

  const marketRows = pageSlice
    .map((co) => {
      const { ask, trend, fair, vsFair } = marketPriceLabel(state, co);
      const name = displayName(state, co);
      const multiple = co.baseMrr > 0 ? (ask / (co.baseMrr * 12)).toFixed(1) : '—';
      const cat = inferredMarketCategory(state, co);
      const fit =
        categorySynergyMult(state, co) > 1
          ? `<span class="tag tag-synergy">Fits ${escapeHtml(state.company?.categoryLabel ?? 'your vertical')}</span>`
          : `<span class="fine-print">${escapeHtml(cat.replace(/-/g, ' '))}</span>`;
      const canAfford = cash >= ask;
      const canAffordPersonal = personalCash >= ask;
      const fire = isAcquisitionFireSale(state, co.id) ? '<span class="tag tag-fire">Fire sale −15%</span> ' : '';
      const diligenced = state.acquisitions?.diligenceReports?.[co.id];
      const ddNote = diligenced
        ? `<span class="fine-print">DD: ~${diligenced.healthRoll}× health${diligenced.hiddenDebt ? ', +1 mo integration' : ''}</span>`
        : '';
      return `<tr>
        <td><strong>${escapeHtml(name)}</strong>${co.isRival ? ' <span class="tag tag-rival">Rival</span>' : ''} ${fire}<br><span class="fine-print">${escapeHtml(co.description)}</span><br>${fit}${ddNote ? `<br>${ddNote}` : ''}</td>
        <td>${escapeHtml(segmentLabel(co.segment))}</td>
        <td class="num">${formatMoney(co.baseMrr)}/mo</td>
        <td class="num">${formatMoney(ask)} ${trendBadge(trend)}<br><span class="fine-print">Fair ~${formatMoney(fair)}${escapeHtml(vsFair ?? '')} · ${multiple}× rev</span></td>
        <td class="num companies-actions">
          <button type="button" class="btn btn-primary btn-small" data-acquisition-buy="${escapeHtml(co.id)}" ${canAfford ? '' : 'disabled'} title="Company cash">Acquire</button>
          <button type="button" class="btn btn-ghost btn-small" data-acquisition-buy-personal="${escapeHtml(co.id)}" ${canAffordPersonal ? '' : 'disabled'} title="CEO personal bank">Buy personally</button>
          ${
            diligenced
              ? ''
              : `<button type="button" class="btn btn-small" data-acquisition-diligence="${escapeHtml(co.id)}" ${cash >= ACQUISITION_DILIGENCE_COST ? '' : 'disabled'}>DD ${formatMoney(ACQUISITION_DILIGENCE_COST)}</button>`
          }
        </td>
      </tr>`;
    })
    .join('');

  return `
    <nav class="companies-filters finance-charity-chips" aria-label="Filter acquisition targets">
      ${filterBtn('all', 'All')}
      ${filterBtn('small', 'Small')}
      ${filterBtn('mid', 'Mid')}
      ${filterBtn('enterprise', 'Enterprise')}
      ${filterBtn('giant', 'Giants')}
      ${filterBtn('rival', 'Rival')}
    </nav>
    <div class="companies-toolbar">
      <label class="companies-search fine-print">Search
        <input type="search" id="companies-market-search" class="companies-search-input" placeholder="Name or niche…" value="${escapeHtml(search)}" autocomplete="off" />
      </label>
      <span class="fine-print companies-sort-label">Sort</span>
      <button type="button" class="companies-filter ${sort === 'ask' ? 'active' : ''}" data-companies-sort="ask">Ask</button>
      <button type="button" class="companies-filter ${sort === 'mrr' ? 'active' : ''}" data-companies-sort="mrr">MRR</button>
      <button type="button" class="companies-filter ${sort === 'multiple' ? 'active' : ''}" data-companies-sort="multiple">Multiple</button>
    </div>
    <div class="table-scroll finance-cap-scroll"><table class="data-table acquisitions-table">
      <thead><tr><th>Target</th><th>Size</th><th>Base MRR</th><th>Ask</th><th></th></tr></thead>
      <tbody>${marketRows || '<tr><td colspan="5">No targets in this filter.</td></tr>'}</tbody>
    </table></div>
    ${
      maxPage > 0
        ? `<div class="companies-pager">
      <button type="button" class="btn btn-small" data-companies-page="prev" ${page <= 0 ? 'disabled' : ''}>Prev</button>
      <span class="fine-print">Page ${page + 1} / ${maxPage + 1}</span>
      <button type="button" class="btn btn-small" data-companies-page="next" ${page >= maxPage ? 'disabled' : ''}>Next</button>
    </div>`
        : ''
    }`;
}

function renderDealsSection(state) {
  const rows = (state.acquisitions?.dealLog ?? [])
    .map(
      (d) =>
        `<li class="companies-deal-row"><strong>${escapeHtml(formatCalendarStamp(d.year, d.month))}</strong> <span class="companies-deal-kind">${escapeHtml(d.kind)}</span> ${escapeHtml(d.name)} — ${formatMoney(d.amount)} <span class="fine-print">${escapeHtml(d.detail ?? '')}</span></li>`
    )
    .join('');
  if (!rows) {
    return '<p class="fine-print">No deals logged yet — buys, optional reinvestments, and exits appear here.</p>';
  }
  return `<ul class="companies-deal-log companies-deal-log--full">${rows}</ul>`;
}

export function renderCompaniesPanel(container, state) {
  if (!container) return;
  const unlocked = acquisitionsUnlocked(state);
  const section = state.acquisitions?.companiesSection ?? 'pulse';
  const pulse = portfolioPulseSummary(state);
  const mix = portfolioMix(state);
  const marketAll = listMarketTargets(state);

  const lockNote = unlocked
    ? ''
    : `<p class="finance-alert finance-alert--tax" role="alert">Complete your <strong>X Combinator batch</strong> to unlock acquisitions.</p>`;

  const rivalNote = state.world?.competitorAcquired
    ? `<p class="finance-alert finance-alert--ok">Rival absorbed — competitor revenue drag removed.</p>`
    : state.world?.competitor
      ? `<p class="fine-print companies-strategic-note"><strong>Strategic target:</strong> ${escapeHtml(state.world.competitor.name)} — rival lock-in + enterprise MRR (3 mo integration).</p>`
      : '';

  const tab = (id, label) =>
    `<button type="button" class="${section === id ? 'active' : ''}" data-companies-tab="${id}">${label}</button>`;

  let sectionHtml = '';
  if (section === 'holdings') sectionHtml = renderHoldingsSection(state);
  else if (section === 'market') sectionHtml = renderMarketSection(state);
  else if (section === 'deals') sectionHtml = renderDealsSection(state);
  else sectionHtml = renderPulseSection(state, pulse, mix, marketAll);

  container.innerHTML = `
    <div class="companies-panel finance-panel">
      <header class="finance-hero companies-hero">
        <p class="panel-lede">Roll up operators for MRR — acquire with company cash or <strong>buy personally</strong> (CEO bank; MRR to your personal account).</p>
        <p class="companies-market-chip" role="status">${escapeHtml(marketBrief(state))}</p>
      </header>
      ${lockNote}
      ${rivalNote}
      <nav class="companies-subtabs people-subtabs" aria-label="Companies sections">
        ${tab('pulse', 'Pulse')}
        ${tab('holdings', `Holdings (${pulse.owned})`)}
        ${tab('market', 'Market')}
        ${tab('deals', 'Deal log')}
      </nav>
      <div class="companies-section-body">${sectionHtml}</div>
    </div>`;
}
