import { assetBaseUrl } from './utils.js';
import { STAGES, formatMoney } from './constants.js';
import { setGameFeedback } from './GameFeedback.js';
import {
  WORKSPACE_TIER,
  ARR_GATES,
  getArr,
  getWorkspaceTier,
  canPurchaseTier,
  purchaseWorkspaceTier,
  workspaceLabel,
  workspaceRentMonthly,
  applyWorkspaceBurn,
  headcountCap
} from './Workspace.js';
import bundledHubs from '../data/hubs.json' with { type: 'json' };

let hubsCache = bundledHubs;

export async function loadHubData() {
  if (!hubsCache?.hubs?.length) {
    throw new Error('startup-sim: bundled hubs.json is empty');
  }
  try {
    const res = await fetch(`${assetBaseUrl()}data/hubs.json`, { cache: 'no-store' });
    if (!res.ok) return hubsCache;
    const data = await res.json();
    if (Array.isArray(data.hubs) && data.hubs.length > 0) {
      hubsCache = data;
    }
  } catch {
    /* keep bundled hubs */
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

/** @deprecated use headcountCap from Workspace.js */
export function baseHeadcountCap(stage) {
  if (stage === STAGES.GARAGE) return 0;
  if (stage === STAGES.OFFICE) return 4;
  return 12;
}

export function satelliteSeats(state) {
  return (state.offices?.satellites ?? []).reduce((s, o) => s + (o.seats ?? 0), 0);
}

export function satelliteRent(state) {
  return (state.offices?.satellites ?? []).reduce((s, o) => s + (o.rentMonthly ?? 0), 0);
}

export function totalHeadcountCap(state) {
  return headcountCap(state) + satelliteSeats(state);
}

export function selectHub(state, hubId) {
  const hub = getHubById(hubId);
  if (!hub) return { ok: false, reason: 'Unknown hub.' };
  if (!state.flags?.xcResidencyComplete) {
    return { ok: false, reason: 'Finish the 3-month XC batch first.' };
  }
  const arr = getArr(state);
  if (arr < ARR_GATES.HUB_HQ) {
    return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.HUB_HQ)} ARR before a city hub HQ.` };
  }
  if (getWorkspaceTier(state) !== WORKSPACE_TIER.HUB && !state.workspace?.hubOwned) {
    const buy = purchaseWorkspaceTier(state, WORKSPACE_TIER.HUB);
    if (!buy.ok) return buy;
    state.workspace.hubOwned = true;
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
  state.finance.hubRentMonthly = hub.fixedBase;
  applyWorkspaceBurn(state);
  state.company.location = hub.label;
  state.stage = STAGES.POST_XC;
  return { ok: true, hub };
}

export function addSatellite(state, templateId) {
  if (!state.offices?.hubId) {
    return { ok: false, reason: 'Open a city hub HQ first.' };
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

function workspacePurchaseBlock(state) {
  const arr = getArr(state);
  const tier = getWorkspaceTier(state);
  const tiers = [
    { id: WORKSPACE_TIER.SMALL, label: 'Small office', rent: '$2k/mo', gate: ARR_GATES.SMALL_OFFICE, cap: 4 },
    { id: WORKSPACE_TIER.MEDIUM, label: 'Medium office', rent: '$5k/mo', gate: ARR_GATES.MEDIUM_OFFICE, cap: 12 },
    { id: WORKSPACE_TIER.LARGE, label: 'Large office', rent: '$12k/mo', gate: ARR_GATES.LARGE_OFFICE, cap: 24 }
  ];
  const buttons = tiers
    .map((t) => {
      const can = canPurchaseTier(state, t.id);
      const disabled = !can.ok ? 'disabled' : '';
      const title = can.ok ? '' : ` title="${escapeHtml(can.reason)}"`;
      return `<button type="button" class="btn btn-ghost btn-small" data-purchase-workspace="${t.id}" ${disabled}${title}>${escapeHtml(t.label)} · ${t.rent} · ${t.cap} seats</button>`;
    })
    .join('');

  return `
    <div class="finance-action">
      <p><strong>Workspace</strong> — ${escapeHtml(workspaceLabel(tier))} · rent ${formatMoney(workspaceRentMonthly(state))}/mo · ARR ${formatMoney(arr)}</p>
      <p class="fine-print">Offices are purchased at ARR gates; rent rolls into monthly burn. Garage has no hires.</p>
      <div class="workspace-purchase-row">${buttons}</div>
    </div>`;
}

export function renderOfficesPanel(container, state) {
  if (!container) return;

  const cap = headcountCap(state) + satelliteSeats(state);
  const hub = state.offices?.hubId ? getHubById(state.offices.hubId) : null;
  const residency = state.xc?.residencyMonthsRemaining ?? 0;
  const inResidency = state.flags?.xcAccepted && !state.flags?.xcResidencyComplete;

  let hubSection = '';
  if (state.flags?.xcResidencyComplete && !state.offices?.hubId && getArr(state) >= ARR_GATES.HUB_HQ) {
    const options = getHubs()
      .map(
        (h) =>
          `<option value="${h.id}">${escapeHtml(h.label)} — rev×${h.revenueMult} · cost×${h.costMult}</option>`
      )
      .join('');
    hubSection = `
      <div class="finance-action">
        <p><strong>City hub HQ</strong> — unlocked at ${formatMoney(ARR_GATES.HUB_HQ)} ARR. Unlimited staffing.</p>
        <select id="hub-select" class="hub-select">
          <option value="">Select hub…</option>
          ${options}
        </select>
        <button type="button" class="btn btn-primary btn-small" id="btn-select-hub">Open hub HQ</button>
      </div>`;
  } else if (hub) {
    hubSection = `<p class="fine-print">HQ: <strong>${escapeHtml(state.offices.hubLabel)}</strong> · headcount cap ${cap}</p>`;
  } else if (inResidency) {
    hubSection = `<p class="fine-print">SF batch — ${residency} month(s) left. Desk tasks are XC-only.</p>`;
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
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Office</th><th>Seats</th><th>Rent/mo</th><th></th></tr></thead>
        <tbody>${satRows || '<tr><td colspan="4">No satellites yet.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="satellite-add">
      <select id="satellite-template">${satOptions}</select>
      <button type="button" class="btn btn-ghost btn-small" id="btn-add-satellite">Add satellite</button>
    </div>`
      : '';

  container.innerHTML = `
    ${workspacePurchaseBlock(state)}
    ${hubSection}
    ${satelliteBlock}
    <p id="offices-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showOfficesFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
