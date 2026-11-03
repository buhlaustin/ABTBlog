import { formatMoney, stageLabel } from './GameState.js';
import { getMonthlyTaskSlots } from './Calendar.js';
import { nextRevenueMilestone } from './Progression.js';
import { renderFinancePanel } from './Fundraising.js';
import { renderPeoplePanel } from './Staff.js';
import { renderSocialPlaceholder } from './Social.js';
import { renderNewsPlaceholder } from './News.js';
import { renderAdvisorPlaceholder } from './Advisor.js';
import { getTaskDef, pendingTasks, canEndMonth } from './Tasks.js';

const screens = {
  start: () => document.getElementById('screen-start'),
  setup: () => document.getElementById('screen-setup'),
  game: () => document.getElementById('screen-game'),
  xcInterview: () => document.getElementById('screen-xc-interview'),
  gameover: () => document.getElementById('screen-gameover')
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
  const mrr = document.getElementById('hud-mrr');

  if (company) company.textContent = state.company.name;
  if (stage) stage.textContent = stageLabel(state.stage);
  if (cash) cash.textContent = formatMoney(state.finance.cash);
  if (revenue) revenue.textContent = formatMoney(state.finance.lifetimeRevenue);
  if (month) {
    month.textContent = `M${state.calendar.monthIndex}, Y${state.calendar.year}`;
  }
  if (mode) {
    const econ = state.company.economics;
    const mult = econ ? ` · rev×${econ.revenueMult.toFixed(2)}` : '';
    mode.textContent = `${state.mode === 'sandbox' ? 'Sandbox' : 'Career'}${mult}`;
  }
  if (mrr) mrr.textContent = formatMoney(state.finance.mrr ?? 0);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderDeskPanel(state) {
  const desk = document.getElementById('panel-desk');
  if (!desk) return;

  const slots = getMonthlyTaskSlots(state.stage);
  const pending = pendingTasks(state);
  const done = state.calendar.tasksCompleted ?? 0;
  const milestone = nextRevenueMilestone(state);
  const ms = milestone
    ? `${milestone.label} at ${formatMoney(milestone.amount)}`
    : 'All major gates cleared';

  const taskCards = (state.calendar.monthTasks ?? [])
    .map((inst) => {
      const def = getTaskDef(inst.taskId);
      if (!def) return '';
      const doneClass = inst.status === 'done' ? 'task-card done' : 'task-card';
      const btn =
        inst.status === 'pending'
          ? `<button type="button" class="btn btn-primary btn-small" data-complete-task="${escapeHtml(inst.instanceId)}">Complete</button>`
          : '<span class="task-done-label">Done</span>';
      return `<article class="${doneClass}">
        <h3>${escapeHtml(def.title)}</h3>
        <p>${escapeHtml(def.description)}</p>
        <p class="task-meta">Cost ~${formatMoney(def.cost)} · Revenue band ${formatMoney(def.revenue?.[0] ?? 0)}–${formatMoney(def.revenue?.[1] ?? 0)}</p>
        ${btn}
      </article>`;
    })
    .join('');

  const endDisabled = !canEndMonth(state);
  const monthRev = state.calendar.monthRevenue ?? 0;
  const monthSpend = state.calendar.monthSpend ?? 0;

  desk.innerHTML = `
    <p class="panel-lede">Complete all counted tasks, then close the month. Staff/finance changes do not use task slots.</p>
    <div class="summary-grid">
      <div><span class="stat-label">Tasks</span><span class="stat-value">${done} / ${slots}</span></div>
      <div><span class="stat-label">This month</span><span class="stat-value">+${formatMoney(monthRev)} / -${formatMoney(monthSpend)}</span></div>
      <div><span class="stat-label">Next gate</span><span class="stat-value">${escapeHtml(ms)}</span></div>
      <div><span class="stat-label">Pending</span><span class="stat-value">${pending.length}</span></div>
    </div>
    <div class="task-list">${taskCards || '<div class="tab-placeholder">No tasks dealt.</div>'}</div>
    <div class="desk-actions">
      <button type="button" id="btn-end-month" class="btn btn-primary" ${endDisabled ? 'disabled' : ''} title="${endDisabled ? 'Finish remaining tasks first' : 'Apply overhead and start next month'}">Close month</button>
      <p id="desk-feedback" class="desk-feedback" hidden></p>
    </div>
    <section class="month-log">
      <h3 class="log-head">Recent log</h3>
      <ul>${(state.calendar.log ?? [])
        .slice(0, 6)
        .map(
          (e) =>
            `<li><span class="log-when">Y${e.year} M${e.month}</span> ${escapeHtml(e.message)}</li>`
        )
        .join('') || '<li class="muted">No events yet.</li>'}</ul>
    </section>
  `;
}

export function showDeskFeedback(message, isError = false) {
  const el = document.getElementById('desk-feedback');
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
  el.classList.toggle('error', isError);
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
  renderDeskPanel(state);

  const product = document.getElementById('panel-product');
  if (product) {
    product.innerHTML = `
      <p class="panel-lede">Product strength feeds task outcomes (revenue multiplier).</p>
      <div class="summary-grid">
        <div><span class="stat-label">Product level</span><span class="stat-value">${state.product.level ?? 0}</span></div>
        <div><span class="stat-label">Buzz</span><span class="stat-value">${state.product.buzz ?? 0}</span></div>
        <div><span class="stat-label">Category</span><span class="stat-value">${escapeHtml(state.company.categoryLabel)}</span></div>
      </div>
    `;
  }

  const growth = document.getElementById('panel-growth');
  if (growth) {
    growth.innerHTML = `
      <p class="panel-lede">Marketing and sales tasks appear on the Desk each month.</p>
      <div class="tab-placeholder">${escapeHtml(state.company.categoryLabel)} — use Desk tasks to grow this month.</div>
    `;
  }

  renderPeoplePanel(document.getElementById('panel-people'), state);

  renderFinancePanel(document.getElementById('panel-finance'), state);

  renderSocialPlaceholder(document.getElementById('panel-social'));
  renderNewsPlaceholder(document.getElementById('panel-news'), state);
  renderAdvisorPlaceholder(document.getElementById('panel-advisor'));
}

export function renderGameOver(state) {
  const title = document.getElementById('gameover-title');
  const body = document.getElementById('gameover-body');
  if (title) title.textContent = state.company.name;
  if (body) {
    body.innerHTML = `
      <p>${escapeHtml(state.flags.gameOverReason || 'Your run ended.')}</p>
      <p>Lifetime revenue: <strong>${formatMoney(state.finance.lifetimeRevenue)}</strong></p>
      <p>Months played: <strong>${(state.calendar.year - 1) * 12 + state.calendar.monthIndex - 1}</strong></p>
    `;
  }
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
