/**
 * 2028: Win the White House — campaign manager (52 weeks)
 */
import { STATES, BACKGROUNDS, ANNOUNCEMENTS, TUNING, PARTY_LABELS, getState } from './modules/Data.js';
import { Storage } from './modules/Storage.js';
import {
  createNewGame,
  applyAnnouncement,
  derivePhase,
  nationalApproval,
  normalizeLoaded,
  ballotAccessEv
} from './modules/GameState.js';
import {
  actionsForPhase,
  queueAction,
  endWeek,
  applyEventChoice,
  canAddAction,
} from './modules/Simulation.js';
import { resolveConvention } from './modules/Convention.js';
import { renderMapSvg, downloadMapPng } from './modules/ElectoralMap.js';
import { openCertificate } from './modules/Certificate.js';

let state = null;
let selectedVp = null;
let lastMapSvg = '';

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  for (const el of document.querySelectorAll('.screen')) {
    el.hidden = el.id !== `screen-${name}`;
  }
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  setTimeout(() => {
    t.hidden = true;
  }, 2800);
}

function money(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function phaseLabel(week, party) {
  const p = derivePhase(week, party);
  const map = {
    primary: 'Primary season',
    independent_primary: 'Ballot access drive',
    primary_election: 'Primary election',
    ballot_check: 'Ballot qualification',
    convention_prep: 'Convention prep',
    convention: 'National convention',
    general: 'General election',
    election_night: 'Election night',
    campaign: 'Campaign'
  };
  return map[p] ?? 'Campaign';
}

function initSetup() {
  const stSel = $('cand-state');
  stSel.innerHTML = STATES.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  stSel.value = 'OH';
  const bgSel = $('cand-bg');
  bgSel.innerHTML = BACKGROUNDS.map((b) => `<option value="${b.id}">${b.label}</option>`).join('');
  if (Storage.hasSave()) $('btn-continue').hidden = false;
}

function startNew() {
  const seedRaw = $('cand-seed').value;
  state = createNewGame({
    name: $('cand-name').value,
    homeState: $('cand-state').value,
    backgroundId: $('cand-bg').value,
    party: $('cand-party').value,
    seed: seedRaw ? Number(seedRaw) : undefined
  });
  state._announcements = ANNOUNCEMENTS;
  renderAnnouncement();
  showScreen('announce');
}

function loadSave() {
  const raw = Storage.load();
  if (!raw) return toast('No save found.');
  state = normalizeLoaded(raw);
  state._announcements = ANNOUNCEMENTS;
  routeScreen();
  renderAll();
}

function renderAnnouncement() {
  const host = $('announce-list');
  host.innerHTML = ANNOUNCEMENTS.map(
    (a) => `
    <button type="button" class="btn btn-action announce-pick" data-id="${a.id}">
      <strong>${a.label}</strong><br><span class="muted small">${a.text}</span>
    </button>`
  ).join('');
  host.querySelectorAll('.announce-pick').forEach((btn) => {
    btn.addEventListener('click', () => {
      const res = applyAnnouncement(state, btn.dataset.id);
      if (!res.ok) return toast(res.reason);
      Storage.save(state);
      showScreen('play');
      renderAll();
    });
  });
}

function routeScreen() {
  if (!state) return showScreen('setup');
  if (state.screen === 'announcement') return showScreen('announce');
  if (state.screen === 'election_night') {
    showScreen('night');
    runElectionNightAnimation();
    return;
  }
  if (state.screen === 'ended') {
    showScreen('end');
    renderEnd();
    return;
  }
  showScreen('play');
}

function renderAll() {
  if (!state) return;
  const c = state.candidate;
  $('hud-title').textContent = `Week ${state.week} · ${phaseLabel(state.week, c.party)}`;
  $('hud-sub').textContent = `${c.name} · ${PARTY_LABELS[c.party]} · ${getState(c.homeState)?.name ?? c.homeState}`;

  const r = state.resources;
  $('resource-panel').innerHTML = `
    <h3>Resources</h3>
    <div class="stat-line"><span>Cash</span><span>${money(r.cash)}</span></div>
    <div class="stat-line"><span>Burn / wk</span><span>${money(state.weeklyBurn)}</span></div>
    <div class="stat-line"><span>Approval</span><span>${nationalApproval(state)}%</span></div>
    <div class="stat-line"><span>Name ID</span><span>${r.nameRec}%</span></div>
    <div class="stat-line"><span>Momentum</span><span>${r.momentum}</span></div>
    <div class="stat-line"><span>Base</span><span>${r.base}%</span></div>
    <div class="stat-line"><span>Energy</span><span>${r.energy}/${TUNING.energyMax}</span></div>
    <div class="stat-line"><span>Staff</span><span>${state.staff}</span></div>`;

  const delPanel = $('delegate-panel');
  if (c.party !== 'I' && state.week <= 26) {
    delPanel.hidden = false;
    const rows = state.rivals
      .map((rv) => `<div class="rival-row">${rv.name}: ${rv.delegates ?? 0} del · ${rv.approval}%</div>`)
      .join('');
    delPanel.innerHTML = `<h3>Delegates</h3><div class="stat-line"><span>You</span><span>${state.delegates}</span></div>${rows}`;
  } else delPanel.hidden = true;

  const bal = $('ballot-panel');
  if (c.party === 'I') {
    bal.hidden = false;
    const ev = ballotAccessEv(state);
    bal.innerHTML = `<h3>Ballot access</h3><div class="stat-line"><span>EV qualified</span><span>${ev} / ${TUNING.independentBallotTargetEv}</span></div>`;
  } else bal.hidden = true;

  $('ap-label').textContent = `${state.weekPlan.apLeft} AP left`;
  $('queued-actions').textContent =
    state.weekPlan.actions.map((a) => a.id).join(', ') || '—';

  renderActions();
  renderNews();
  renderMapPreview();
  renderRivals();
  renderConvention();
  renderEvent();
}

function renderRivals() {
  const host = $('rival-panel');
  if (state.week >= TUNING.generalStart && state.generalOpponent) {
    const o = state.generalOpponent;
    host.innerHTML = `<h3>General election</h3><p class="muted small">vs <strong>${o.name}</strong> (${o.partyLabel}) · approval ${o.approval}%</p>`;
    return;
  }
  if (state.candidate.party !== 'I' && state.week < 27) {
    host.innerHTML = `<h3>Primary field</h3>${state.rivals.map((rv) => `<div class="rival-row">${rv.name} — ${rv.approval}%</div>`).join('')}`;
    return;
  }
  host.innerHTML = '';
}

function renderActions() {
  const list = $('actions-list');
  const actions = actionsForPhase(state);
  list.innerHTML = actions
    .map((a) => {
      const check = canAddAction(state, a.id);
      const disabled = check.ok ? '' : 'disabled';
      return `<button type="button" class="btn btn-action" data-action="${a.id}" ${disabled} title="${check.reason ?? ''}">
        <strong>${a.label}</strong> (${a.ap} AP${a.cashCost ? ` · ${money(a.cashCost)}` : ''})<br>
        <span class="muted small">${a.description}</span>
      </button>`;
    })
    .join('');
  list.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => onActionClick(btn.dataset.action));
  });
}

function onActionClick(actionId) {
  const def = actionsForPhase(state).find((a) => a.id === actionId);
  let picks = {};
  if (def?.requiresStatePick) {
    const options = STATES.filter((s) => s.id !== 'DC' || state.candidate.party !== 'I')
      .slice(0, 51)
      .map((s) => s.id);
    const pick = prompt(`Target state (e.g. OH). Options include ${options.slice(0, 8).join(', ')}…`, state.candidate.homeState);
    if (!pick) return;
    picks.stateId = pick.toUpperCase().slice(0, 2);
  }
  if (def?.requiresRegionPick) {
    picks.region = prompt('Region: northeast, south, midwest, west', 'midwest');
    if (!picks.region) return;
  }
  if (def?.requiresVpPick) {
    picks.vpId = selectedVp ?? state.vpShortlist[0]?.id;
    if (!picks.vpId) return toast('Pick a running mate to vet.');
  }
  const mult = state.candidate.party === 'I' && actionId === 'ads_regional' ? TUNING.independentAdCostMult : 1;
  if (mult > 1 && def?.cashCost) {
    const extra = Math.round(def.cashCost * (mult - 1));
    if (state.resources.cash < def.cashCost + extra) return toast('Not enough cash (independent ad premium).');
    state.resources.cash -= extra;
    state.statsRecap.cashSpent += extra;
  }
  const res = queueAction(state, actionId, picks);
  if (!res.ok) return toast(res.reason);
  Storage.save(state);
  renderAll();
  toast(`Queued: ${res.label}`);
}

function renderNews() {
  $('news-feed').innerHTML = state.news
    .map((n) => {
      const d = n.deltas
        ? Object.entries(n.deltas)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')
        : '';
      return `<li><span class="muted">W${n.week}</span> ${n.text}${d ? `<div class="delta">${d}</div>` : ''}</li>`;
    })
    .join('');
}

function renderMapPreview() {
  const partial = {};
  for (const st of STATES) {
    const sup = state.stateSupport[st.id] ?? 45;
    partial[st.id] = { winner: sup >= 50 ? 'player' : 'opponent' };
  }
  lastMapSvg = renderMapSvg(state, partial, state.candidate.party, 480, 280);
  $('map-preview').innerHTML = lastMapSvg;
}

function renderConvention() {
  const card = $('convention-card');
  const phase = derivePhase(state.week, state.candidate.party);
  const show = phase === 'convention_prep' || phase === 'convention';
  card.hidden = !show || !state.vpShortlist?.length;
  if (card.hidden) return;
  const host = $('vp-list');
  host.innerHTML = state.vpShortlist
    .map((vp) => {
      const sel = selectedVp === vp.id ? 'selected' : '';
      return `<div class="vp-card ${sel}" data-vp="${vp.id}">
        <strong>${vp.name}</strong> (${vp.homeName})<br>
        <span class="muted small">+ ${vp.strength} · − ${vp.weakness}</span>
        ${vp.hiddenRevealed ? `<br><span class="small">Vetting: ${vp.hidden}</span>` : ''}
      </div>`;
    })
    .join('');
  host.querySelectorAll('.vp-card').forEach((el) => {
    el.addEventListener('click', () => {
      selectedVp = el.dataset.vp;
      renderConvention();
    });
  });
  $('btn-convention').disabled = phase !== 'convention' || !selectedVp;
}

function renderEvent() {
  const card = $('event-card');
  if (!state.pendingEvent) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  $('event-text').textContent = state.pendingEvent.text;
  $('event-choices').innerHTML = state.pendingEvent.choices
    .map(
      (ch, i) => `<button type="button" class="btn" data-choice="${i}">${ch.label}</button>`
    )
    .join('');
  $('event-choices').querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const res = applyEventChoice(state, Number(btn.dataset.choice));
      if (res?.gameOver) {
        Storage.save(state);
        showScreen('end');
        renderEnd();
        return;
      }
      if (res?.electionNight) {
        Storage.save(state);
        showScreen('night');
        runElectionNightAnimation();
        return;
      }
      Storage.save(state);
      renderAll();
    });
  });
}

function onEndWeek() {
  if (state.pendingEvent) return toast('Make this week\'s decision first.');
  const res = endWeek(state);
  if (!res.ok) return toast(res.reason);
  Storage.save(state);
  if (res.gameOver) {
    showScreen('end');
    renderEnd();
    return;
  }
  if (res.electionNight) {
    showScreen('night');
    runElectionNightAnimation();
    return;
  }
  renderAll();
  if (res.needsChoice) toast('Decision required before the next week.');
  else if (res.lines?.length) toast(res.lines[0]);
}

function onConvention() {
  const speechId = $('speech-tone').value;
  const res = resolveConvention(state, { vpId: selectedVp, speechId });
  if (!res.ok) return toast(res.reason);
  state.conventionDone = true;
  Storage.save(state);
  renderAll();
  toast(`Convention bounce +${res.bounce}`);
}

async function runElectionNightAnimation() {
  const night = state.electionNight;
  if (!night) return;
  const feed = $('night-feed');
  feed.innerHTML = '';
  let pEv = 0;
  let oEv = 0;
  const partial = {};
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  $('ev-bar').textContent = `${state.candidate.name}: 0 · Opponent: 0 · Need ${TUNING.winThreshold}`;

  for (let i = 0; i < night.callScript.length; i++) {
    const call = night.callScript[i];
    await delay(i < 5 ? 350 : 180);
    const li = document.createElement('li');
    li.textContent = call.headline;
    feed.prepend(li);
    partial[call.stateId] = { winner: call.winner };
    if (call.winner === 'player') pEv += call.ev;
    else if (call.winner === 'opponent') oEv += call.ev;
    $('night-progress').textContent =
      i > night.callScript.length - 4 && (pEv >= 270 || oEv >= 270)
        ? 'AP projects a winner…'
        : `Reporting: ${call.stateName}`;
    $('ev-bar').textContent = `${state.candidate.name}: ${pEv} · ${state.generalOpponent?.name}: ${oEv}`;
    lastMapSvg = renderMapSvg(state, night.stateResults, state.candidate.party, 960, 520);
    $('night-map').innerHTML = lastMapSvg;
    if (pEv >= 270 || oEv >= 270) break;
  }

  await delay(800);
  const won = state.outcome?.type === 'win';
  $('night-progress').textContent = won
    ? `AP: ${state.candidate.name} elected president.`
    : `AP: ${state.generalOpponent?.name} elected president.`;
  state.screen = 'ended';
  Storage.save(state);
  await delay(1200);
  showScreen('end');
  renderEnd();
}

function renderEnd() {
  const o = state.outcome;
  if (o?.type === 'primary_loss') {
    $('end-title').textContent = 'Primary defeat';
    $('end-lede').textContent = `${o.winner} wins the nomination. Your campaign ends in week ${o.week}.`;
  } else if (o?.type === 'ballot_fail') {
    $('end-title').textContent = 'Ballot access failed';
    $('end-lede').textContent = `You qualified only ${o.ev} electoral votes; need ${o.required} to compete.`;
  } else if (o?.type === 'win') {
    $('end-title').textContent = 'Victory';
    $('end-lede').textContent = `${state.candidate.name} wins ${o.playerEv}–${o.oppEv} in the Electoral College.`;
  } else {
    $('end-title').textContent = 'Concession';
    $('end-lede').textContent = `${o?.opponentName ?? 'Your opponent'} wins ${o?.oppEv ?? '—'}–${o?.playerEv ?? '—'}.`;
  }
  const results = state.electionNight?.stateResults ?? state.election?.stateResults;
  if (results) {
    lastMapSvg = renderMapSvg(state, results, state.candidate.party, 960, 520);
    $('end-map').innerHTML = lastMapSvg;
  }
  const recap = state.statsRecap;
  $('end-stats').innerHTML = `
    <h3>Campaign recap</h3>
    <div class="stat-line"><span>Cash raised</span><span>${money(recap.cashRaised)}</span></div>
    <div class="stat-line"><span>Cash spent</span><span>${money(recap.cashSpent)}</span></div>
    <div class="stat-line"><span>Popular vote (sim)</span><span>${o?.popularVotePct ?? '—'}%</span></div>
    <p class="muted small">${(recap.keyMoments ?? []).join(' · ')}</p>`;
}

function wire() {
  $('btn-new').addEventListener('click', startNew);
  $('btn-continue').addEventListener('click', loadSave);
  $('btn-save').addEventListener('click', () => {
    if (Storage.save(state)) toast('Saved.');
  });
  $('btn-end-week').addEventListener('click', onEndWeek);
  $('btn-convention').addEventListener('click', onConvention);
  $('btn-cert').addEventListener('click', () => openCertificate(state));
  $('btn-map-dl').addEventListener('click', () => {
    if (lastMapSvg) downloadMapPng(lastMapSvg);
  });
  $('btn-new-game').addEventListener('click', () => {
    Storage.clear();
    state = null;
    showScreen('setup');
    initSetup();
  });
}

initSetup();
wire();
