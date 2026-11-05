import { fetchGameJson } from './utils.js';
import { progressionTier } from './ProgressionEconomy.js';
import { isPublicCompany } from './IPO.js';
import { launchLifecycleActive } from './LaunchLifecycle.js';
import { applyScenarioEffects, describeScenarioEffects } from './ScenarioEffects.js';
import bundled from '../data/decision-events.json' with { type: 'json' };
import { isXcDemoDayMonth } from './XC.js';

let catalog = bundled;
let hydrated = false;

export function createInitialDecisionState() {
  return { active: null };
}

async function loadCatalog() {
  if (hydrated) return catalog;
  try {
    const data = await fetchGameJson('data/decision-events.json');
    if (data?.events?.length) catalog = data;
  } catch {
    /* bundled */
  }
  hydrated = true;
  return catalog;
}

export function preloadDecisionEvents() {
  return loadCatalog();
}

export function hasActiveDecision(state) {
  return Boolean(state.decision?.active?.choices?.length);
}

/** Roll after month start if no crisis — strategic fork on the desk. */
export async function rollDeskDecision(state) {
  if (state.flags?.gameOver) return null;
  if (state.crisis?.active || state.decision?.active) return null;
  if (isXcDemoDayMonth(state) && !state.xc?.demoDayTaskDone) return null;
  if (!state.decision) state.decision = createInitialDecisionState();

  const tier = progressionTier(state);
  const rollThreshold = 0.2 + (tier >= 3 ? 0.05 : 0);
  if (Math.random() > rollThreshold) return null;

  const { events } = hydrated ? catalog : await loadCatalog();
  const eligible = events.filter((e) => {
    if ((e.minTier ?? 0) > tier) return false;
    if (e.requiresPublic && !isPublicCompany(state)) return false;
    if (e.requiresPreLaunch && !(launchLifecycleActive(state) && state.launch?.phase === 'pre_launch')) {
      return false;
    }
    return true;
  });
  const pool = eligible.length ? eligible : events;
  const weighted = pool.flatMap((e) => Array(Math.max(1, e.weight ?? 1)).fill(e));
  const def = weighted[Math.floor(Math.random() * weighted.length)];
  state.decision.active = {
    id: def.id,
    title: def.title,
    description: def.description,
    choices: def.choices ?? []
  };
  return state.decision.active;
}

export function applyDecisionChoice(state, choiceIndex) {
  const active = state.decision?.active;
  if (!active) return { ok: false, reason: 'No active decision.' };
  const choice = active.choices[choiceIndex];
  if (!choice) return { ok: false, reason: 'Pick an option.' };

  const outcomeLines = applyScenarioEffects(state, choice.effects ?? {}, {
    title: `Decision: ${active.title}`
  });
  const summary = choice.label;
  state.decision.active = null;
  return { ok: true, summary, decisionId: active.id, outcomeLines };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderDeskDecisionBlock(state) {
  const active = state.decision?.active;
  if (!active) return '';
  const buttons = (active.choices ?? [])
    .map((c, i) => {
      const hint = c.hint ?? describeScenarioEffects(c.effects);
      return `<button type="button" class="btn btn-primary decision-choice" data-decision-choice="${i}">
        <span class="decision-choice-label">${escapeHtml(c.label)}</span>
        ${hint ? `<span class="decision-choice-hint">${escapeHtml(hint)}</span>` : ''}
      </button>`;
    })
    .join('');

  return `
    <section class="decision-card" role="region" aria-label="Strategic decision">
      <p class="eyebrow">Decision required</p>
      <h3 class="decision-title">${escapeHtml(active.title)}</h3>
      <p class="decision-lede">${escapeHtml(active.description)}</p>
      <div class="decision-actions">${buttons}</div>
      <p class="fine-print">Choose before you close the month — outcomes hit cash, trust, desk revenue, and fundraising.</p>
    </section>`;
}
