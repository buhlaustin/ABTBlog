import bundledBoard from '../data/board-tasks.json' with { type: 'json' };
import bundledMeetingBoard from '../data/board-meeting-tasks.json' with { type: 'json' };
import bundledSeatCandidates from '../data/board-seat-candidates.json' with { type: 'json' };
import { applyPersonalHappinessDelta } from './CeoHappiness.js';
import { formatMoney } from './constants.js';
import { recordCashOutflow, companyRunwayDisplay } from './Finance.js';
import { getArr } from './Workspace.js';
import { setGameFeedback } from './GameFeedback.js';
import {
  onBoardSentiment,
  hasInstitutionalBoard,
  seatInstitutionalBoard,
  sentimentLabel,
  seriesBGateSentiment,
  seriesAGateSentiment
} from './Sentiment.js';
import { progressionTier } from './ProgressionEconomy.js';
import { isPublicCompany, applyStockPctMove } from './IPO.js';
import { formatCalendarStamp } from './GameCalendar.js';
import {
  panelStatCard,
  escapeHtml as panelEscapeHtml,
  panelMetricGroup,
  panelMetricGrid,
  panelMetricStack,
  panelSnapshotSection
} from './PanelChrome.js';

let boardCatalog = bundledBoard;
let boardMeetingCatalog = bundledMeetingBoard;

const BOARD_SECTIONS = new Set(['governance', 'meeting']);

const LEAD_INVESTOR_NAMES = [
  'Redwood Horizon Partners',
  'Harbor Ridge Capital',
  'Meridian Atlas Ventures',
  'Copper Line Growth'
];

const INDEPENDENT_DIRECTORS = [
  { id: 'ind-audit', name: 'Dr. Amira Okonkwo', seat: 'Independent · Audit chair' },
  { id: 'ind-comp', name: 'James Whitfield', seat: 'Independent · Comp committee' },
  { id: 'ind-gov', name: 'Priya Nair', seat: 'Independent · Governance' }
];

const MONTHLY_MANDATES = [
  {
    id: 'mandate-deck',
    title: 'Lead investor wants the board deck early',
    detail: 'Complete “Refresh board deck” for an extra +2 approval.',
    taskId: 'board-governance-pack',
    bonusSentiment: 2
  },
  {
    id: 'mandate-unit-econ',
    title: 'Audit chair asked for unit economics',
    detail: 'Complete “Unit economics deep dive” for an extra +2 approval.',
    taskId: 'board-unit-economics',
    bonusSentiment: 2
  },
  {
    id: 'mandate-rival',
    title: 'Board wants a rival briefing this month',
    detail: 'Complete “Competitive landscape briefing” for an extra +2 approval.',
    taskId: 'board-rival-briefing',
    bonusSentiment: 2
  },
  {
    id: 'mandate-comp',
    title: 'Comp committee flagged exec pay',
    detail: 'Complete “Comp committee prep” for an extra +3 approval.',
    taskId: 'board-comp-plan',
    bonusSentiment: 3
  },
  {
    id: 'mandate-earnings',
    title: 'Pre-earnings preview requested',
    detail: 'Complete “Pre-earnings board preview” for an extra +3 approval.',
    taskId: 'board-earnings-preview',
    bonusSentiment: 3
  }
];

export function createInitialBoard() {
  return {
    monthTasks: [],
    completedThisMonth: 0,
    recentTaskIds: [],
    governanceStreak: 0,
    members: [],
    sentimentHistory: [],
    monthlyMandate: null,
    mandateBonusClaimed: false,
    meetingsHeld: 0,
    seatsAddedByPlayer: 0,
    seatSearchSpendLifetime: 0,
    meetingTasks: [],
    meetingsCompletedThisMonth: 0,
    recentMeetingTaskIds: [],
    boardSection: 'governance'
  };
}

export function setBoardSection(state, section) {
  if (!state.board) state.board = createInitialBoard();
  state.board.boardSection = BOARD_SECTIONS.has(section) ? section : 'governance';
}

function activeBoardSection(state) {
  const s = state.board?.boardSection ?? 'governance';
  return BOARD_SECTIONS.has(s) ? s : 'governance';
}

const BOARD_SEAT_CANDIDATES = bundledSeatCandidates?.candidates ?? [];

export function getBoardSeatCandidates() {
  return BOARD_SEAT_CANDIDATES;
}

/** Max directors on the board at the current company stage. */
export function boardSeatCapacity(state) {
  const tier = progressionTier(state);
  if (tier >= 7) return 11;
  if (tier >= 5) return 9;
  if (tier >= 4) return 8;
  return 7;
}

export function boardSeatSearchFee(state, candidate) {
  const base = candidate?.searchFee ?? 75_000;
  const tier = progressionTier(state);
  const mult = tier >= 7 ? 2.15 : tier >= 5 ? 1.45 : tier >= 4 ? 1.15 : 1;
  return Math.round(base * mult);
}

export function availableBoardSeatCandidates(state) {
  if (!hasInstitutionalBoard(state)) return [];
  ensureBoardRoster(state);
  const seated = new Set((state.board?.members ?? []).map((m) => m.id));
  return BOARD_SEAT_CANDIDATES.filter((c) => !seated.has(c.id));
}

/** Add an independent director from the search pool (company cash, one-time fee). */
export function addBoardSeat(state, candidateId) {
  if (!hasInstitutionalBoard(state)) {
    return { ok: false, reason: 'Seat a board first — close Series A or go public.' };
  }
  ensureBoardRoster(state);
  const cap = boardSeatCapacity(state);
  const members = state.board.members ?? [];
  if (members.length >= cap) {
    return {
      ok: false,
      reason: `Board is at ${cap} seats for your stage — expand again after the next funding tier or IPO scale.`
    };
  }
  const candidate = BOARD_SEAT_CANDIDATES.find((c) => c.id === candidateId);
  if (!candidate) return { ok: false, reason: 'Pick a director from the search list.' };
  if (members.some((m) => m.id === candidate.id)) {
    return { ok: false, reason: `${candidate.name} is already on the board.` };
  }
  const fee = boardSeatSearchFee(state, candidate);
  if ((state.finance?.cash ?? 0) < fee) {
    return { ok: false, reason: `Need ${formatMoney(fee)} company cash for search & onboarding.` };
  }

  state.finance.cash -= fee;
  recordCashOutflow(state, fee, 'board');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + fee;

  const boost = candidate.approvalBoost ?? 1;
  if (boost) onBoardSentiment(state, boost);

  const entry = {
    id: candidate.id,
    name: candidate.name,
    role: 'Independent',
    seat: candidate.seat,
    since: `Added ${state.calendar?.monthIndex ?? 1}/${state.calendar?.year ?? 2026}`,
    votes: 'Independent',
    committee: candidate.committee ?? 'governance',
    playerAdded: true
  };
  members.push(entry);
  state.board.seatsAddedByPlayer = (state.board.seatsAddedByPlayer ?? 0) + 1;
  state.board.seatSearchSpendLifetime = (state.board.seatSearchSpendLifetime ?? 0) + fee;

  return {
    ok: true,
    member: entry,
    fee,
    approvalBoost: boost,
    summary: `Seated ${candidate.name} (${formatMoney(fee)} search fee, approval +${boost}).`
  };
}

export function getBoardTaskDefs() {
  return boardCatalog?.tasks ?? [];
}

export function getBoardMeetingTaskDefs() {
  return boardMeetingCatalog?.tasks ?? [];
}

export function getBoardMeetingTaskDef(taskId) {
  return getBoardMeetingTaskDefs().find((t) => t.id === taskId);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BOARD_TASK_COOLDOWN = 4;
const BOARD_MEETING_COOLDOWN = 3;

function boardTaskAllowed(def, state) {
  const tier = progressionTier(state);
  if ((def.minTier ?? 0) > tier) return false;
  if (def.requiresPublic && !isPublicCompany(state)) return false;
  return true;
}

function pickLeadInvestorName(state) {
  const seed = (state.meta?.runSeed ?? 1) + (state.company?.name?.length ?? 0);
  return LEAD_INVESTOR_NAMES[seed % LEAD_INVESTOR_NAMES.length];
}

/** Ensure roster reflects closed rounds (idempotent). */
export function ensureBoardRoster(state) {
  if (!hasInstitutionalBoard(state)) return [];
  if (!state.board) state.board = createInitialBoard();
  if (!state.board.members) state.board.members = [];

  const members = state.board.members;
  const hasLead = members.some((m) => m.id === 'lead-series-a' || m.id === 'lead-public-chair');
  if (!hasLead) {
    if (state.flags?.seriesAClosed) {
      members.push({
        id: 'lead-series-a',
        name: pickLeadInvestorName(state),
        role: 'Lead investor',
        seat: 'Board · Lead director',
        since: 'Series A',
        votes: 'Control block'
      });
    } else if (state.flags?.ipoFiled || isPublicCompany(state)) {
      members.push({
        id: 'lead-public-chair',
        name: pickLeadInvestorName(state),
        role: 'Independent chair',
        seat: 'Board · Non-executive chair',
        since: 'IPO',
        votes: 'Independents'
      });
    }
  }
  if (!members.some((m) => m.id === 'founder-seat')) {
    members.push({
      id: 'founder-seat',
      name: 'You (Founder CEO)',
      role: 'Management',
      seat: 'Board',
      since: 'Founding',
      votes: 'Founder'
    });
  }
  if (state.flags?.seriesBClosed && !members.some((m) => m.id === 'ind-audit')) {
    members.push({ ...INDEPENDENT_DIRECTORS[0], role: 'Independent', since: 'Series B' });
  }
  if (state.flags?.seriesCClosed && !members.some((m) => m.id === 'ind-comp')) {
    members.push({ ...INDEPENDENT_DIRECTORS[1], role: 'Independent', since: 'Series C' });
  }
  if (isPublicCompany(state) && !members.some((m) => m.id === 'ind-gov')) {
    members.push({ ...INDEPENDENT_DIRECTORS[2], role: 'Independent', since: 'IPO' });
  }
  return members;
}

function pickMonthlyMandate(state, taskIds) {
  const eligible = MONTHLY_MANDATES.filter((m) => taskIds.includes(m.taskId));
  const pool = eligible.length ? eligible : MONTHLY_MANDATES;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { ...pick };
}

export function dealBoardMeetingTasks(state) {
  if (!state.board) state.board = createInitialBoard();
  if (!hasInstitutionalBoard(state)) {
    state.board.meetingTasks = [];
    state.board.meetingsCompletedThisMonth = 0;
    return;
  }
  ensureBoardRoster(state);

  let pool = getBoardMeetingTaskDefs().filter((t) => boardTaskAllowed(t, state));
  if (!pool.length) pool = getBoardMeetingTaskDefs();
  const recent = new Set((state.board.recentMeetingTaskIds ?? []).slice(-BOARD_MEETING_COOLDOWN * 3));
  const fresh = pool.filter((t) => !recent.has(t.id));
  const source = fresh.length >= 2 ? fresh : pool;
  const slotCount = progressionTier(state) >= 7 ? 3 : 2;
  const picked = [];
  const formal = source.find((t) => t.id === 'meet-monthly-formal');
  if (formal) picked.push(formal);
  for (const def of shuffle(source.filter((t) => !picked.some((p) => p.id === t.id)))) {
    if (picked.length >= slotCount) break;
    picked.push(def);
  }
  state.board.recentMeetingTaskIds = [
    ...(state.board.recentMeetingTaskIds ?? []),
    ...picked.map((p) => p.id)
  ].slice(-BOARD_MEETING_COOLDOWN * 3);
  state.board.meetingTasks = picked.map((def, index) => ({
    instanceId: `board-meet-${state.calendar.year}-${state.calendar.monthIndex}-${def.id}-${index}`,
    taskId: def.id,
    status: 'pending'
  }));
  state.board.meetingsCompletedThisMonth = 0;
}

export function dealBoardTasks(state) {
  if (!state.board) state.board = createInitialBoard();
  if (!hasInstitutionalBoard(state)) {
    state.board.monthTasks = [];
    state.board.completedThisMonth = 0;
    state.board.monthlyMandate = null;
    state.board.mandateBonusClaimed = false;
    dealBoardMeetingTasks(state);
    return;
  }
  ensureBoardRoster(state);

  let pool = getBoardTaskDefs().filter((t) => boardTaskAllowed(t, state));
  if (!pool.length) pool = getBoardTaskDefs();
  const recent = new Set((state.board.recentTaskIds ?? []).slice(-BOARD_TASK_COOLDOWN * 3));
  const fresh = pool.filter((t) => !recent.has(t.id));
  const source = fresh.length >= 3 ? fresh : pool;
  const slotCount = progressionTier(state) >= 5 ? 4 : 3;
  const picked = shuffle(source).slice(0, slotCount);
  state.board.recentTaskIds = [...(state.board.recentTaskIds ?? []), ...picked.map((p) => p.id)].slice(
    -BOARD_TASK_COOLDOWN * 3
  );
  state.board.monthTasks = picked.map((def, index) => ({
    instanceId: `board-${state.calendar.year}-${state.calendar.monthIndex}-${def.id}-${index}`,
    taskId: def.id,
    status: 'pending'
  }));
  state.board.completedThisMonth = 0;
  state.board.mandateBonusClaimed = false;
  state.board.monthlyMandate = pickMonthlyMandate(
    state,
    picked.map((p) => p.id)
  );
  dealBoardMeetingTasks(state);
}

export function getBoardTaskDef(taskId) {
  return getBoardTaskDefs().find((t) => t.id === taskId);
}

/** Repair older saves that went public without Series A (board tab + roster). */
export function migrateBoardForPublicSave(state) {
  if (!hasInstitutionalBoard(state)) return;
  if (!state.board) state.board = createInitialBoard();
  const members = state.board.members ?? [];
  const hasLead = members.some((m) => m.id === 'lead-series-a' || m.id === 'lead-public-chair');
  if (
    state.flags?.ipoFiled &&
    !state.flags?.seriesAClosed &&
    !hasLead &&
    state.sentiment?.lastReason == null
  ) {
    seatInstitutionalBoard(
      state,
      'Public listing seated an independent board and approval tracking.'
    );
  }
  ensureBoardRoster(state);
}

export function boardFundraisingGates(state) {
  const approval = state.sentiment?.score ?? 68;
  const gates = [];
  if (state.flags?.seriesAClosed && !state.flags?.seriesBClosed) {
    gates.push({
      label: 'Series B',
      required: 25,
      current: seriesBGateSentiment(state),
      ok: seriesBGateSentiment(state) >= 25
    });
  }
  if (!state.flags?.seriesAClosed && state.flags?.seedRoundClosed && !state.flags?.ipoFiled) {
    gates.push({
      label: 'Series A',
      required: 32,
      current: seriesAGateSentiment(state),
      ok: seriesAGateSentiment(state) >= 32
    });
  }
  if (state.flags?.seriesBClosed && !state.flags?.seriesCClosed) {
    gates.push({ label: 'Series C', required: 22, current: approval, ok: approval >= 22 });
  }
  return gates;
}

export function boardGovernanceSnapshot(state) {
  const tasks = state.board?.monthTasks ?? [];
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const meetTasks = state.board?.meetingTasks ?? [];
  const meetDone = meetTasks.filter((t) => t.status === 'done').length;
  const meetPending = meetTasks.filter((t) => t.status === 'pending').length;
  const runway = companyRunwayDisplay(state);
  return {
    approval: state.sentiment?.score ?? 68,
    label: sentimentLabel(state.sentiment?.score ?? 68),
    lastReason: state.sentiment?.lastReason,
    lastDelta: state.sentiment?.lastDelta ?? 0,
    streak: state.board?.governanceStreak ?? 0,
    tasksDone: done,
    tasksTotal: tasks.length,
    tasksPending: pending,
    meetingsDone: meetDone,
    meetingsTotal: meetTasks.length,
    meetingsPending: meetPending,
    mandate: state.board?.monthlyMandate,
    mandateClaimed: state.board?.mandateBonusClaimed,
    arr: getArr(state),
    runwayLabel: runway.monthsLabel,
    runwayDetail: runway.detail,
    rivalHeat: state.world?.competitor?.pressure ?? 0,
    gates: boardFundraisingGates(state)
  };
}

export function completeBoardTask(state, instanceId) {
  const inst = state.board?.monthTasks?.find((t) => t.instanceId === instanceId);
  if (!inst || inst.status !== 'pending') return { ok: false, reason: 'Task not available.' };
  const def = getBoardTaskDef(inst.taskId);
  if (!def) return { ok: false, reason: 'Unknown board task.' };

  const cost = def.cost ?? 0;
  if ((state.finance?.cash ?? 0) < cost) {
    return { ok: false, reason: `Need ${formatMoney(cost)} company cash for this board prep.` };
  }

  const sentimentBefore = state.sentiment?.score ?? 68;
  state.finance.cash -= cost;
  if (cost > 0) recordCashOutflow(state, cost, 'board');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;

  let sentimentDelta = def.sentiment ?? 0;
  if (sentimentDelta) onBoardSentiment(state, sentimentDelta);

  let mandateBonus = 0;
  const mandate = state.board?.monthlyMandate;
  if (
    mandate &&
    mandate.taskId === inst.taskId &&
    !state.board.mandateBonusClaimed
  ) {
    mandateBonus = mandate.bonusSentiment ?? 2;
    onBoardSentiment(state, mandateBonus);
    state.board.mandateBonusClaimed = true;
    state.board.meetingsHeld = (state.board.meetingsHeld ?? 0) + 1;
  }

  const buzzDelta = def.buzz ?? 0;
  if (buzzDelta) state.product.buzz = (state.product.buzz ?? 0) + buzzDelta;

  let stockPct = null;
  if (def.stockPct && isPublicCompany(state)) {
    stockPct = Number(def.stockPct);
    applyStockPctMove(state, stockPct);
  }

  inst.status = 'done';
  state.board.completedThisMonth = (state.board.completedThisMonth ?? 0) + 1;
  return {
    ok: true,
    def,
    sentimentDelta: sentimentDelta + mandateBonus,
    mandateBonus,
    sentimentBefore,
    sentimentAfter: state.sentiment?.score ?? sentimentBefore,
    buzzDelta,
    stockPct
  };
}

export function completeBoardMeetingTask(state, instanceId) {
  const inst = state.board?.meetingTasks?.find((t) => t.instanceId === instanceId);
  if (!inst || inst.status !== 'pending') return { ok: false, reason: 'Meeting not on this month’s agenda.' };
  const def = getBoardMeetingTaskDef(inst.taskId);
  if (!def) return { ok: false, reason: 'Unknown board meeting.' };

  const cost = def.cost ?? 0;
  if ((state.finance?.cash ?? 0) < cost) {
    return { ok: false, reason: `Need ${formatMoney(cost)} company cash to run this session.` };
  }

  const sentimentBefore = state.sentiment?.score ?? 68;
  state.finance.cash -= cost;
  if (cost > 0) recordCashOutflow(state, cost, 'board');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;

  let sentimentDelta = def.sentiment ?? 0;
  if (sentimentDelta) onBoardSentiment(state, sentimentDelta);

  const wlbCost = def.wlbCost ?? 0;
  let happinessDelta = 0;
  if (wlbCost) {
    happinessDelta = applyPersonalHappinessDelta(state, -wlbCost, `Board meeting: ${def.title}`);
  }

  const buzzDelta = def.buzz ?? 0;
  if (buzzDelta) state.product.buzz = (state.product.buzz ?? 0) + buzzDelta;

  let stockPct = null;
  if (def.stockPct && isPublicCompany(state)) {
    stockPct = Number(def.stockPct);
    applyStockPctMove(state, stockPct);
  }

  inst.status = 'done';
  state.board.meetingsCompletedThisMonth = (state.board.meetingsCompletedThisMonth ?? 0) + 1;
  state.board.meetingsHeld = (state.board.meetingsHeld ?? 0) + 1;

  return {
    ok: true,
    def,
    isMeeting: true,
    sentimentDelta,
    mandateBonus: 0,
    sentimentBefore,
    sentimentAfter: state.sentiment?.score ?? sentimentBefore,
    buzzDelta,
    stockPct,
    happinessDelta,
    wlbCost
  };
}

function committeeLabel(committee) {
  const map = {
    audit: 'Audit',
    comp: 'Comp',
    governance: 'Governance',
    full: 'Full board'
  };
  return map[committee] ?? 'Board';
}

function renderApprovalMeter(score) {
  const s = Math.max(0, Math.min(100, score));
  let tone = 'board-meter-caution';
  if (s >= 75) tone = 'board-meter-support';
  else if (s < 35) tone = 'board-meter-hostile';
  return `<div class="board-approval-meter ${tone}" role="meter" aria-valuenow="${s}" aria-valuemin="0" aria-valuemax="100">
    <div class="board-approval-fill" style="width:${s}%"></div>
    <span class="board-approval-readout">${s}/100</span>
  </div>`;
}

function escapeHtml(s) {
  return panelEscapeHtml(s);
}

export function renderBoardPanel(container, state) {
  if (!container) return;
  if (!hasInstitutionalBoard(state)) {
    container.innerHTML = `
      <div class="board-panel finance-panel">
        <div class="finance-hero">
          <p class="panel-lede">No board yet — you're still running solo.</p>
        </div>
        <div class="finance-alert">Close <strong>Series A</strong> on Finance, or <strong>file an IPO</strong>, to seat a board and unlock prep here.</div>
      </div>
    `;
    return;
  }

  ensureBoardRoster(state);
  const snap = boardGovernanceSnapshot(state);
  const tasks = state.board?.monthTasks ?? [];
  const members = state.board?.members ?? [];
  const history = (state.board?.sentimentHistory ?? []).slice(0, 6);

  const gateCards = snap.gates.map((g) =>
    panelStatCard(`${g.label} gate`, `${g.current}/100 · need ${g.required}+`, {
      tone: g.ok ? 'pos' : 'neg'
    })
  );

  const seatCap = boardSeatCapacity(state);
  const seatCandidates = availableBoardSeatCandidates(state);
  const defaultCandidate = seatCandidates[0];
  const candidateOptions = seatCandidates
    .map((c) => {
      const fee = boardSeatSearchFee(state, c);
      return `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} — ${escapeHtml(c.seat)} (${formatMoney(fee)}, +${c.approvalBoost ?? 1} approval)</option>`;
    })
    .join('');
  const expandBlock =
    seatCandidates.length && members.length < seatCap
      ? `<section class="finance-section finance-card board-expand-section">
      <h3 class="finance-section-title">Add a board seat</h3>
      <p class="fine-print">${members.length}/${seatCap} seats filled. Run a director search (company cash) to add an independent — investors like a real committee bench.</p>
      <div class="board-seat-add satellite-add">
        <select id="board-seat-candidate" aria-label="Director candidate">${candidateOptions}</select>
        <button type="button" class="btn btn-primary btn-small" id="btn-add-board-seat">Add director</button>
      </div>
      ${
        defaultCandidate
          ? `<p class="fine-print" id="board-seat-candidate-blurb">${escapeHtml(defaultCandidate.blurb)}</p>`
          : ''
      }
    </section>`
      : members.length >= seatCap
        ? `<p class="fine-print">Board at ${seatCap}-seat cap for this stage. More seats unlock with hub HQ / public scale.</p>`
        : '';

  const rosterRows = members
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.name)}${m.playerAdded ? ' <span class="board-committee-tag">Added</span>' : ''}</td><td>${escapeHtml(m.seat)}</td><td class="fine-print">${escapeHtml(m.since ?? '—')}</td></tr>`
    )
    .join('');

  const mandateBlock =
    snap.mandate && !snap.mandateClaimed
      ? `<div class="board-mandate capital-stack" role="region" aria-label="Lead director ask">
      <p class="prelaunch-progress-title"><strong>Lead director ask</strong></p>
      <p>${escapeHtml(snap.mandate.title)}</p>
      <p class="fine-print">${escapeHtml(snap.mandate.detail)}</p>
    </div>`
      : snap.mandate && snap.mandateClaimed
        ? `<p class="fine-print positive">Lead director ask fulfilled this month (+ bonus approval).</p>`
        : '';

  const section = activeBoardSection(state);
  const subnav = (id, label) =>
    `<button type="button" class="${section === id ? 'active' : ''}" data-board-subtab="${id}">${label}</button>`;
  const subnavBlock = `<nav class="finance-subtabs people-subtabs board-inner-subtabs" aria-label="Board sections">
    ${subnav('governance', 'Governance & prep')}
    ${subnav('meeting', 'Board meeting')}
  </nav>`;

  const cards = tasks
    .map((inst) => {
      const def = getBoardTaskDef(inst.taskId);
      if (!def) return '';
      const done = inst.status === 'done';
      const isMandate = snap.mandate?.taskId === def.id && !snap.mandateClaimed;
      const btn = done
        ? '<span class="task-done-label">Done</span>'
        : `<button type="button" class="btn btn-ghost btn-small" data-complete-board-task="${escapeHtml(inst.instanceId)}">Do task</button>`;
      const approvalHint =
        def.sentiment != null && def.sentiment !== 0 ? ` · approval +${def.sentiment}` : '';
      const stockHint =
        def.stockPct && isPublicCompany(state)
          ? ` · stock ${def.stockPct > 0 ? '+' : ''}${Math.round(Number(def.stockPct) * 100)}%`
          : '';
      const committee = def.committee
        ? `<span class="board-committee-tag">${escapeHtml(committeeLabel(def.committee))}</span>`
        : '';
      return `<article class="task-card ${done ? 'done' : ''}${isMandate ? ' board-mandate-task' : ''}">
        <h3>${escapeHtml(def.title)} ${committee}${isMandate ? ' <span class="board-mandate-badge">Ask</span>' : ''}</h3>
        <p>${escapeHtml(def.description)}</p>
        <p class="task-meta">Cost ~${formatMoney(def.cost)} · optional${approvalHint}${def.buzz ? ` · buzz +${def.buzz}` : ''}${stockHint}</p>
        ${btn}
      </article>`;
    })
    .join('');

  const meetingTasks = state.board?.meetingTasks ?? [];
  const meetingCards = meetingTasks
    .map((inst) => {
      const def = getBoardMeetingTaskDef(inst.taskId);
      if (!def) return '';
      const done = inst.status === 'done';
      const btn = done
        ? '<span class="task-done-label">Held</span>'
        : `<button type="button" class="btn btn-primary btn-small" data-complete-board-meeting="${escapeHtml(inst.instanceId)}">Hold meeting</button>`;
      const approvalHint =
        def.sentiment != null && def.sentiment !== 0 ? ` · approval +${def.sentiment}` : '';
      const stockHint =
        def.stockPct && isPublicCompany(state)
          ? ` · stock ${def.stockPct > 0 ? '+' : ''}${Math.round(Number(def.stockPct) * 100)}%`
          : '';
      const wlbHint = def.wlbCost ? ` · personal happiness −${def.wlbCost}` : '';
      const committee = def.committee
        ? `<span class="board-committee-tag">${escapeHtml(committeeLabel(def.committee))}</span>`
        : '';
      return `<article class="task-card board-meeting-card ${done ? 'done' : ''}">
        <h3>${escapeHtml(def.title)} ${committee}</h3>
        <p>${escapeHtml(def.description)}</p>
        <p class="task-meta">Cost ~${formatMoney(def.cost)}${approvalHint}${def.buzz ? ` · buzz +${def.buzz}` : ''}${stockHint}${wlbHint}</p>
        ${btn}
      </article>`;
    })
    .join('');

  const historyList = history.length
    ? `<ul class="board-history-list">${history
        .map(
          (h) =>
            `<li><span class="tape-when">${escapeHtml(formatCalendarStamp(h.year, h.month))}</span> ${h.delta >= 0 ? '+' : ''}${h.delta} → ${h.score}/100 — ${escapeHtml(h.reason ?? 'Update')}</li>`
        )
        .join('')}</ul>`
    : '<p class="fine-print">Approval history fills in as the board reacts to your month.</p>';

  const governanceBody =
    section === 'governance'
      ? `${mandateBlock}
      <section class="finance-section">
        <h3 class="finance-section-title">Board roster</h3>
        <div class="table-scroll finance-cap-scroll">
          <table class="data-table board-roster-table">
            <thead><tr><th>Director</th><th>Seat</th><th>Since</th></tr></thead>
            <tbody>${rosterRows}</tbody>
          </table>
        </div>
        <p class="fine-print">Committees: Audit, Comp, Governance — tags on tasks show who cares.</p>
      </section>
      ${expandBlock}
      <section class="finance-section">
        <h3 class="finance-section-title">This month’s board prep</h3>
        <p class="fine-print">Async packets and committee prep — not live meetings (see <strong>Board meeting</strong> tab).</p>
        <div class="task-list">${cards || '<div class="tab-placeholder">New board tasks appear each month.</div>'}</div>
      </section>
      <details class="finance-details board-history-details"><summary>Approval history</summary>${historyList}</details>`
      : '';

  const meetingBody =
    section === 'meeting'
      ? `<section class="finance-section finance-card">
        <h3 class="finance-section-title">This month’s live agenda</h3>
        <p class="fine-print">${members.length} directors seated · ${snap.meetingsDone}/${snap.meetingsTotal} meetings held. Live sessions cost CEO time (happiness) but move approval faster than prep alone. Skip every meeting in a month → −2 approval at month close.</p>
        <div class="task-list">${meetingCards || '<div class="tab-placeholder">Board meetings appear each month after Series A.</div>'}</div>
      </section>
      <section class="finance-section">
        <h3 class="finance-section-title">Who’s in the room</h3>
        <div class="table-scroll finance-cap-scroll">
          <table class="data-table board-roster-table">
            <thead><tr><th>Director</th><th>Seat</th><th>Since</th></tr></thead>
            <tbody>${rosterRows}</tbody>
          </table>
        </div>
      </section>`
      : '';

  container.innerHTML = `
    <div class="board-panel finance-panel">
      <div class="finance-hero">
        <p class="panel-lede">Board governance — prep packets and live meetings each month (not desk slots). Mood: <strong>${escapeHtml(snap.label)}</strong>.</p>
      </div>
      ${subnavBlock}
      <div class="board-dashboard capital-stack" role="region" aria-label="Board approval">
        <div class="board-dashboard-head">
          <p class="prelaunch-progress-title"><strong>Board approval</strong></p>
          ${renderApprovalMeter(snap.approval)}
        </div>
        <p class="fine-print">${snap.lastReason ? `Latest: ${escapeHtml(snap.lastReason)}` : 'Complete prep tasks to build trust before priced rounds.'}</p>
      </div>
      ${panelSnapshotSection(
        panelMetricStack(
          panelMetricGroup(
            'This month’s prep',
            panelMetricGrid('3', [
              panelStatCard('Prep done', `${snap.tasksDone}/${snap.tasksTotal}`, { hero: true }),
              panelStatCard('Meetings', `${snap.meetingsDone}/${snap.meetingsTotal}`, { hero: section === 'meeting' }),
              panelStatCard('Streak', `${snap.streak} mo`)
            ])
          ),
          panelMetricGroup(
            'Company health',
            panelMetricGrid('3', [
              panelStatCard('ARR', formatMoney(snap.arr)),
              panelStatCard('Runway', panelEscapeHtml(snap.runwayLabel)),
              panelStatCard('Rival heat', `${snap.rivalHeat}/5`)
            ])
          )
        ),
        { ariaLabel: 'Board prep and company snapshot' }
      )}
      <details class="finance-details board-gates-details">
        <summary>Round gates &amp; sentiment targets</summary>
        ${panelMetricGrid('3', gateCards)}
        <p class="fine-print">${escapeHtml(snap.runwayDetail)} · Skip <em>all</em> prep → −4 approval; skip <em>all</em> live meetings → −2 approval.</p>
      </details>
      ${governanceBody}
      ${meetingBody}
    </div>
  `;
}

export function showBoardFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
