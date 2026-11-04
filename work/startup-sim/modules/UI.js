import { formatMoney, stageLabel } from './constants.js';
import { getMonthlyTaskSlots } from './constants.js';
import { nextRevenueMilestone } from './Progression.js';
import { renderFinancePanel } from './Fundraising.js';
import { renderPeoplePanel } from './Staff.js';
import { renderSocialPanel } from './Social.js';
import { renderNewsPanel } from './News.js';
import { renderAdvisorPanel } from './Advisor.js';
import { getTaskDef, pendingTasks, canEndMonth } from './Tasks.js';
import { hasActiveCrisis } from './Crisis.js';
import { isPublicCompany, founderStakeValue } from './IPO.js';
import { stageIconUrl, applyGameBackdrop } from './Assets.js';
import { playUiClick } from './Audio.js';
import { activeTutorialStep, renderTutorialBanner } from './Tutorial.js';
import { getCategoriesSync } from './Categories.js';
import { canPivot } from './Pivot.js';
import { formatHallHighlights } from './HallOfFame.js';

const screens = {
  start: () => document.getElementById('screen-start'),
  setup: () => document.getElementById('screen-setup'),
  game: () => document.getElementById('screen-game'),
  xcInterview: () => document.getElementById('screen-xc-interview'),
  crisis: () => document.getElementById('screen-crisis'),
  gameover: () => document.getElementById('screen-gameover')
};

export function showScreen(name) {
  for (const key of Object.keys(screens)) {
    const el = screens[key]();
    if (el) el.hidden = key !== name;
  }
  if (name === 'gameover') {
    requestAnimationFrame(() => {
      document.getElementById('gameover-title')?.focus();
    });
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
  if (categories.length > 0) {
    selectEl.value = categories[0].id;
  }
}

export function bindSandboxCashToggle(form) {
  const wrap = document.getElementById('sandbox-cash-wrap');
  const tuning = document.getElementById('sandbox-tuning-wrap');
  if (!form || !wrap) return;

  const sync = () => {
    const mode = form.querySelector('input[name="mode"]:checked')?.value;
    const sandbox = mode === 'sandbox';
    wrap.hidden = !sandbox;
    if (tuning) tuning.hidden = !sandbox;
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

/** Emphasize Continue when a local save exists. */
export function syncStartScreen() {
  const loadBtn = document.getElementById('btn-load');
  const newBtn = document.getElementById('btn-new');
  const hint = document.getElementById('start-save-hint');
  const enabled = loadBtn && !loadBtn.disabled;

  if (loadBtn) {
    loadBtn.textContent = enabled ? 'Continue saved game' : 'Load save';
  }
  if (newBtn && loadBtn) {
    if (enabled) {
      loadBtn.classList.add('btn-primary');
      loadBtn.classList.remove('btn-ghost');
      newBtn.classList.remove('btn-primary');
      newBtn.classList.add('btn-ghost');
    } else {
      loadBtn.classList.remove('btn-primary');
      loadBtn.classList.add('btn-ghost');
      newBtn.classList.add('btn-primary');
      newBtn.classList.remove('btn-ghost');
    }
  }
  if (hint) {
    hint.hidden = !enabled;
  }
}

export function renderGameHud(state) {
  const company = document.getElementById('hud-company');
  const stage = document.getElementById('hud-stage');
  const cash = document.getElementById('hud-cash');
  const revenue = document.getElementById('hud-revenue');
  const month = document.getElementById('hud-month');
  const mode = document.getElementById('hud-mode');
  const mrr = document.getElementById('hud-mrr');
  const stock = document.getElementById('hud-stock');

  const stageArt = document.getElementById('hud-stage-art');
  if (stageArt) {
    stageArt.src = stageIconUrl(state.stage);
    stageArt.alt = stageLabel(state.stage);
  }
  applyGameBackdrop(state);
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
  if (stock) {
    if (isPublicCompany(state)) {
      const pm = state.publicMarket ?? {};
      stock.hidden = false;
      stock.textContent = `${pm.ticker ?? '—'} ${formatMoney(pm.sharePrice ?? 0)}`;
    } else {
      stock.hidden = true;
    }
  }
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

  const slotTarget = state.calendar?.monthTaskSlotTarget ?? getMonthlyTaskSlots(state.stage);
  const pending = pendingTasks(state);
  const done = state.calendar.tasksCompleted ?? 0;
  const milestone = nextRevenueMilestone(state);
  const ms = milestone
    ? milestone.amount != null
      ? `${milestone.label} at ${formatMoney(milestone.amount)}`
      : milestone.label
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

  const catalogError = state.calendar?.taskCatalogError;
  const endDisabled = !canEndMonth(state);
  const monthRev = state.calendar.monthRevenue ?? 0;
  const monthSpend = state.calendar.monthSpend ?? 0;

  const tutorial = renderTutorialBanner(activeTutorialStep(state));

  desk.innerHTML = `
    ${tutorial}
    ${
      catalogError
        ? '<p class="desk-feedback error" role="alert">Task data failed to load — refresh the page. You cannot close the month until tasks are available.</p>'
        : ''
    }
    ${
      hasActiveCrisis(state)
        ? '<p class="desk-feedback error" role="alert">Crisis on the desk — resolve it before closing the month.</p>'
        : ''
    }
    <p class="panel-lede">Complete all counted tasks, then close the month. Staff/finance changes do not use task slots. <span class="fine-print">Keys: 1–8 tabs, M close month.</span></p>
    <div class="summary-grid">
      <div><span class="stat-label">Tasks</span><span class="stat-value">${done} / ${slotTarget}</span></div>
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

export const TAB_ORDER = [
  'desk',
  'product',
  'growth',
  'people',
  'finance',
  'social',
  'news',
  'advisor'
];

export function selectTab(tabId) {
  const nav = document.getElementById('game-tabs');
  if (!nav) return;
  if (!nav.querySelector(`[data-tab="${tabId}"]`)) return;
  activateTab(nav, tabId);
  playUiClick();
}

function activateTab(nav, tab) {
  nav.querySelectorAll('[data-tab]').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
    b.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    const active = panel.dataset.panel === tab;
    panel.hidden = !active;
    panel.tabIndex = active ? 0 : -1;
  });
}

export function bindTabNavigation() {
  const nav = document.getElementById('game-tabs');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    activateTab(nav, btn.dataset.tab);
    playUiClick();
  });

  nav.addEventListener('keydown', (e) => {
    const tabs = [...nav.querySelectorAll('[data-tab]')];
    const current = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (current < 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      tabs[(current + 1) % tabs.length].click();
      tabs[(current + 1) % tabs.length].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tabs[(current - 1 + tabs.length) % tabs.length].click();
      tabs[(current - 1 + tabs.length) % tabs.length].focus();
    }
  });
}

export function bindGameKeyboardShortcuts(getSession, onCloseMonth) {
  document.addEventListener('keydown', (e) => {
    const state = getSession?.();
    const gameScreen = document.getElementById('screen-game');
    if (!state || gameScreen?.hidden) return;

    const tag = e.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
      return;
    }
    if (document.getElementById('month-summary-dialog')?.open) return;

    const num = Number(e.key);
    if (num >= 1 && num <= 8 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const tab = TAB_ORDER[num - 1];
      if (tab) {
        e.preventDefault();
        selectTab(tab);
      }
      return;
    }

    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (canEndMonth(state)) {
        e.preventDefault();
        onCloseMonth?.();
      }
    }
  });
}

export function syncContinueOnOpenOffer(hasSave) {
  const offer = document.getElementById('start-continue-offer');
  if (!offer) return;
  const dismissed = sessionStorage.getItem('startup_sim_resume_dismissed') === '1';
  offer.hidden = !hasSave || dismissed;
}

export function renderAllPanels(state) {
  const saveHint = document.getElementById('save-status');
  if (saveHint && !saveHint.classList.contains('error')) {
    saveHint.hidden = false;
    if (saveHint.textContent !== 'Saved locally' && saveHint.textContent !== 'Save failed') {
      saveHint.textContent = 'Auto-saved on this device';
    }
  }
  renderGameHud(state);
  renderDeskPanel(state);

  renderProductPanel(document.getElementById('panel-product'), state);

  const growth = document.getElementById('panel-growth');
  if (growth) {
    growth.innerHTML = `
      <p class="panel-lede">Marketing and sales tasks appear on the Desk each month.</p>
      <div class="tab-placeholder">${escapeHtml(state.company.categoryLabel)} — use Desk tasks to grow this month.</div>
    `;
  }

  renderPeoplePanel(document.getElementById('panel-people'), state);

  renderFinancePanel(document.getElementById('panel-finance'), state);

  renderSocialPanel(document.getElementById('panel-social'), state);
  renderNewsPanel(document.getElementById('panel-news'), state);
  renderAdvisorPanel(document.getElementById('panel-advisor'), state);
}

export function renderProductPanel(container, state) {
  if (!container) return;
  const pivotAllowed = canPivot(state);
  const categories = getCategoriesSync();
  const options = categories
    .filter((c) => c.id !== state.company.categoryId)
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`
    )
    .join('');

  const pivotBlock = pivotAllowed
    ? `<form id="pivot-form" class="setup-form finance-action">
        <p><strong>One-time pivot</strong> — reposition the company (buzz and board sentiment take a hit).</p>
        <label for="pivot-category">New category</label>
        <select id="pivot-category" name="pivotCategory" required>
          <option value="" disabled selected>Choose new positioning…</option>
          ${options}
        </select>
        <button type="submit" class="btn btn-primary btn-small">Pivot company</button>
      </form>
      <p id="pivot-feedback" class="desk-feedback" hidden></p>`
    : state.flags?.pivotUsed
      ? '<p class="fine-print">You already used your one-time pivot this run.</p>'
      : '';

  container.innerHTML = `
    <p class="panel-lede">Product strength feeds task outcomes (revenue multiplier).</p>
    <div class="summary-grid">
      <div><span class="stat-label">Product level</span><span class="stat-value">${state.product.level ?? 0}</span></div>
      <div><span class="stat-label">Buzz</span><span class="stat-value">${state.product.buzz ?? 0}</span></div>
      <div><span class="stat-label">Category</span><span class="stat-value">${escapeHtml(state.company.categoryLabel)}</span></div>
    </div>
    ${pivotBlock}
  `;
}

export function renderGameOver(state) {
  const title = document.getElementById('gameover-title');
  const body = document.getElementById('gameover-body');
  const exportBtn = document.getElementById('btn-export-run');
  const eyebrow = document.querySelector('#screen-gameover .eyebrow');
  const victory = state.ending?.type === 'cash_out';
  if (exportBtn) exportBtn.hidden = false;

  if (eyebrow) eyebrow.textContent = victory ? 'CEO step-down' : 'Run ended';
  if (title) title.textContent = state.company.name;
  if (body) {
    const months = (state.calendar.year - 1) * 12 + state.calendar.monthIndex - 1;
    if (victory) {
      const e = state.ending;
      body.innerHTML = `
        <p>${escapeHtml(state.flags.gameOverReason || '')}</p>
        ${
          e.pressHeadline
            ? `<blockquote class="ipo-press"><strong>${escapeHtml(e.pressHeadline)}</strong><br>${escapeHtml(e.pressDek || '')}</blockquote>`
            : ''
        }
        ${
          state.meta?.hofHighlights?.length
            ? `<p class="hof-highlight">${escapeHtml(formatHallHighlights(state.meta.hofHighlights))}</p>`
            : ''
        }
        <div class="summary-grid gameover-stats">
          <div><span class="stat-label">Cash-out</span><span class="stat-value">${formatMoney(e.payout)}</span></div>
          <div><span class="stat-label">Share price</span><span class="stat-value">${formatMoney(e.sharePrice)}</span></div>
          <div><span class="stat-label">Founder stake</span><span class="stat-value">${e.founderPct}%</span></div>
          <div><span class="stat-label">Months public</span><span class="stat-value">${e.monthsPublic}</span></div>
          <div><span class="stat-label">Lifetime revenue</span><span class="stat-value">${formatMoney(e.lifetimeRevenue)}</span></div>
          <div><span class="stat-label">Months played</span><span class="stat-value">${months}</span></div>
        </div>
      `;
    } else {
      body.innerHTML = `
        ${
          state.meta?.hofHighlights?.length
            ? `<p class="hof-highlight">${escapeHtml(formatHallHighlights(state.meta.hofHighlights))}</p>`
            : ''
        }
        <p>${escapeHtml(state.flags.gameOverReason || 'Your run ended.')}</p>
        <p>Lifetime revenue: <strong>${formatMoney(state.finance.lifetimeRevenue)}</strong></p>
        <p>Months played: <strong>${months}</strong></p>
        ${
          isPublicCompany(state)
            ? `<p>Founder stake at exit price: <strong>${formatMoney(founderStakeValue(state))}</strong></p>`
            : ''
        }
      `;
    }
  }
}

export function flashSaveStatus(ok) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = ok ? 'Saved locally' : 'Save failed';
  el.classList.toggle('error', !ok);
  el.hidden = false;
  if (ok) {
    setTimeout(() => {
      if (el.textContent === 'Saved locally') {
        el.textContent = 'Auto-saved on this device';
      }
    }, 2500);
  }
}
