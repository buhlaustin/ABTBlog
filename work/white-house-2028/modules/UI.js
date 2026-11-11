import { STATES, POLICIES, STAFF_ROLES, SOCIAL_TOPICS, ENDORSEMENTS, REGIONS, PARTY_COLORS } from './Data.js';

const $ = (id) => document.getElementById(id);

let modalResolve = null;

export function initPolicySliders(host, party, values = {}) {
  host.innerHTML = POLICIES.map((p) => {
    const v = values[p.id] ?? p.partyDefault?.[party] ?? 0;
    return `<label class="policy-row">
      <span>${p.label} <span class="muted small">${p.leftLabel} ↔ ${p.rightLabel}</span></span>
      <input type="range" min="-2" max="2" step="1" value="${v}" data-policy="${p.id}">
      <span class="policy-val" data-policy-val="${p.id}">${v}</span>
    </label>`;
  }).join('');
  host.querySelectorAll('input[type="range"]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const label = host.querySelector(`[data-policy-val="${inp.dataset.policy}"]`);
      if (label) label.textContent = inp.value;
    });
  });
}

export function readPolicySliders(host) {
  const out = {};
  host.querySelectorAll('[data-policy]').forEach((inp) => {
    out[inp.dataset.policy] = Number(inp.value);
  });
  return out;
}

export function openModal(title, bodyHtml, footerHtml = '') {
  const overlay = $('modal-overlay');
  if (!overlay) return Promise.resolve(null);
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHtml;
  $('modal-footer').innerHTML = footerHtml;
  overlay.hidden = false;
  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

export function closeModal(result = null) {
  const overlay = $('modal-overlay');
  if (overlay) overlay.hidden = true;
  if (modalResolve) modalResolve(result);
  modalResolve = null;
}

export function statePickerHtml(selected = '') {
  const cells = STATES.map(
    (s) => `<button type="button" class="state-cell ${s.id === selected ? 'sel' : ''}" data-state="${s.id}" title="${s.name} (${s.ev} EV)">
      <span class="st-id">${s.id}</span><span class="st-ev">${s.ev}</span></button>`
  ).join('');
  return `<div class="state-grid">${cells}</div>`;
}

export function regionPickerHtml() {
  return `<div class="choice-row">${REGIONS.map((r) => `<button type="button" class="btn" data-region="${r}">${r}</button>`).join('')}</div>`;
}

export function policyPickerHtml() {
  return `<div class="choice-row">${POLICIES.map((p) => `<button type="button" class="btn" data-policy="${p.id}">${p.label}</button>`).join('')}</div>`;
}

export function staffPickerHtml(state) {
  const filled = new Set((state.staffRoles ?? []).map((r) => r.id));
  return STAFF_ROLES.filter((r) => !filled.has(r.id))
    .map(
      (r) => `<button type="button" class="btn btn-action" data-staff="${r.id}"><strong>${r.label}</strong><br><span class="muted small">+${money(r.effects.burn)}/wk payroll</span></button>`
    )
    .join('');
}

export function socialPickerHtml() {
  const topics = SOCIAL_TOPICS.map(
    (t) => `<button type="button" class="btn" data-topic="${t.id}">${t.label}${t.safe ? '' : ' ⚡'}</button>`
  ).join('');
  const tones = ['safe', 'humor', 'combative']
    .map((t) => `<button type="button" class="btn" data-tone="${t}">${t}</button>`)
    .join('');
  return `<p class="muted small">Topic</p><div class="choice-row">${topics}</div><p class="muted small">Tone</p><div class="choice-row">${tones}</div>`;
}

export function endorsementPickerHtml() {
  return ENDORSEMENTS.map(
    (e) => `<button type="button" class="btn btn-action" data-endorse="${e.id}"><strong>${e.label}</strong></button>`
  ).join('');
}

export function vpPickerHtml(shortlist) {
  return (shortlist ?? [])
    .map((vp) => `<button type="button" class="btn" data-vp="${vp.id}">${vp.name} (${vp.homeState})</button>`)
    .join('');
}

export function renderBattlegroundList(state, host) {
  const rows = (state._battlegrounds ?? []).map((st) => {
    const sup = state.stateSupport[st.id] ?? 45;
    const lean = st.partisanLean ?? 0;
    return `<div class="stat-line"><span>${st.id} · ${st.ev} EV</span><span>${sup}% <span class="muted">(lean ${lean > 0 ? 'R' : lean < 0 ? 'D' : '∅'}${Math.abs(lean)})</span></span></div>`;
  });
  host.innerHTML = `<h3>Battlegrounds</h3>${rows.join('') || '<p class="muted small">No tight states yet.</p>'}`;
}

export function renderCoalitionPanel(state, host) {
  const score = state._coalitionScore ?? 0;
  const endorsed = (state.endorsements ?? [])
    .map((id) => ENDORSEMENTS.find((e) => e.id === id)?.label ?? id)
    .join(', ');
  host.innerHTML = `<h3>Coalition</h3><div class="stat-line"><span>Score</span><span>${score}</span></div>
    <p class="muted small">Endorsements: ${endorsed || '—'}</p>
    <div class="policy-chips">${POLICIES.map((p) => {
      const v = state.candidate.policies?.[p.id] ?? 0;
      return `<span class="chip">${p.label}: ${v > 0 ? '+' : ''}${v}</span>`;
    }).join('')}</div>`;
}

export function renderStaffPanel(state, host) {
  const roles = (state.staffRoles ?? []).map((r) => `<li>${r.label}</li>`).join('') || '<li class="muted">No senior hires yet.</li>';
  host.innerHTML = `<h3>Senior team</h3><ul class="staff-list">${roles}</ul>`;
}

export function weekRecapHtml(recap) {
  if (!recap) return '';
  return `<div class="recap-grid">
    <div><strong>Approval</strong> ${recap.approvalDelta >= 0 ? '+' : ''}${recap.approvalDelta}</div>
    <div><strong>Cash</strong> ${recap.cashDelta >= 0 ? '+' : ''}$${Math.abs(recap.cashDelta).toLocaleString()}</div>
    <div><strong>Momentum</strong> ${recap.momentumDelta >= 0 ? '+' : ''}${recap.momentumDelta}</div>
    <div><strong>Scandal meter</strong> ${recap.scandalDelta >= 0 ? '+' : ''}${recap.scandalDelta}</div>
  </div>
  <ul class="recap-lines">${(recap.lines ?? []).map((l) => `<li>${l}</li>`).join('')}</ul>`;
}

function money(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function wireModalCancel() {
  $('modal-close')?.addEventListener('click', () => closeModal(null));
  $('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal(null);
  });
}

export function partyColor(party) {
  return PARTY_COLORS[party] ?? '#888';
}
