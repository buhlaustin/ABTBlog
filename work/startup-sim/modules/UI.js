import { formatMoney, stageLabel } from './GameState.js';
import { getMonthlyTaskSlots } from './Calendar.js';
import { nextRevenueMilestone } from './Progression.js';
import { renderFinanceSummary } from './Finance.js';
import { renderPeoplePanel } from './Staff.js';
import { renderSocialPlaceholder } from './Social.js';
import { renderNewsPlaceholder } from './News.js';
import { renderAdvisorPlaceholder } from './Advisor.js';

const screens = {
  start: () => document.getElementById('screen-start'),
  setup: () => document.getElementById('screen-setup'),
  game: () => document.getElementById('screen-game')
};

export function showScreen(name) {
  for (const key of Object.keys(screens)) {
    const el = screens[key]();
    if (el) el.hidden = key !== name;
  }
}

export function populateCategorySelect(selectEl, categories) {
  if (!selectEl) return;
  while (selectEl.options.length > 1) {
    selectEl.remove(1);
  }
  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    selectEl.appendChild(opt);
  }
}

export function bindSandboxCashToggle(form) {
  const wrap = document.getElementById('sandbox-cash-wrap');
  if (!form || !wrap) return;

  const sync = () => {
    const mode = form.querySelector('input[name="mode"]:checked')?.value;
    wrap.hidden = mode !== 'sandbox';
  };

  form.addEventListener('change', sync);
  sync();
}

export function setLoadButtonEnabled(enabled) {
  const btn = document.getElementById('btn-load');
  if (!btn) return;
  btn.disabled = !enabled;
  btn.title = enabled ? 'Continue your saved company' : 'No save found';
}

export function renderGameHud(state) {
  const company = document.getElementById('hud-company');
  const stage = document.getElementById('hud-stage');
  const cash = document.getElementById('hud-cash');
  const revenue = document.getElementById('hud-revenue');
  const month = document.getElementById('hud-month');
  const mode = document.getElementById('hud-mode');

  if (company) company.textContent = state.company.name;
  if (stage) stage.textContent = stageLabel(state.stage);
  if (cash) cash.textContent = formatMoney(state.finance.cash);
  if (revenue) revenue.textContent = formatMoney(state.finance.lifetimeRevenue);
  if (month) {
    month.textContent = `M${state.calendar.monthIndex}, Y${state.calendar.year}`;
  }
  if (mode) {
    mode.textContent = state.mode === 'sandbox' ? 'Sandbox' : 'Career';
  }
}

export function bindTabNavigation() {
  const nav = document.getElementById('game-tabs');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    const tab = btn.dataset.tab;
    nav.querySelectorAll('[data-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
    });
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });
  });
}

export function renderAllPanels(state) {
  renderGameHud(state);

  const milestone = nextRevenueMilestone(state);
  const desk = document.getElementById('panel-desk');
  if (desk) {
    const slots = getMonthlyTaskSlots(state.stage);
    const ms = milestone
      ? `${milestone.label} at ${formatMoney(milestone.amount)} revenue`
      : 'All major gates cleared';
    desk.innerHTML = `
      <p class="panel-lede">Monthly counted tasks — Phase 1.</p>
      <div class="summary-grid">
        <div><span class="stat-label">Task slots</span><span class="stat-value">${slots} / month</span></div>
        <div><span class="stat-label">Next gate</span><span class="stat-value">${ms}</span></div>
      </div>
      <div class="tab-placeholder">No tasks queued yet.</div>
    `;
  }

  const product = document.getElementById('panel-product');
  if (product) {
    product.innerHTML = `
      <p class="panel-lede">Research &amp; development queue — Phase 1.</p>
      <div class="tab-placeholder">Product level: ${state.product.researchLevel}</div>
    `;
  }

  const growth = document.getElementById('panel-growth');
  if (growth) {
    growth.innerHTML = `
      <p class="panel-lede">Marketing &amp; sales campaigns — Phase 1.</p>
      <div class="tab-placeholder">${state.company.categoryLabel} playbooks not wired yet.</div>
    `;
  }

  renderPeoplePanel(document.getElementById('panel-people'), state);

  const finance = document.getElementById('panel-finance');
  if (finance) {
    const sum = renderFinanceSummary(state);
    finance.innerHTML = `
      <p class="panel-lede">Burn, runway, cap table — Phase 2 raises.</p>
      <div class="summary-grid">
        <div><span class="stat-label">Cash</span><span class="stat-value">${sum.cashLabel}</span></div>
        <div><span class="stat-label">Burn/mo</span><span class="stat-value">${sum.burnLabel}</span></div>
        <div><span class="stat-label">Runway</span><span class="stat-value">${sum.runway}</span></div>
        <div><span class="stat-label">Founder equity</span><span class="stat-value">${state.capTable[0]?.pct ?? 100}%</span></div>
      </div>
    `;
  }

  renderSocialPlaceholder(document.getElementById('panel-social'));
  renderNewsPlaceholder(document.getElementById('panel-news'));
  renderAdvisorPlaceholder(document.getElementById('panel-advisor'));
}

export function flashSaveStatus(ok) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = ok ? 'Saved' : 'Save failed';
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 2000);
}
