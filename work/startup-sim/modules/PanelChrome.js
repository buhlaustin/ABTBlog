/** Shared stat cards and layout helpers for game tab panels. */

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function panelStatCard(label, value, { hero = false, id = null, tone = null } = {}) {
  const classes = ['finance-stat-card'];
  if (hero) classes.push('finance-stat-card--hero');
  if (tone === 'pos') classes.push('finance-stat-card--pos');
  if (tone === 'neg') classes.push('finance-stat-card--neg');
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  return `<div class="${classes.join(' ')}"><span class="finance-stat-label">${escapeHtml(label)}</span><span class="finance-stat-value"${idAttr}>${value}</span></div>`;
}

/** @param {'2'|'3'|'4'|'fy'|'lifetime'|'single'} variant */
export function panelMetricGrid(variant, cards) {
  const inner = (Array.isArray(cards) ? cards : [cards]).filter(Boolean).join('');
  return `<div class="finance-metric-grid finance-metric-grid--${variant}">${inner}</div>`;
}

export function panelMetricGroup(title, innerHtml, { className = '', lede = '' } = {}) {
  const extra = className ? ` ${className}` : '';
  return `<div class="finance-metric-group${extra}">
    <h4 class="finance-metric-group-title">${escapeHtml(title)}</h4>
    ${lede ? `<p class="fine-print panel-metric-group-lede">${lede}</p>` : ''}
    ${innerHtml}
  </div>`;
}

export function panelMetricStack(...groups) {
  return `<div class="finance-history-groups panel-metric-stack">${groups.filter(Boolean).join('')}</div>`;
}

export function panelSnapshotSection(bodyHtml, { ariaLabel = '', title = '', lede = '' } = {}) {
  const aria = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : '';
  return `<section class="finance-section panel-snapshot"${aria}>
    ${title ? `<h3 class="finance-section-title">${escapeHtml(title)}</h3>` : ''}
    ${lede ? `<p class="fine-print panel-snapshot-lede">${lede}</p>` : ''}
    ${bodyHtml}
  </section>`;
}
