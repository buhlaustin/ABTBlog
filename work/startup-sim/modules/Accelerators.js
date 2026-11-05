import bundled from '../data/accelerators.json' with { type: 'json' };
import { fetchGameJson } from './utils.js';
import { recalculateCapTablePercentages, getFounderRow } from './CapTable.js';
import { getArr } from './Workspace.js';
import { formatMoney } from './constants.js';

let catalog = bundled;

export async function loadAccelerators() {
  try {
    const data = await fetchGameJson('data/accelerators.json');
    if (Array.isArray(data?.programs) && data.programs.length) catalog = data;
  } catch {
    /* bundled */
  }
  return catalog;
}

export function getAcceleratorPrograms() {
  return catalog.programs ?? [];
}

export function acceleratorRevenueMult(state) {
  const boost = state.accelerators?.activeBoost;
  if (!boost?.monthsRemaining || boost.monthsRemaining <= 0) return 1;
  return boost.revenueMult ?? 1;
}

export function tickAcceleratorBoost(state) {
  const boost = state.accelerators?.activeBoost;
  if (!boost?.monthsRemaining) return;
  boost.monthsRemaining -= 1;
  if (boost.monthsRemaining <= 0) state.accelerators.activeBoost = null;
}

export function canJoinAccelerator(state, programId) {
  const prog = getAcceleratorPrograms().find((p) => p.id === programId);
  if (!prog) return { ok: false, reason: 'Unknown program.' };
  const joined = state.accelerators?.joined ?? [];
  if (joined.includes(prog.id)) {
    return { ok: false, reason: 'Already joined this program.' };
  }
  if (getArr(state) < prog.arrGate) {
    return { ok: false, reason: `Need ${formatMoney(prog.arrGate)} ARR for ${prog.name}.` };
  }
  return { ok: true, program: prog };
}

export function joinAccelerator(state, programId) {
  const gate = canJoinAccelerator(state, programId);
  if (!gate.ok) return gate;
  const prog = gate.program;
  if (!state.accelerators) state.accelerators = { joined: [], activeBoost: null };

  state.finance.cash = (state.finance.cash ?? 0) + prog.safeAmount;
  if (!state.finance.instruments) state.finance.instruments = [];
  state.finance.instruments.push({
    type: 'safe',
    id: prog.id,
    label: `${prog.name} SAFE`,
    amount: prog.safeAmount,
    cap: prog.valuationCap,
    discount: 0.15,
    estConversionPct: prog.estPct
  });

  const founder = getFounderRow(state);
  const founderShares = founder?.shares ?? 10_000_000;
  const investorShares = Math.round(founderShares * (prog.estPct / 100) / (1 - prog.estPct / 100));
  const table = state.capTable.filter((r) => r.id !== prog.id);
  table.push({
    id: prog.id,
    name: `${prog.name} (SAFE)`,
    shares: investorShares,
    class: 'investor'
  });
  state.capTable = recalculateCapTablePercentages(table);

  state.product.level = (state.product.level ?? 0) + (prog.productBoost ?? 0);
  state.product.buzz = (state.product.buzz ?? 0) + (prog.buzzBoost ?? 0);
  state.accelerators.joined.push(prog.id);
  state.accelerators.activeBoost = {
    programId: prog.id,
    monthsRemaining: prog.revenueMultMonths ?? 3,
    revenueMult: prog.revenueMult ?? 1.1
  };

  return { ok: true, program: prog };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderAcceleratorsBlock(state) {
  const joined = new Set(state.accelerators?.joined ?? []);
  const programs = getAcceleratorPrograms().filter((p) => !joined.has(p.id));
  if (!programs.length) return '';

  const cards = programs
    .map((p) => {
      const gate = canJoinAccelerator(state, p.id);
      const disabled = gate.ok ? '' : 'disabled';
      const title = gate.ok ? '' : ` title="${escapeHtml(gate.reason)}"`;
      return `<div class="finance-action">
        <p><strong>${escapeHtml(p.name)}</strong> — ${formatMoney(p.safeAmount)} SAFE (~${p.estPct}% est.)</p>
        <p class="fine-print">${escapeHtml(p.tagline)} Requires ${formatMoney(p.arrGate)} ARR.</p>
        <button type="button" class="btn btn-ghost btn-small" data-join-accelerator="${escapeHtml(p.id)}" ${disabled}${title}>Join program</button>
      </div>`;
    })
    .join('');

  const xcNote = state.flags?.xcAccepted
    ? '<p class="fine-print">You can stack other accelerator SAFEs alongside X Combinator — each program once.</p>'
    : '';
  return `<h3 class="log-head">Other accelerators & SAFE paths</h3>${xcNote}${cards}`;
}
