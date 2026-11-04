import bundledBoard from '../data/board-tasks.json' with { type: 'json' };
import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import { setGameFeedback } from './GameFeedback.js';
import { onBoardSentiment } from './Sentiment.js';

let boardCatalog = bundledBoard;

export function createInitialBoard() {
  return {
    monthTasks: [],
    completedThisMonth: 0
  };
}

export function getBoardTaskDefs() {
  return boardCatalog?.tasks ?? [];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealBoardTasks(state) {
  if (!state.board) state.board = createInitialBoard();
  const pool = getBoardTaskDefs();
  const picked = shuffle(pool).slice(0, 3);
  state.board.monthTasks = picked.map((def, index) => ({
    instanceId: `board-${state.calendar.year}-${state.calendar.monthIndex}-${def.id}-${index}`,
    taskId: def.id,
    status: 'pending'
  }));
  state.board.completedThisMonth = 0;
}

export function getBoardTaskDef(taskId) {
  return getBoardTaskDefs().find((t) => t.id === taskId);
}

export function completeBoardTask(state, instanceId) {
  const inst = state.board?.monthTasks?.find((t) => t.instanceId === instanceId);
  if (!inst || inst.status !== 'pending') return { ok: false, reason: 'Task not available.' };
  const def = getBoardTaskDef(inst.taskId);
  if (!def) return { ok: false, reason: 'Unknown board task.' };

  const cost = def.cost ?? 0;
  state.finance.cash -= cost;
  if (cost > 0) recordCashOutflow(state, cost, 'board');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;
  if (def.sentiment) onBoardSentiment(state, def.sentiment);
  if (def.buzz) state.product.buzz = (state.product.buzz ?? 0) + def.buzz;

  inst.status = 'done';
  state.board.completedThisMonth = (state.board.completedThisMonth ?? 0) + 1;
  return { ok: true, def };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderBoardPanel(container, state) {
  if (!container) return;
  const tasks = state.board?.monthTasks ?? [];
  const cards = tasks
    .map((inst) => {
      const def = getBoardTaskDef(inst.taskId);
      if (!def) return '';
      const done = inst.status === 'done';
      const btn = done
        ? '<span class="task-done-label">Done</span>'
        : `<button type="button" class="btn btn-ghost btn-small" data-complete-board-task="${escapeHtml(inst.instanceId)}">Do task</button>`;
      return `<article class="task-card ${done ? 'done' : ''}">
        <h3>${escapeHtml(def.title)}</h3>
        <p>${escapeHtml(def.description)}</p>
        <p class="task-meta">Cost ~${formatMoney(def.cost)} · optional · boosts board mood</p>
        ${btn}
      </article>`;
    })
    .join('');

  container.innerHTML = `
    <p class="panel-lede">Optional board work — does not count toward desk slots. Good for sentiment before fundraising.</p>
    <div class="task-list">${cards || '<div class="tab-placeholder">New board tasks appear each month.</div>'}</div>
  `;
}

export function showBoardFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
