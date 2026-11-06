import { fetchGameJson } from './utils.js';
import { STAGES, formatMoney } from './constants.js';
import { applyScenarioEffects } from './ScenarioEffects.js';
import { applyXCSafe } from './CapTable.js';
import { restorePostXcWorkspace } from './Workspace.js';
import { syncCooSalaryToWorkspace } from './Coo.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import bundledInterview from '../data/xc-interview.json' with { type: 'json' };
import {
  calendarTurn,
  calendarTurnAt,
  turnToCalendar,
  formatCalendarMonth
} from './GameCalendar.js';
import { CHATXGPT_LAUNCH_CATEGORY } from './LaunchLifecycle.js';

/** Four batches per year: W Jan–Mar, Y Apr–Jun, S Jul–Sep, F Oct–Dec. */
export const XC_SEASON_STARTS = [
  { code: 'W', month: 1 },
  { code: 'Y', month: 4 },
  { code: 'S', month: 7 },
  { code: 'F', month: 10 }
];

export function seasonCodeForBatchStartMonth(monthIndex) {
  return XC_SEASON_STARTS.find((s) => s.month === monthIndex)?.code ?? null;
}

/** First batch season start strictly after the acceptance month. */
export function nextXcBatchStart(acceptYear, acceptMonth) {
  const y = Number(acceptYear);
  const m = Number(acceptMonth);
  for (let yr = y; yr <= y + 1; yr++) {
    for (const season of XC_SEASON_STARTS) {
      if (yr === y && season.month <= m) continue;
      return { year: yr, monthIndex: season.month, code: season.code };
    }
  }
  return { year: y + 1, monthIndex: 1, code: 'W' };
}

export function formatXcBatchCode(year, monthIndex) {
  const code = seasonCodeForBatchStartMonth(monthIndex);
  const yy = String(Number(year) || 0).slice(-2);
  return `XC ${code ?? '?'}${yy}`;
}

export { calendarTurn };

export const XC_DEMO_DAY_TASK_ID = 'xc-demo-day';
export const XC_DEMO_DAY_DECISION_ID = 'xc-demo-day-pitch';
export const AI_POST_BATCH_API_RELEASE_TASK_ID = 'cat-ai-tools-post-batch-api-release';

export const DEFAULT_SEED_ROUND_TERMS = {
  raised: 3_000_000,
  preMoney: 12_000_000,
  postMoney: 15_000_000
};

/** Last month of the 3-month XC residency (Demo Day month). */
export function isXcDemoDayMonth(state) {
  return Boolean(isInResidency(state) && (state.xc?.residencyMonthsRemaining ?? 0) === 1);
}

/** AI apps: mandatory desk task the first month after XC batch ends (API GA). */
export function isAiPostBatchApiReleaseMonth(state) {
  if (state.company?.categoryId !== CHATXGPT_LAUNCH_CATEGORY) return false;
  if (!state.flags?.xcResidencyComplete) return false;
  if (!state.xc?.demoDayTaskDone) return false;
  if (state.xc?.postBatchApiReleaseDone) return false;
  return Boolean(state.xc?.postBatchApiReleasePending);
}

export function onPostBatchApiReleaseTaskCompleted(state) {
  state.xc = state.xc ?? createInitialXcState();
  state.xc.postBatchApiReleaseDone = true;
  state.xc.postBatchApiReleasePending = false;
  state.product.buzz = (state.product.buzz ?? 0) + 2;
  return {
    ok: true,
    summary: 'ChatXGPT API is live — developers have keys, docs, and the first rate-limit blog post.'
  };
}

export function getSeedRoundTerms(state) {
  const t = state.xc?.seedRoundTerms;
  if (t?.raised && t?.postMoney) {
    return {
      raised: t.raised,
      preMoney: t.preMoney ?? t.postMoney - t.raised,
      postMoney: t.postMoney
    };
  }
  return { ...DEFAULT_SEED_ROUND_TERMS };
}

export function seedRoundTermsNote(state) {
  const pitch = state.xc?.demoDayPitch;
  if (!pitch) return null;
  if (pitch === 'focused') {
    return 'Demo Day focused pitch — investors leaned in; seed terms improved vs. batch median.';
  }
  if (pitch === 'lean') {
    return 'Demo Day capital-efficient pitch — lean seed terms and a Finance “lean close” option.';
  }
  if (pitch === 'bold') {
    return state.xc.demoDayBoldHit
      ? 'Demo Day moonshot landed — hot seed round at a premium valuation.'
      : 'Demo Day swing missed — smaller seed at a softer valuation.';
  }
  return null;
}

let interviewCache = bundledInterview;

export async function loadInterviewQuestions() {
  try {
    const data = await fetchGameJson('data/xc-interview.json');
    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
      interviewCache = data;
    }
  } catch {
    /* keep bundled questions */
  }
  return interviewCache;
}

export function createInitialXcState() {
  return {
    residencyMonthsRemaining: 0,
    batchLabel: null,
    retryAvailableTurn: null,
    needsFollowUpQuestion: false,
    batchStartsTurn: null,
    scheduledBatchCode: null,
    demoDayTaskDone: false,
    demoDayPitch: null,
    demoDayBoldHit: null,
    seedRoundTerms: null,
    graduateBoostMonths: 0,
    postBatchApiReleasePending: false,
    postBatchApiReleaseDone: false
  };
}

export function xcWaitingForRetry(state) {
  const retry = state.xc?.retryAvailableTurn;
  if (retry == null) return false;
  return calendarTurn(state) < retry;
}

export function canStartInterview(state) {
  if (!state.flags?.xcUnlocked || state.flags?.xcAccepted) return false;
  if (xcWaitingForRetry(state)) return false;
  return true;
}

/** True during the 3-month SF batch (desk tasks are XC-only). */
export function isInResidency(state) {
  return Boolean(state.flags?.xcBatchActive && !state.flags?.xcResidencyComplete);
}

export function isXcAcceptedPendingBatch(state) {
  return Boolean(
    state.flags?.xcAccepted && !state.flags?.xcBatchActive && !state.flags?.xcResidencyComplete
  );
}

export function xcBatchStartLabel(state) {
  const turn = state.xc?.batchStartsTurn;
  if (turn == null) return null;
  return turnToCalendar(state, turn);
}

export function xcBatchStartLabelText(state) {
  const start = xcBatchStartLabel(state);
  if (!start) return state.xc?.scheduledBatchCode ?? null;
  const code = state.xc?.scheduledBatchCode ?? formatXcBatchCode(start.year, start.monthIndex);
  return `${code} (${formatCalendarMonth(start.year, start.monthIndex)})`;
}

export function xcProgramRevenueMult(state) {
  if (isInResidency(state)) return 1.35;
  const grad = state.xc?.graduateBoostMonths ?? 0;
  if (grad > 0 && state.flags?.xcResidencyComplete) return 1.15;
  return 1;
}

export function xcProgramProductBonus(state) {
  if (isInResidency(state)) return 1.25;
  if ((state.xc?.graduateBoostMonths ?? 0) > 0) return 1.1;
  return 1;
}

/** Lenient offline pass — any non-empty answers with minimal length. */
export function scoreInterviewOffline(answers) {
  const values = Object.values(answers ?? {});
  const filled = values.filter((a) => String(a).trim().length >= 20);
  const score = Math.min(100, 55 + filled.length * 15);
  const accepted = filled.length >= 2 || values.some((a) => String(a).trim().length >= 40);
  const waitlisted = !accepted && filled.length >= 1;
  return {
    accepted,
    waitlisted,
    score,
    feedback: accepted
      ? 'Partners liked your clarity — welcome to the batch.'
      : waitlisted
        ? 'Promising — partners want one more month of clarity. Reapply next month.'
        : 'Add more detail to your answers and try again.'
  };
}

export async function scoreInterview(state, answers) {
  const questions = (await loadInterviewQuestions()).questions ?? [];
  const payload = {
    companyName: state.company.name,
    category: state.company.categoryLabel,
    lifetimeRevenue: state.finance.lifetimeRevenue,
    answers: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answer: String(answers[q.id] ?? '').trim()
    }))
  };

  if (shouldUseNarrativeAi()) {
    try {
      const res = await requestNarrative('startup_xc_interview_score', payload);
      if (res?.accepted !== undefined || res?.waitlisted !== undefined) {
        const accepted = Boolean(res.accepted);
        const waitlisted = Boolean(res.waitlisted) && !accepted;
        return {
          accepted,
          waitlisted,
          score: Number(res.score) || 70,
          feedback: String(res.feedback || 'Decision rendered.')
        };
      }
      if (res?.text) {
        return parseScoreJson(res.text);
      }
    } catch {
      /* fallback */
    }
  }

  return scoreInterviewOffline(answers);
}

function parseScoreJson(text) {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      const accepted = Boolean(parsed.accepted);
      return {
        accepted,
        waitlisted: Boolean(parsed.waitlisted) && !accepted,
        score: Number(parsed.score) || 70,
        feedback: String(parsed.feedback || 'Decision rendered.')
      };
    }
  } catch {
    /* fall through */
  }
  return scoreInterviewOffline({});
}

export function beginResidency(state) {
  state.xc = state.xc ?? createInitialXcState();
  state.xc.residencyMonthsRemaining = 3;
  state.xc.batchLabel =
    state.xc.scheduledBatchCode ??
    formatXcBatchCode(state.calendar.year, state.calendar.monthIndex);
  state.company.location = 'San Francisco (XC batch)';
  state.finance.fixedCostsMonthly = 6_000;
  state.flags.xcResidencyComplete = false;
  state.flags.xcBatchActive = true;
  state.stage = STAGES.XC;
  state.product.buzz = (state.product.buzz ?? 0) + 4;
  state.product.level = (state.product.level ?? 0) + 2;
}

/** Schedule the next seasonal XC batch (4 per year: W/Y/S/F). */
export function completeXcAcceptance(state) {
  const result = applyXCSafe(state);
  if (!result.ok) return result;
  state.xc = state.xc ?? createInitialXcState();
  const batchStart = nextXcBatchStart(state.calendar.year, state.calendar.monthIndex);
  state.xc.scheduledBatchCode = formatXcBatchCode(batchStart.year, batchStart.monthIndex);
  state.xc.batchStartsTurn = calendarTurnAt(state, batchStart.year, batchStart.monthIndex);
  state.flags.xcBatchActive = false;
  const start = xcBatchStartLabel(state);
  return { ok: true, xcShares: result.xcShares, batchStarts: start, batchCode: state.xc.scheduledBatchCode };
}

/** Call at the start of each month before dealing tasks. */
export function maybeStartScheduledXcBatch(state) {
  if (!state.flags?.xcAccepted || state.flags?.xcBatchActive || state.flags?.xcResidencyComplete) {
    return null;
  }
  const start = state.xc?.batchStartsTurn;
  if (start == null) return null;
  if (calendarTurn(state) < start) return null;
  beginResidency(state);
  return state.xc.batchLabel;
}

/** Call at month end while in residency. */
export function tickXcResidency(state) {
  if (!isInResidency(state)) return [];
  const lines = [];
  state.xc.residencyMonthsRemaining = Math.max(0, (state.xc.residencyMonthsRemaining ?? 0) - 1);
  lines.push(`XC batch month complete — ${state.xc.residencyMonthsRemaining} left in San Francisco.`);
  if (state.xc.residencyMonthsRemaining <= 0) {
    state.flags.xcResidencyComplete = true;
    state.flags.xcBatchActive = false;
    if (state.company?.categoryId === CHATXGPT_LAUNCH_CATEGORY) {
      state.xc.postBatchApiReleasePending = true;
    }
    state.xc.graduateBoostMonths = 8;
    state.product.buzz = (state.product.buzz ?? 0) + 3;
    state.product.level = (state.product.level ?? 0) + 2;
    restorePostXcWorkspace(state);
    syncCooSalaryToWorkspace(state);
    lines.push('Batch finished — alumni boost active for 8 months. Close seed when you have a small office.');
  }
  return lines;
}

export function tickXcGraduateBoost(state) {
  if ((state.xc?.graduateBoostMonths ?? 0) <= 0) return;
  state.xc.graduateBoostMonths -= 1;
}

/** Opens the Demo Day pitch fork after the desk task completes. */
export function beginDemoDayPitchDecision(state) {
  if (!state.decision) state.decision = { active: null };
  state.decision.active = {
    id: XC_DEMO_DAY_DECISION_ID,
    title: 'Demo Day pitch',
    description:
      'You are on stage at Demo Day. Partners want a crisp story; the crowd wants fireworks. How do you pitch?',
    choices: [
      {
        label: 'Focused pitch — metrics, roadmap, ask',
        hint: 'Steady seed terms · higher post-money · lower dilution risk',
        effects: { seedPitch: 'focused' }
      },
      {
        label: 'Capital-efficient pitch — smaller round, keep equity',
        hint: 'Lean seed trajectory · unlocks lean close on Finance',
        effects: { seedPitch: 'lean' }
      },
      {
        label: 'Risk-taking pitch — bold vision, big TAM',
        hint: 'Coin flip · hot round or soft landing · trust swings',
        effects: { seedPitch: 'bold' }
      }
    ]
  };
  return state.decision.active;
}

export function onDemoDayTaskCompleted(state) {
  state.xc = state.xc ?? createInitialXcState();
  state.xc.demoDayTaskDone = true;
  return beginDemoDayPitchDecision(state);
}

export function applyDemoDayPitchChoice(state, choiceIndex) {
  const active = state.decision?.active;
  if (!active || active.id !== XC_DEMO_DAY_DECISION_ID) {
    return { ok: false, reason: 'No Demo Day pitch to resolve.' };
  }
  const choice = active.choices?.[choiceIndex];
  if (!choice) return { ok: false, reason: 'Pick a pitch style.' };

  state.xc = state.xc ?? createInitialXcState();
  const pitch = choice.effects?.seedPitch;
  const outcomeLines = [];

  if (pitch === 'focused') {
    state.xc.demoDayPitch = 'focused';
    state.xc.demoDayBoldHit = null;
    state.xc.seedRoundTerms = {
      raised: 3_200_000,
      preMoney: 15_800_000,
      postMoney: 19_000_000
    };
    outcomeLines.push(
      `Seed trajectory set: ${formatMoney(3_200_000)} at ${formatMoney(19_000_000)} post-money (efficient terms).`
    );
    outcomeLines.push(...applyScenarioEffects(state, { buzz: 2, sentiment: 3 }, { title: 'Demo Day' }));
  } else if (pitch === 'lean') {
    state.xc.demoDayPitch = 'lean';
    state.xc.demoDayBoldHit = null;
    state.xc.seedRoundTerms = {
      raised: 2_400_000,
      preMoney: 17_600_000,
      postMoney: 20_000_000
    };
    outcomeLines.push(
      `Lean seed trajectory: ${formatMoney(2_400_000)} at ${formatMoney(20_000_000)} post — you kept more of the cap table.`
    );
    outcomeLines.push(...applyScenarioEffects(state, { buzz: 1, sentiment: 2 }, { title: 'Demo Day' }));
  } else if (pitch === 'bold') {
    state.xc.demoDayPitch = 'bold';
    const hit = Math.random() < 0.55;
    state.xc.demoDayBoldHit = hit;
    if (hit) {
      state.xc.seedRoundTerms = {
        raised: 4_500_000,
        preMoney: 17_500_000,
        postMoney: 22_000_000
      };
      outcomeLines.push(
        `The room bought the vision — ${formatMoney(4_500_000)} seed at ${formatMoney(22_000_000)} post.`
      );
      outcomeLines.push(
        ...applyScenarioEffects(state, { buzz: 4, product: 1, sentiment: 5 }, { title: 'Demo Day' })
      );
    } else {
      state.xc.seedRoundTerms = {
        raised: 2_600_000,
        preMoney: 10_400_000,
        postMoney: 13_000_000
      };
      outcomeLines.push(
        `Investors hedged — ${formatMoney(2_600_000)} seed at ${formatMoney(13_000_000)} post.`
      );
      outcomeLines.push(
        ...applyScenarioEffects(state, { buzz: 1, sentiment: -6 }, { title: 'Demo Day' })
      );
    }
  } else {
    return { ok: false, reason: 'Unknown pitch choice.' };
  }

  state.decision.active = null;
  return { ok: true, summary: choice.label, decisionId: active.id, outcomeLines };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function renderInterviewForm(container, state) {
  if (!container) return;
  const data = await loadInterviewQuestions();
  const questions = [...(data.questions ?? [])];
  if (state?.xc?.needsFollowUpQuestion && data.followUpQuestions?.length) {
    questions.push(data.followUpQuestions[0]);
  }
  const fields = questions
    .map(
      (q) => `
      <label for="xc-${q.id}">${escapeHtml(q.prompt)}</label>
      <p class="fine-print">${escapeHtml(q.hint)}</p>
      <textarea id="xc-${q.id}" name="${q.id}" rows="3" maxlength="600" required></textarea>
    `
    )
    .join('');

  container.innerHTML = `
    <p class="panel-lede">Partner office hours — short answers, real effort. If accepted, you join the next seasonal batch (<strong>XC W/Y/S/F</strong> — Winter, Spring, Summer, Fall; 3-month program).</p>
    <form id="xc-interview-form" class="setup-form">${fields}
      <button type="submit" class="btn btn-primary">Submit application</button>
      <button type="button" class="btn btn-ghost" id="btn-xc-interview-cancel">Cancel</button>
    </form>
    <p id="xc-interview-feedback" class="desk-feedback" hidden></p>
  `;
}
