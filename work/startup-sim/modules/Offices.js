import { assetBaseUrl } from './utils.js';
import { STAGES, formatMoney } from './constants.js';

let hubsCache = null;

export async function loadHubData() {
  if (hubsCache) return hubsCache;
  try {
    const res = await fetch(`${assetBaseUrl()}data/hubs.json`, { cache: 'no-store' });
    hubsCache = await res.json();
  } catch {
    hubsCache = { hubs: [], satelliteTemplates: [] };
  }
  return hubsCache;
}

export function getHubs(list = hubsCache) {
  return list?.hubs ?? [];
}

export function getSatelliteTemplates(list = hubsCache) {
  return list?.satelliteTemplates ?? [];
}

export function createInitialOffices() {
  return {
    hubId: null,
    hubLabel: null,
    modifiers: { costMult: 1, revenueMult: 1, salaryMult: 1 },
    satellites: []
  };
}

export function getHubById(hubId, list = hubsCache) {
  return getHubs(list).find((h) => h.id === hubId);
}

export function baseHeadcountCap(stage) {
  if (stage === STAGES.GARAGE) return 2;
  if (stage === STAGES.OFFICE) return 12;
  if (stage === STAGES.XC) return 24;
  if (stage === STAGES.POST_XC) return 30;
  if (stage === STAGES.PUBLIC) return 48;
  return 12;
}

export function satelliteSeats(state) {
  return (state.offices?.satellites ?? []).reduce((s, o) => s + (o.seats ?? 0), 0);
}

export function satelliteRent(state) {
  return (state.offices?.satellites ?? []).reduce((s, o) => s + (o.rentMonthly ?? 0), 0);
}

export function totalHeadcountCap(state) {
  return baseHeadcountCap(state.stage) + satelliteSeats(state);
}

export function selectHub(state, hubId) {
  const hub = getHubById(hubId);
  if (!hub) return { ok: false, reason: 'Unknown hub.' };
  if (!state.flags?.xcResidencyComplete) {
    return { ok: false, reason: 'Finish the 3-month XC batch first.' };
  }
  if (state.offices?.hubId) {
    return { ok: false, reason: 'Hub already selected.' };
  }

  state.offices.hubId = hub.id;
  state.offices.hubLabel = hub.label;
  state.offices.modifiers = {
    costMult: hub.costMult,
    revenueMult: hub.revenueMult,
    salaryMult: hub.salaryMult
  };
  state.finance.fixedCostsMonthly = hub.fixedBase;
  state.company.location = hub.label;
  state.stage = STAGES.POST_XC;
  return { ok: true, hub };
}

export function addSatellite(state, templateId) {
  if (!state.offices?.hubId) {
    return { ok: false, reason: 'Choose a hub office first.' };
  }
  const t = getSatelliteTemplates().find((s) => s.id === templateId);
  if (!t) return { ok: false, reason: 'Unknown satellite template.' };

  const entry = {
    id: `${t.id}-${Date.now()}`,
    label: t.label,
    seats: t.seats,
    rentMonthly: t.rentMonthly
  };
  state.offices.satellites.push(entry);
  return { ok: true, entry };
}

export function removeSatellite(state, satelliteId) {
  const before = state.offices?.satellites?.length ?? 0;
  state.offices.satellites = (state.offices.satellites ?? []).filter((s) => s.id !== satelliteId);
  if (state.offices.satellites.length === before) {
    return { ok: false, reason: 'Satellite not found.' };
  }
  return { ok: true };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderOfficesPanel(container, state) {
  if (!container) return;

  const cap = totalHeadcountCap(state);
  const hub = state.offices?.hubId ? getHubById(state.offices.hubId) : null;
  const residency = state.xc?.residencyMonthsRemaining ?? 0;
  const inResidency = state.flags?.xcAccepted && !state.flags?.xcResidencyComplete;

  let hubSection = '';
  if (state.flags?.xcResidencyComplete && !state.offices?.hubId) {
    const options = getHubs()
      .map(
        (h) =>
          `<option value="${h.id}">${escapeHtml(h.label)} — rev×${h.revenueMult} · cost×${h.costMult}</option>`
      )
      .join('');
    hubSection = `
      <div class="finance-action">
        <p><strong>Choose permanent hub</strong> after XC (required before seed close).</p>
        <select id="hub-select" class="hub-select">
          <option value="">Select hub…</option>
          ${options}
        </select>
        <button type="button" class="btn btn-primary btn-small" id="btn-select-hub">Set hub HQ</button>
      </div>`;
  } else if (hub) {
    hubSection = `<p class="fine-print">HQ: <strong>${escapeHtml(state.offices.hubLabel)}</strong> · headcount cap ${cap} (base + satellites)</p>`;
  } else if (inResidency) {
    hubSection = `<p class="fine-print">SF batch — ${residency} month(s) left before hub selection.</p>`;
  }

  const satRows = (state.offices?.satellites ?? [])
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.label)}</td><td class="num">${s.seats}</td><td class="num">${formatMoney(s.rentMonthly)}</td>
        <td><button type="button" class="btn btn-ghost btn-small" data-remove-satellite="${escapeHtml(s.id)}">Remove</button></td></tr>`
    )
    .join('');

  const satOptions = getSatelliteTemplates()
    .map((t) => `<option value="${t.id}">${escapeHtml(t.label)} — ${t.seats} seats · ${formatMoney(t.rentMonthly)}/mo</option>`)
    .join('');

  const satelliteBlock =
    state.offices?.hubId
      ? `
    <h3 class="log-head">Satellite offices</h3>
    <p class="panel-lede">Buy another office — more seats for hiring and another line on the rent bill.</p>
    <table class="data-table">
      <thead><tr><th>Office</th><th>Seats</th><th>Rent/mo</th><th></th></tr></thead>
      <tbody>${satRows || '<tr><td colspan="4">No satellites yet.</td></tr>'}</tbody>
    </table>
    <div class="satellite-add">
      <select id="satellite-template">${satOptions}</select>
      <button type="button" class="btn btn-ghost btn-small" id="btn-add-satellite">Add satellite</button>
    </div>`
      : '';

  container.innerHTML = `
    ${hubSection}
    ${satelliteBlock}
    <p id="offices-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showOfficesFeedback(message, isError = false) {
  const el = document.getElementById('offices-feedback');
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
  el.classList.toggle('error', isError);
}
