import { STAGES } from './constants.js';

const STORAGE_KEY = 'startup-sim-tutorial-dismissed';

const STEPS = [
  {
    id: 'welcome',
    stages: [STAGES.GARAGE],
    title: 'Welcome, founder',
    body: 'Early game is pre-launch: product tasks raise level (need 4+); marketing raises buzz (need 10+). Track waitlist and pre-sell on the desk meters, then Schedule public launch. Close month when tasks are done.'
  },
  {
    id: 'people',
    stages: [STAGES.OFFICE],
    title: 'Staffing',
    body: 'People tab: Staffing for headcount, Employee perks for bonuses/offsites, Option pool to refresh ESOP — finalize staffing before month close.'
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
    body: 'On Finance: set guidance tone, run buybacks, or a follow-on. Earnings every 3 months swing the quote harder. Beat the whisper each month to extend your streak, then cash out when lockup ends.'
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
