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
