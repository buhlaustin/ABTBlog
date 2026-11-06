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
import { meetsHubInvestorGate } from './Sentiment.js';
import {
  SATELLITE_SIZE_IDS,
  SATELLITE_SIZES,
  computeSatelliteOffice,
  formatSatellitePreview,
  resolveSatelliteMarket,
  satelliteSizeLabel
} from './SatelliteOffices.js';

function resolveSatelliteMarketLabel(template) {
  const m = resolveSatelliteMarket(template);
  return `cost ${m.costTier} · capacity ${m.capacityTier}`;
}

export function previewSatelliteOpen(templateId, sizeId = 'medium') {
  const t = getSatelliteTemplates().find((s) => s.id === templateId);
  if (!t) return '';
  return formatSatellitePreview(t, sizeId);
}

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
    satellites: [],
    /** Template ids that were ever opened — each city satellite is one-time per run. */
    usedSatelliteTemplateIds: []
  };
}

export function satelliteTemplateIdFromEntry(entry) {
  if (!entry) return null;
  if (entry.templateId) return entry.templateId;
  const id = String(entry.id ?? '');
  const m = id.match(/^(sat-[a-z0-9-]+)/);
  if (m) return m[1];
  return id || null;
}

export function usedSatelliteTemplateIds(state) {
  const offices = state.offices ?? {};
  const claimed = new Set(offices.usedSatelliteTemplateIds ?? []);
  for (const s of offices.satellites ?? []) {
    const tid = satelliteTemplateIdFromEntry(s);
    if (tid) claimed.add(tid);
  }
  return claimed;
}

export function availableSatelliteTemplates(state, list = hubsCache) {
  const used = usedSatelliteTemplateIds(state);
  return getSatelliteTemplates(list).filter((t) => !used.has(t.id));
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

/** Effective hiring cap — hub HQ base plus satellite seat bonuses (career). */
export function totalHeadcountCap(state) {
  const base = headcountCap(state);
  if (state.offices?.hubId) return base + satelliteSeats(state);
  return base;
}

export function headcountCapBreakdown(state) {
  const base = headcountCap(state);
  const seats = state.offices?.hubId ? satelliteSeats(state) : 0;
  const total = totalHeadcountCap(state);
  const atHub =
    Boolean(state.offices?.hubId) || getWorkspaceTier(state) === WORKSPACE_TIER.HUB;
  return { base, seats, total, atHub };
}

export function selectHub(state, hubId) {
  const hub = getHubById(hubId);
  if (!hub) return { ok: false, reason: 'Unknown hub.' };
  if (!state.flags?.xcResidencyComplete) {
    return { ok: false, reason: 'Finish the 3-month XC batch first.' };
  }
  const arr = getArr(state);
  if (arr < ARR_GATES.HUB_HQ) {
    return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.HUB_HQ)} ARR before a worldwide hub city.` };
  }
  if (!meetsHubInvestorGate(state)) {
    return {
      ok: false,
      reason: 'Close Series A or B, or file an IPO, before opening a hub city.'
    };
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

export function addSatellite(state, templateId, sizeId = 'medium') {
  if (!state.offices?.hubId) {
    return { ok: false, reason: 'Open a city hub HQ first.' };
  }
  const t = getSatelliteTemplates().find((s) => s.id === templateId);
  if (!t) return { ok: false, reason: 'Unknown satellite template.' };
  const size = SATELLITE_SIZES[sizeId] ? sizeId : 'medium';

  if (!state.offices.usedSatelliteTemplateIds) state.offices.usedSatelliteTemplateIds = [];
  const used = usedSatelliteTemplateIds(state);
  if (used.has(t.id)) {
    return { ok: false, reason: `${t.label} satellite was already opened this run — pick another city.` };
  }

  const stats = computeSatelliteOffice(t, size);
  const entry = {
    id: t.id,
    templateId: t.id,
    label: t.label,
    size: stats.size,
    sizeLabel: stats.sizeLabel,
    seats: stats.seats,
    rentMonthly: stats.rentMonthly,
    costTier: stats.costTier,
    capacityTier: stats.capacityTier
  };
  state.offices.satellites.push(entry);
  if (!state.offices.usedSatelliteTemplateIds.includes(t.id)) {
    state.offices.usedSatelliteTemplateIds.push(t.id);
  }
  return { ok: true, entry };
}

/** Recompute seats/rent from city + size (keeps saves aligned when footprint tables change). */
export function refreshSatelliteFootprints(state) {
  const templates = getSatelliteTemplates();
  for (const s of state.offices?.satellites ?? []) {
    const tid = satelliteTemplateIdFromEntry(s);
    const tpl = templates.find((t) => t.id === tid);
    if (!tpl) continue;
    const sizeId = s.size && SATELLITE_SIZES[s.size] ? s.size : 'medium';
    const stats = computeSatelliteOffice(tpl, sizeId);
    s.seats = stats.seats;
    s.rentMonthly = stats.rentMonthly;
    s.size = stats.size;
    s.sizeLabel = stats.sizeLabel;
    s.costTier = stats.costTier;
    s.capacityTier = stats.capacityTier;
  }
}

export function removeSatellite(state, satelliteId) {
  const list = state.offices?.satellites ?? [];
  const target = list.find((s) => s.id === satelliteId);
  if (!target) {
    return { ok: false, reason: 'Satellite not found.' };
  }
  const priorTotal = totalHeadcountCap(state);
  const nextCap = priorTotal - (target.seats ?? 0);
  const hc = state.staff?.headcountByDept ?? {};
  const active = Object.values(hc).reduce((a, b) => a + (Number(b) || 0), 0);
  if (active > nextCap) {
    return {
      ok: false,
      reason: `Cannot close ${target.label} — ${active} active employees exceeds the ${nextCap} cap without those ${target.seats ?? 0} satellite seats.`
    };
  }
  state.offices.satellites = list.filter((s) => s.id !== satelliteId);
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
  const atHub = Boolean(state.offices?.hubId) || tier === WORKSPACE_TIER.HUB;
  const tiers = [
    { id: WORKSPACE_TIER.SMALL, label: 'Small office', rent: '$2k/mo', gate: ARR_GATES.SMALL_OFFICE, cap: 4 },
    { id: WORKSPACE_TIER.MEDIUM, label: 'Medium office', rent: '$5k/mo', gate: ARR_GATES.MEDIUM_OFFICE, cap: 12 },
    { id: WORKSPACE_TIER.LARGE, label: 'Large office', rent: '$12k/mo', gate: ARR_GATES.LARGE_OFFICE, cap: 24 },
    {
      id: WORKSPACE_TIER.CAMPUS,
      label: 'Company HQ',
      rent: '$28k/mo',
      gate: ARR_GATES.CAMPUS_HQ,
      cap: 100
    }
  ];
  const buttons = atHub
    ? ''
    : tiers
        .map((t) => {
          const can = canPurchaseTier(state, t.id);
          const disabled = !can.ok ? 'disabled' : '';
          const title = can.ok ? '' : ` title="${escapeHtml(can.reason)}"`;
          return `<button type="button" class="btn btn-ghost btn-small" data-purchase-workspace="${t.id}" ${disabled}${title}>${escapeHtml(t.label)} · ${t.rent} · ${t.cap} seats</button>`;
        })
        .join('');

  const hubNote = atHub
    ? `<p class="fine-print">Worldwide hub HQ holds up to <strong>5,000</strong> employees — open satellite cities below to add seat capacity (each city once per run).</p>`
    : `<p class="fine-print">Offices are purchased at ARR gates; rent rolls into monthly burn. Garage has no hires.</p>`;

  const purchaseRow = buttons ? `<div class="workspace-purchase-row">${buttons}</div>` : '';

  return `
    <div class="finance-action">
      <p><strong>Workspace</strong> — ${escapeHtml(workspaceLabel(tier))} · rent ${formatMoney(workspaceRentMonthly(state))}/mo · ARR ${formatMoney(arr)}</p>
      ${hubNote}
      ${purchaseRow}
    </div>`;
}

export function renderOfficesPanel(container, state) {
  if (!container) return;

  const capBreakdown = headcountCapBreakdown(state);
  const cap = capBreakdown.total;
  const hub = state.offices?.hubId ? getHubById(state.offices.hubId) : null;
  const residency = state.xc?.residencyMonthsRemaining ?? 0;
  const inResidency = state.flags?.xcAccepted && !state.flags?.xcResidencyComplete;

  let hubSection = '';
  const hubUnlocked =
    state.flags?.xcResidencyComplete &&
    meetsHubInvestorGate(state) &&
    getArr(state) >= ARR_GATES.HUB_HQ;
  if (hubUnlocked && !state.offices?.hubId) {
    const options = getHubs()
      .map(
        (h) =>
          `<option value="${h.id}">${escapeHtml(h.label)} — rev×${h.revenueMult} · cost×${h.costMult}</option>`
      )
      .join('');
    hubSection = `
      <div class="finance-action">
        <p><strong>Worldwide hub city</strong> — Series A/B or IPO + ${formatMoney(ARR_GATES.HUB_HQ)} ARR. Massive task revenue; sprint to IPO.</p>
        <select id="hub-select" class="hub-select">
          <option value="">Select hub…</option>
          ${options}
        </select>
        <button type="button" class="btn btn-primary btn-small" id="btn-select-hub">Open hub HQ</button>
      </div>`;
  } else if (hub) {
    const capDetail = capBreakdown.seats
      ? `${capBreakdown.base.toLocaleString()} HQ + ${capBreakdown.seats.toLocaleString()} satellite = <strong>${cap.toLocaleString()}</strong>`
      : `<strong>${capBreakdown.base.toLocaleString()}</strong> (open satellites to grow past hub HQ limit)`;
    hubSection = `<p class="fine-print">HQ: <strong>${escapeHtml(state.offices.hubLabel)}</strong> · employee cap ${capDetail}</p>`;
  } else if (inResidency) {
    hubSection = `<p class="fine-print">SF batch — ${residency} month(s) left. Desk tasks are XC-only.</p>`;
  }

  const satRows = (state.offices?.satellites ?? [])
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.sizeLabel ?? satelliteSizeLabel(s.size ?? 'medium'))}</td><td class="num">${s.seats}</td><td class="num">${formatMoney(s.rentMonthly)}</td>
        <td><button type="button" class="btn btn-ghost btn-small" data-remove-satellite="${escapeHtml(s.id)}">Remove</button></td></tr>`
    )
    .join('');

  const allTemplates = getSatelliteTemplates();
  const available = availableSatelliteTemplates(state);
  const satRentTotal = satelliteRent(state);
  const defaultCity = available[0];
  const defaultPreview = defaultCity ? formatSatellitePreview(defaultCity, 'medium') : '';
  const satOptions = available
    .map((t) => {
      const market = resolveSatelliteMarketLabel(t);
      return `<option value="${t.id}">${escapeHtml(t.label)} (${market})</option>`;
    })
    .join('');
  const sizeOptions = SATELLITE_SIZE_IDS.map(
    (id) =>
      `<option value="${id}">${escapeHtml(SATELLITE_SIZES[id].label)} footprint</option>`
  ).join('');

  const satelliteBlock =
    state.offices?.hubId
      ? `
    <h3 class="log-head">Satellite offices</h3>
    <p class="fine-print">${(state.offices.satellites ?? []).length} open · ${available.length} of ${allTemplates.length} cities still available · ${formatMoney(satRentTotal)}/mo satellite rent. Pick a <strong>city</strong> and footprint (<strong>Small → Extra-large</strong>) — alpha markets cost more and add more seats (<strong>once per city per run</strong>).</p>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>City</th><th>Size</th><th>Seats</th><th>Rent/mo</th><th></th></tr></thead>
        <tbody>${satRows || '<tr><td colspan="5">No satellites yet.</td></tr>'}</tbody>
      </table>
    </div>
    ${
      available.length > 0
        ? `<div class="satellite-add">
      <select id="satellite-template" aria-label="Satellite city">${satOptions}</select>
      <select id="satellite-size" aria-label="Satellite size">${sizeOptions}</select>
      <button type="button" class="btn btn-ghost btn-small" id="btn-add-satellite">Open satellite</button>
      <p class="fine-print" id="satellite-open-preview">${defaultPreview ? `Preview (medium): ${escapeHtml(defaultPreview)}` : ''}</p>
    </div>`
        : `<p class="fine-print">Every satellite city in the catalog is already open this run.</p>`
    }`
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
