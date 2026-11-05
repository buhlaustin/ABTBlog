import { fetchGameJson } from './utils.js';
import { adjustSentiment } from './Sentiment.js';
import { bumpCompetitorPressure, easeCompetitorPressure } from './Competitor.js';
import { isPublicCompany } from './IPO.js';
import { progressionTier } from './ProgressionEconomy.js';
import bundledCrises from '../data/crises.json' with { type: 'json' };

let crisisCatalog = bundledCrises;
let crisesHydrated = false;

export function createInitialCrisisState() {
  return { active: null };
}

async function loadCrises() {
  if (crisesHydrated) return crisisCatalog;
  try {
    const data = await fetchGameJson('data/crises.json');
    if (data && Array.isArray(data.crises) && data.crises.length > 0) {
      crisisCatalog = data;
    }
  } catch {
    /* keep bundled crises */
  }
  crisesHydrated = true;
  return crisisCatalog;
}

export function preloadCrisisCatalog() {
  return loadCrises();
}

export async function rollMonthStartCrisis(state) {
  if (state.flags?.gameOver) return null;
  if (state.crisis?.active) return state.crisis.active;
  if (!state.crisis) state.crisis = createInitialCrisisState();
  const pressure = state.world?.competitor?.pressure ?? 0;
  const tier = progressionTier(state);
  const rollThreshold = 0.12 + Math.min(0.08, pressure * 0.015) + (tier >= 5 ? 0.04 : 0);
  if (Math.random() > rollThreshold) return null;

  const { crises } = crisesHydrated ? crisisCatalog : await loadCrises();
  if (!crises?.length) return null;
  const eligible = crises.filter((c) => {
    if ((c.minTier ?? 0) > tier) return false;
    if (c.requiresPublic && !isPublicCompany(state)) return false;
    return true;
  });
  const pool = eligible.length ? eligible : crises;
  const weighted = pool.flatMap((c) => Array(Math.max(1, c.weight ?? 1)).fill(c));
  const def = weighted[Math.floor(Math.random() * weighted.length)];
  state.crisis.active = {
    id: def.id,
    title: def.title,
    description: def.description,
    choices: def.choices ?? []
  };
  return state.crisis.active;
}

export function hasActiveCrisis(state) {
  return Boolean(state.crisis?.active?.choices?.length);
}

export function applyCrisisChoice(state, choiceIndex) {
  const active = state.crisis?.active;
  if (!active) return { ok: false, reason: 'No active crisis.' };
  const choice = active.choices[choiceIndex];
  if (!choice) return { ok: false, reason: 'Pick an option.' };

  const fx = choice.effects ?? {};
  if (fx.cash) state.finance.cash = (state.finance.cash ?? 0) + Number(fx.cash);
  if (fx.buzz) state.product.buzz = (state.product.buzz ?? 0) + Number(fx.buzz);
  if (fx.sentiment) adjustSentiment(state, Number(fx.sentiment), `Crisis: ${active.title}`);
  if (fx.competitor > 0) bumpCompetitorPressure(state, fx.competitor);
  if (fx.competitor < 0) easeCompetitorPressure(state, Math.abs(fx.competitor));

  if (isPublicCompany(state) && fx.stockPct) {
    const pm = state.publicMarket;
    const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
    const next = Math.max((pm.ipoPrice ?? price) * 0.2, price * (1 + Number(fx.stockPct)));
    pm.sharePrice = Math.round(next * 100) / 100;
  }

  const summary = choice.label;
  state.crisis.active = null;
  return { ok: true, summary, crisisId: active.id };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderCrisisPanel(container, state) {
  if (!container) return;
  const active = state.crisis?.active;
  if (!active) {
    container.innerHTML = '';
    return;
  }
  const buttons = (active.choices ?? [])
    .map(
      (c, i) =>
        `<button type="button" class="btn btn-primary crisis-choice" data-crisis-choice="${i}">${escapeHtml(c.label)}</button>`
    )
    .join('');

  container.innerHTML = `
    <p class="eyebrow">Crisis card</p>
    <h2>${escapeHtml(active.title)}</h2>
    <p class="lede">${escapeHtml(active.description)}</p>
    <div class="crisis-actions">${buttons}</div>
    <p class="fine-print">Pick a path before you close the month — this does not replace a desk task.</p>
  `;
}
