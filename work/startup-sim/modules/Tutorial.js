import { STAGES } from './constants.js';

const STORAGE_KEY = 'startup-sim-tutorial-dismissed';

const STEPS = [
  {
    id: 'welcome',
    stages: [STAGES.GARAGE],
    title: 'Welcome, founder',
    body: 'Complete every task on the Desk, then use Close month. Cash flow from tasks is immediate; payroll hits on month close.'
  },
  {
    id: 'people',
    stages: [STAGES.OFFICE],
    title: 'Staffing',
    body: 'People tab: adjust department headcount, then Finalize staffing before month close so payroll uses your plan.'
  },
  {
    id: 'xc',
    stages: [STAGES.XC],
    title: 'Batch season',
    body: 'Finish XC-themed tasks, survive three SF months, then pick a hub on Finance and close your seed round.'
  },
  {
    id: 'scale',
    stages: [STAGES.POST_XC],
    title: 'Scale',
    body: 'Higher-revenue tasks unlock after seed. Watch runway on Finance and skim the News tab after each month close.'
  },
  {
    id: 'ipo',
    stages: [STAGES.PUBLIC],
    title: 'Public markets',
    body: 'Stock price updates each month. Stay public to grow the quote, or Step down & cash out on Finance when you are done.'
  }
];

function dismissedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode */
  }
}

export function dismissTutorialStep(stepId) {
  const set = dismissedSet();
  set.add(stepId);
  saveDismissed(set);
}

export function resetTutorialForDev() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function activeTutorialStep(state) {
  const dismissed = dismissedSet();
  const stage = state.stage ?? STAGES.GARAGE;
  for (const step of STEPS) {
    if (step.stages.includes(stage) && !dismissed.has(step.id)) {
      return step;
    }
  }
  return null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderTutorialBanner(step) {
  if (!step) return '';
  return `<aside class="tutorial-banner" role="note" aria-labelledby="tutorial-title">
    <div>
      <p class="tutorial-kicker">Tip</p>
      <p id="tutorial-title" class="tutorial-title">${escapeHtml(step.title)}</p>
      <p class="tutorial-body">${escapeHtml(step.body)}</p>
    </div>
    <button type="button" class="btn btn-ghost btn-small" id="btn-dismiss-tutorial" data-tutorial-id="${escapeHtml(step.id)}">Got it</button>
  </aside>`;
}
