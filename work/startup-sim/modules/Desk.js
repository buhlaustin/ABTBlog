import { getMonthlyTaskSlots } from './constants.js';
import { getTaskStage } from './Workspace.js';
import { getArr } from './Workspace.js';
import {
  needsTaskLineup,
  pendingTasks,
  getTaskDef,
  selectedOfferCount,
  canEndMonth
} from './Tasks.js';
import { hasActiveCrisis } from './Crisis.js';
import { hasActiveDecision } from './DecisionEvents.js';
import { estimateTaskPayoutBand, estimateTaskMrrBand } from './Finance.js';
import { runwayLabel } from './MonthSummary.js';
import { activeModifierLabels } from './ScenarioEffects.js';

/** Why the month may not close yet — for the Desk checklist UI. */
export function deskMonthCloseChecklist(state) {
  const items = [];
  const catalogBroken = Boolean(state.calendar?.taskCatalogError);
  if (catalogBroken) {
    items.push({
      id: 'catalog',
      done: false,
      label: 'Task catalog loaded',
      detail: 'Reload the page if tasks failed to load.'
    });
    return items;
  }

  const lineupOpen = needsTaskLineup(state);
  const slotTarget = state.calendar?.monthTaskSlotTarget ?? getMonthlyTaskSlots(getTaskStage(state));
  const selected = selectedOfferCount(state);
  items.push({
    id: 'lineup',
    done: !lineupOpen,
    label: lineupOpen ? 'Lock desk lineup' : 'Desk lineup locked',
    detail: lineupOpen
      ? `${selected} / ${slotTarget} offers selected — confirm to deal cards.`
      : `${slotTarget} tasks on the active desk.`
  });

  const pending = pendingTasks(state).length;
  items.push({
    id: 'tasks',
    done: pending === 0 && !lineupOpen,
    label: pending ? `Complete desk tasks (${pending} left)` : 'All desk tasks complete',
    detail: pending ? 'Finish every card on the active desk.' : 'Ready for month close.'
  });

  if (hasActiveCrisis(state)) {
    items.push({
      id: 'crisis',
      done: false,
      label: 'Resolve crisis',
      detail: 'Pick a crisis option on the desk before closing.'
    });
  }
  if (hasActiveDecision(state)) {
    items.push({
      id: 'decision',
      done: false,
      label: 'Strategic decision',
      detail: 'Choose an option in the decision block above.'
    });
  }

  return items;
}

export function deskCanCloseSummary(state) {
  return canEndMonth(state)
    ? 'All requirements met — close the month when ready.'
    : 'Finish the open checklist items before closing.';
}

/** Score offers by estimated payout (+ MRR tasks slightly favored). */
export function autoSelectRecommendedLineup(state) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  if (!needsTaskLineup(state)) {
    return { ok: false, reason: 'Lineup is already locked for this month.' };
  }
  const offers = state.calendar?.monthTaskOffers ?? [];
  if (!offers.length) {
    return { ok: false, reason: 'No task offers this month.' };
  }
  const slots =
    state.calendar?.monthTaskSlotTarget ?? getMonthlyTaskSlots(getTaskStage(state));
  const scored = offers
    .map((offer) => {
      const def = getTaskDef(offer.taskId);
      if (!def) return { offer, score: 0 };
      const band = estimateTaskPayoutBand(def, state);
      const mrr = estimateTaskMrrBand(def);
      let score = band.max;
      if (def.whale) score += band.max * 0.15;
      if (def.signature) score += 25_000;
      if (mrr) score += mrr.max * 6;
      if (def.scheduleLaunch) score += 15_000;
      return { offer, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const o of offers) o.selected = false;
  let picked = 0;
  for (let i = 0; i < scored.length && picked < slots; i += 1) {
    if (scored[i].score <= 0) continue;
    scored[i].offer.selected = true;
    picked += 1;
  }
  if (picked < slots) {
    for (const o of offers) {
      if (picked >= slots) break;
      if (!o.selected) {
        o.selected = true;
        picked += 1;
      }
    }
  }
  return {
    ok: true,
    picked,
    slots,
    summary: `Auto-selected ${picked} offer(s) by estimated payout and MRR upside. Review, then lock the lineup.`
  };
}

export function deskCompanyPulse(state) {
  const arr = getArr(state);
  const cash = state.finance?.cash ?? 0;
  const product = state.product?.level ?? 0;
  const buzz = state.product?.buzz ?? 0;
  const runway = runwayLabel(state);
  const modifiers = activeModifierLabels(state);
  const lifetimeTasks = state.meta?.deskTasksLifetime ?? 0;
  return { arr, cash, product, buzz, runway, modifiers, lifetimeTasks };
}

const TYPE_LABELS = {
  sales: 'Sales',
  marketing: 'Marketing',
  product: 'Product',
  engineering: 'Engineering',
  support: 'Support',
  success: 'Success',
  research: 'R&D',
  growth: 'Growth'
};

export function taskTypeChipsHtml(def) {
  const types = [...new Set(def?.types ?? [])].slice(0, 4);
  if (!types.length) return '';
  return types
    .map(
      (t) =>
        `<span class="desk-type-chip">${TYPE_LABELS[t] ?? t}</span>`
    )
    .join('');
}

export function deskOfferPoolSize(state) {
  return (state.calendar?.monthTaskOffers ?? []).length;
}
