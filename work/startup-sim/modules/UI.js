import { formatMoney, stageLabel } from './GameState.js';

const screens = {
  start: () => document.getElementById('screen-start'),
  setup: () => document.getElementById('screen-setup'),
  garage: () => document.getElementById('screen-garage')
};

export function showScreen(name) {
  for (const key of Object.keys(screens)) {
    const el = screens[key]();
    if (el) el.hidden = key !== name;
  }
}

export function populateCategorySelect(selectEl, categories) {
  if (!selectEl) return;
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

export function renderGarageHud(state) {
  const company = document.getElementById('hud-company');
  const stage = document.getElementById('hud-stage');
  const cash = document.getElementById('hud-cash');
  const revenue = document.getElementById('hud-revenue');
  const month = document.getElementById('hud-month');

  if (company) company.textContent = state.company.name;
  if (stage) stage.textContent = stageLabel(state.stage);
  if (cash) cash.textContent = formatMoney(state.finance.cash);
  if (revenue) revenue.textContent = formatMoney(state.finance.lifetimeRevenue);
  if (month) {
    month.textContent = `M${state.calendar.monthIndex}, Y${state.calendar.year}`;
  }
}
