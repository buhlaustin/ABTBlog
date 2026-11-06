import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { getTaskStage } from './Workspace.js';
import { payFromPersonalBank } from './CeoEconomics.js';
import { calendarTurn } from './GameCalendar.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';
import bundledWlb from '../data/ceo-wlb-tasks.json' with { type: 'json' };

const WLB_OFFERS_PER_MONTH = 4;
const WLB_MAX_COMPLETE_PER_MONTH = 1;
const HAPPINESS_MIN = 0;
const HAPPINESS_MAX = 100;
const DEFAULT_HAPPINESS = 62;
const MONTHLY_DRIFT_NO_WLB = 2;
const RECENT_WLB_IDS_CAP = 16;
const WLB_LOG_CAP = 20;
const LOW_HAPPINESS_RECOVERY_THRESHOLD = 45;
const RECOVERY_BONUS_HAPPINESS = 2;
const STREAK_BONUS_THRESHOLD = 3;
const STREAK_BONUS_HAPPINESS = 1;

const HAPPINESS_TIERS = [
  { min: 90, label: 'Thriving', tone: 'pos' },
  { min: 76, label: 'Grounded', tone: 'pos' },
  { min: 61, label: 'Balanced', tone: null },
  { min: 46, label: 'Grind mode', tone: null },
  { min: 26, label: 'Running on fumes', tone: 'neg' },
  { min: 0, label: 'Burnt out', tone: 'neg' }
];

let wlbCatalog = null;

function bundledTasks() {
  return bundledWlb?.tasks ?? [];
}

export async function preloadCeoWlbCatalog() {
  if (wlbCatalog?.length) return wlbCatalog;
  try {
    const remote = await fetchGameJson('data/ceo-wlb-tasks.json');
    const remoteTasks = remote?.tasks ?? [];
    wlbCatalog = remoteTasks.length >= bundledTasks().length ? remoteTasks : bundledTasks();
  } catch {
    wlbCatalog = bundledTasks();
  }
  return wlbCatalog;
}

export function getCeoWlbCatalogSync() {
  return wlbCatalog?.length ? wlbCatalog : bundledTasks();
}

export function getCeoWlbCatalogCount() {
  return getCeoWlbCatalogSync().length;
}

export function getCeoWlbTaskById(id) {
  return getCeoWlbCatalogSync().find((t) => t.id === id) ?? null;
}

export function countEligibleCeoWlbTasks(state) {
  const taskStage = getTaskStage(state);
  return getCeoWlbCatalogSync().filter((t) => stageAllowed(t, taskStage)).length;
}

function ensureCeoHappiness(state) {
  if (!state.ceo) return null;
  if (state.ceo.personalHappiness == null) state.ceo.personalHappiness = DEFAULT_HAPPINESS;
  if (!state.ceo.wlbOffers) state.ceo.wlbOffers = [];
  if (!state.ceo.wlbRecentIds) state.ceo.wlbRecentIds = [];
  if (!state.ceo.wlbLog) state.ceo.wlbLog = [];
  if (state.ceo.wlbCompletedThisMonth == null) state.ceo.wlbCompletedThisMonth = 0;
  if (state.ceo.wlbLifetimeCompleted == null) state.ceo.wlbLifetimeCompleted = 0;
  if (state.ceo.wlbStreakMonths == null) state.ceo.wlbStreakMonths = 0;
  return state.ceo;
}

export function personalHappinessScore(state) {
  const ceo = ensureCeoHappiness(state);
  return Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, Math.round(ceo?.personalHappiness ?? DEFAULT_HAPPINESS)));
}

export function personalHappinessLabel(scoreRaw) {
  const score = Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, Math.round(Number(scoreRaw) || 0)));
  const tier = HAPPINESS_TIERS.find((t) => score >= t.min);
  return tier?.label ?? HAPPINESS_TIERS[HAPPINESS_TIERS.length - 1].label;
}

export function personalHappinessTone(scoreRaw) {
  const score = Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, Math.round(Number(scoreRaw) || 0)));
  const tier = HAPPINESS_TIERS.find((t) => score >= t.min);
  return tier?.tone ?? null;
}

function stageAllowed(task, taskStage) {
  const stages = task.stages ?? [];
  return stages.length === 0 || stages.includes(taskStage);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollHappinessGain(task) {
  const [lo, hi] = task.happiness ?? [3, 6];
  const min = Math.min(lo, hi);
  const max = Math.max(lo, hi);
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function applyPersonalHappinessDelta(state, delta, reason = 'Work-life balance') {
  const ceo = ensureCeoHappiness(state);
  if (!ceo || !delta) return 0;
  const prior = personalHappinessScore(state);
  ceo.personalHappiness = Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, prior + Math.round(delta)));
  return ceo.personalHappiness - prior;
}

function pushWlbLog(state, entry) {
  const ceo = ensureCeoHappiness(state);
  ceo.wlbLog.unshift({
    ...entry,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  if (ceo.wlbLog.length > WLB_LOG_CAP) ceo.wlbLog.length = WLB_LOG_CAP;
}

/** Prefer one offer per tag, then fill remaining slots at random. */
function pickDiverseWlbOffers(pool, count) {
  if (pool.length <= count) return shuffle(pool);
  const ordered = shuffle(pool);
  const picked = [];
  const usedTags = new Set();
  for (const task of ordered) {
    if (picked.length >= count) break;
    const tag = task.tag ?? 'Balance';
    if (usedTags.has(tag)) continue;
    usedTags.add(tag);
    picked.push(task);
  }
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((t) => t.id));
    for (const task of ordered) {
      if (picked.length >= count) break;
      if (!pickedIds.has(task.id)) picked.push(task);
    }
  }
  return picked.slice(0, count);
}

function wlbIntensityLabel(intensity) {
  if (intensity === 'deep') return 'Deep reset';
  if (intensity === 'light') return 'Light touch';
  return 'Standard';
}

/** Fresh WLB picks at month start (CEO tab — not desk lineup). */
export function dealCeoWlbOffers(state) {
  const ceo = ensureCeoHappiness(state);
  if (!ceo || state.flags?.gameOver) return;
  ceo.wlbCompletedThisMonth = 0;
  const taskStage = getTaskStage(state);
  const recent = new Set(ceo.wlbRecentIds ?? []);
  const pool = getCeoWlbCatalogSync().filter((t) => stageAllowed(t, taskStage));
  if (!pool.length) {
    ceo.wlbOffers = [];
    return;
  }
  const fresh = pool.filter((t) => !recent.has(t.id));
  const pickFrom = fresh.length >= WLB_OFFERS_PER_MONTH ? fresh : pool;
  const picked = pickDiverseWlbOffers(pickFrom, WLB_OFFERS_PER_MONTH);
  ceo.wlbOffers = picked.map((t) => ({ taskId: t.id, completed: false }));
}

export function canCompleteCeoWlbTask(state, taskId) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const ceo = ensureCeoHappiness(state);
  const offer = ceo?.wlbOffers?.find((o) => o.taskId === taskId && !o.completed);
  if (!offer) return { ok: false, reason: 'That balance task is not available this month.' };
  if ((ceo.wlbCompletedThisMonth ?? 0) >= WLB_MAX_COMPLETE_PER_MONTH) {
    return { ok: false, reason: 'You already took a balance task this month (one per month).' };
  }
  const task = getCeoWlbTaskById(taskId);
  if (!task) return { ok: false, reason: 'Unknown balance task.' };
  const cost = Math.max(0, Math.round(task.personalCost ?? 0));
  if (cost > 0) {
    const bank = state.ceo?.bankBalance ?? 0;
    if (bank < cost) {
      return { ok: false, reason: `Need ${formatMoney(cost)} in your personal bank (have ${formatMoney(bank)}).` };
    }
  }
  return { ok: true, task, offer, cost };
}

export function completeCeoWlbTask(state, taskId) {
  const gate = canCompleteCeoWlbTask(state, taskId);
  if (!gate.ok) return gate;
  const { task, cost } = gate;
  if (cost > 0) {
    const paid = payFromPersonalBank(state, cost, task.title, 'wlb');
    if (paid <= 0) return { ok: false, reason: 'Personal bank is empty.' };
  }
  const ceo = ensureCeoHappiness(state);
  const scoreBefore = personalHappinessScore(state);
  let gain = rollHappinessGain(task);
  const bonusLines = [];
  if (scoreBefore < LOW_HAPPINESS_RECOVERY_THRESHOLD || task.recovery) {
    gain += RECOVERY_BONUS_HAPPINESS;
    bonusLines.push(`recovery +${RECOVERY_BONUS_HAPPINESS}`);
  }
  if ((ceo.wlbStreakMonths ?? 0) >= STREAK_BONUS_THRESHOLD) {
    gain += STREAK_BONUS_HAPPINESS;
    bonusLines.push(`streak +${STREAK_BONUS_HAPPINESS}`);
  }
  const applied = applyPersonalHappinessDelta(state, gain, task.title);
  const score = personalHappinessScore(state);
  const trade = task.tradeoff ?? {};
  const tradeLines = [];
  if (trade.buzz) {
    state.product = state.product ?? { level: 0, buzz: 0 };
    state.product.buzz = Math.max(0, (state.product.buzz ?? 0) + trade.buzz);
    tradeLines.push(`Product buzz ${trade.buzz > 0 ? '+' : ''}${trade.buzz}.`);
  }
  if (trade.sentiment) {
    state.sentiment = state.sentiment ?? { score: 68 };
    state.sentiment.score = Math.max(0, Math.min(100, (state.sentiment.score ?? 68) + trade.sentiment));
    tradeLines.push(`Sentiment ${trade.sentiment > 0 ? '+' : ''}${trade.sentiment}.`);
  }

  const offer = ceo.wlbOffers.find((o) => o.taskId === taskId);
  if (offer) offer.completed = true;
  ceo.wlbCompletedThisMonth = (ceo.wlbCompletedThisMonth ?? 0) + 1;
  ceo.wlbLifetimeCompleted = (ceo.wlbLifetimeCompleted ?? 0) + 1;
  ceo.wlbRecentIds = [taskId, ...(ceo.wlbRecentIds ?? [])].slice(0, RECENT_WLB_IDS_CAP);
  pushWlbLog(state, {
    taskId: task.id,
    title: task.title,
    happinessGain: applied,
    personalCost: cost,
    scoreAfter: score,
    tag: task.tag,
    intensity: task.intensity
  });

  const label = personalHappinessLabel(score);
  const bonusNote = bonusLines.length ? ` (${bonusLines.join(', ')})` : '';
  return {
    ok: true,
    gain: applied,
    score,
    label,
    tradeLines,
    summary: `Balance: “${task.title}” — personal happiness +${applied}${bonusNote} (${score} · ${label}).${tradeLines.length ? ` ${tradeLines.join(' ')}` : ''}`
  };
}

/** Founder grind drift when you skip balance work. */
export function tickPersonalHappinessAtMonthEnd(state) {
  const ceo = ensureCeoHappiness(state);
  if (!ceo) return [];
  const lines = [];
  if ((ceo.wlbCompletedThisMonth ?? 0) >= 1) {
    ceo.wlbStreakMonths = (ceo.wlbStreakMonths ?? 0) + 1;
    if (ceo.wlbStreakMonths >= STREAK_BONUS_THRESHOLD) {
      lines.push(`Balance streak: ${ceo.wlbStreakMonths} months — +${STREAK_BONUS_HAPPINESS} happiness on your next task.`);
    }
  } else {
    if ((ceo.wlbStreakMonths ?? 0) > 0) {
      lines.push(`Balance streak ended at ${ceo.wlbStreakMonths} month(s).`);
    }
    ceo.wlbStreakMonths = 0;
    const lost = applyPersonalHappinessDelta(state, -MONTHLY_DRIFT_NO_WLB, 'Month without balance');
    if (lost < 0) {
      lines.push(`No balance task this month — personal happiness ${lost} (${personalHappinessScore(state)} · ${personalHappinessLabel(personalHappinessScore(state))}).`);
    }
  }
  const score = personalHappinessScore(state);
  if (score < 35 && state.sentiment) {
    state.sentiment.score = Math.max(0, (state.sentiment.score ?? 68) - 1);
    lines.push('Running on empty — street sentiment −1.');
  } else if (score >= 82 && state.sentiment) {
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + 1);
    lines.push('You seem grounded — sentiment +1.');
  }
  return lines;
}

function renderHappinessMeter(score) {
  const pct = Math.max(0, Math.min(100, score));
  const tone = personalHappinessTone(score);
  const toneClass = tone === 'pos' ? ' ceo-happiness--pos' : tone === 'neg' ? ' ceo-happiness--neg' : '';
  return `<div class="ceo-happiness-meter${toneClass}" role="meter" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Personal happiness ${pct}">
    <div class="ceo-happiness-fill" style="width:${pct}%"></div>
  </div>`;
}

export function renderCeoBalanceSection(state, { disabled = '' } = {}) {
  const score = personalHappinessScore(state);
  const label = personalHappinessLabel(score);
  const tone = personalHappinessTone(score);
  const ceo = ensureCeoHappiness(state);
  const offers = ceo?.wlbOffers ?? [];
  const completedMo = ceo?.wlbCompletedThisMonth ?? 0;
  const slotsLeft = Math.max(0, WLB_MAX_COMPLETE_PER_MONTH - completedMo);
  const streak = ceo?.wlbStreakMonths ?? 0;
  const lifetime = ceo?.wlbLifetimeCompleted ?? 0;
  const catalogSize = getCeoWlbCatalogSync().length;
  const eligiblePool = countEligibleCeoWlbTasks(state);

  const offerCards = offers.length
    ? offers
        .map((o) => {
          const task = getCeoWlbTaskById(o.taskId);
          if (!task) return '';
          const cost = Math.max(0, task.personalCost ?? 0);
          const costLine = cost > 0 ? ` · ${formatMoney(cost)} personal` : '';
          const gainLine = `+${task.happiness?.[0] ?? 3}–${task.happiness?.[1] ?? 6} happiness`;
          const intensity = task.intensity ?? 'standard';
          const intensityLine = intensity !== 'standard' ? ` · ${wlbIntensityLabel(intensity)}` : '';
          const recoveryHint =
            score < LOW_HAPPINESS_RECOVERY_THRESHOLD || task.recovery
              ? ` · +${RECOVERY_BONUS_HAPPINESS} recovery bonus`
              : '';
          const streakHint =
            streak >= STREAK_BONUS_THRESHOLD ? ` · +${STREAK_BONUS_HAPPINESS} streak bonus` : '';
          const done = o.completed;
          const btnDisabled =
            disabled || done || slotsLeft <= 0 ? ' disabled' : '';
          return `<article class="finance-card ceo-wlb-card${done ? ' ceo-wlb-card--done' : ''}">
            <p class="ceo-wlb-tag">${escapeHtml(task.tag ?? 'Balance')}${intensity !== 'standard' ? ` · <span class="ceo-wlb-intensity ceo-wlb-intensity--${escapeHtml(intensity)}">${escapeHtml(wlbIntensityLabel(intensity))}</span>` : ''}</p>
            <p><strong>${escapeHtml(task.title)}</strong></p>
            <p class="fine-print">${escapeHtml(task.description)}</p>
            <p class="fine-print">${escapeHtml(gainLine)}${escapeHtml(costLine)}${escapeHtml(intensityLine)}${escapeHtml(recoveryHint)}${escapeHtml(streakHint)}${task.tradeoff ? ' · tradeoffs apply' : ''}</p>
            ${
              done
                ? '<p class="fine-print"><em>Done this month</em></p>'
                : `<button type="button" class="btn btn-ghost btn-small" data-ceo-wlb-complete="${escapeHtml(task.id)}"${btnDisabled}>Do this</button>`
            }
          </article>`;
        })
        .join('')
    : '<p class="fine-print">Balance tasks refresh when the calendar advances.</p>';

  const history = (ceo?.wlbLog ?? []).slice(0, 8);
  const histRows = history.length
    ? history
        .map(
          (h) =>
            `<tr><td>${escapeHtml(h.title ?? '—')}</td><td class="fine-print">${escapeHtml(h.tag ?? '—')}</td><td class="num">+${h.happinessGain ?? 0}</td><td class="fine-print">${escapeHtml(h.year ? `Y${h.year} M${h.month}` : '—')}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="4">No balance tasks yet.</td></tr>';

  return `
    <section class="finance-section finance-card" aria-label="Personal happiness">
      <h3 class="finance-section-title">Personal happiness</h3>
      <p class="fine-print">Separate from company sentiment — how sustainable your founder life feels. Each month you get <strong>${WLB_OFFERS_PER_MONTH}</strong> options (mixed tags) and may complete <strong>${WLB_MAX_COMPLETE_PER_MONTH}</strong>. Below ${LOW_HAPPINESS_RECOVERY_THRESHOLD} happiness, tasks grant a recovery bonus; a ${STREAK_BONUS_THRESHOLD}-month streak adds +${STREAK_BONUS_HAPPINESS} on completion.</p>
      ${renderHappinessMeter(score)}
      ${panelMetricGrid('4', [
        panelStatCard('Happiness', `${score}/100`, { hero: true, tone }),
        panelStatCard('Status', label, { tone }),
        panelStatCard('Streak', streak > 0 ? `${streak} mo` : '—', {
          tone: streak >= STREAK_BONUS_THRESHOLD ? 'pos' : null
        }),
        panelStatCard('Lifetime', `${lifetime} tasks`, { tone: lifetime > 0 ? 'pos' : null })
      ])}
      ${panelMetricGrid('2', [
        panelStatCard('This month', slotsLeft > 0 ? `${slotsLeft} slot left` : 'Done', {
          tone: slotsLeft > 0 ? null : 'pos'
        }),
        panelStatCard('Skip cost', `−${MONTHLY_DRIFT_NO_WLB}/mo`, { tone: 'neg' })
      ])}
    </section>
    <section class="finance-section" aria-label="Work-life balance tasks">
      <h3 class="finance-section-title">Work-life balance</h3>
      <p class="fine-print">${offers.length} options this month · <strong>${eligiblePool}</strong> tasks fit your stage (${catalogSize} total in catalog) · skipping balance work costs ~${MONTHLY_DRIFT_NO_WLB} happiness at month close.</p>
      <div class="ceo-wlb-grid">${offerCards}</div>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Recent balance wins</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Task</th><th>Tag</th><th>Δ</th><th>When</th></tr></thead>
          <tbody>${histRows}</tbody>
        </table>
      </div>
    </section>
  `;
}
