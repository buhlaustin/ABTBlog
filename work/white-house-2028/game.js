/**
 * 2028: Win the White House — campaign manager (52 weeks)
 */
import { STATES, BACKGROUNDS, ANNOUNCEMENTS, ACTIONS, TUNING, PARTY_LABELS, getState } from './modules/Data.js';
import { Storage } from './modules/Storage.js';
import {
  createNewGame,
  applyAnnouncement,
  derivePhase,
  nationalApproval,
  normalizeLoaded,
  ballotAccessEv,
  refreshDerived
} from './modules/GameState.js';
import { setPoliciesFromSliders } from './modules/Policies.js';
import {
  actionsForPhase,
  queueAction,
  unqueueAction,
  endWeek,
  applyEventChoice,
  canAddAction,
  resolveDebate
} from './modules/Simulation.js';
import { resolveConvention } from './modules/Convention.js';
import { renderMapSvg, downloadMapPng } from './modules/ElectoralMap.js';
import { openCertificate } from './modules/Certificate.js';
import { statesVotingThisWeek } from './modules/PrimaryCalendar.js';
import { DEBATE_STYLES } from './modules/Debate.js';
import {
  initPolicySliders,
  readPolicySliders,
  openModal,
  closeModal,
  statePickerHtml,
  regionPickerHtml,
  policyPickerHtml,
  staffPickerHtml,
  socialPickerHtml,
  endorsementPickerHtml,
  vpPickerHtml,
  renderBattlegroundList,
  renderCoalitionPanel,
  renderStaffPanel,
  weekRecapHtml,
  wireModalCancel
} from './modules/UI.js';

let state = null;
let setupDraft = null;
let selectedVp = null;
let actionCategory = 'all';
let lastMapSvg = '';

const ACTION_CATEGORIES = [
  ['all', 'All'],
  ['fundraising', 'Raise'],
  ['outreach', 'Outreach'],
  ['paid', 'Paid media'],
  ['comms', 'Comms'],
  ['prep', 'Prep'],
  ['staff', 'Staff'],
  ['oppo', 'Oppo'],
  ['personal', 'Personal'],
  ['ballot', 'Ballot'],
  ['convention', 'Convention']
];

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
  const party = $('cand-party').value;
  setupDraft = {
    name: $('cand-name').value,
    homeState: $('cand-state').value,
    backgroundId: $('cand-bg').value,
    party,
    seed: seedRaw ? Number(seedRaw) : undefined
  };
  initPolicySliders($('policy-sliders'), party);
  showScreen('policy');
}

function finishPolicyStep() {
  const sliders = readPolicySliders($('policy-sliders'));
  const policies = setPoliciesFromSliders(sliders);
  state = createNewGame({ ...setupDraft, policies });
  state._announcements = ANNOUNCEMENTS;
  setupDraft = null;
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
  if (state.screen === 'policy') return showScreen('policy');
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
  const voting = statesVotingThisWeek(state.week);
  const voteNote = voting.length ? ` · contests: ${voting.join(', ')}` : '';
  $('hud-sub').textContent = `${c.name} · ${PARTY_LABELS[c.party]} · ${getState(c.homeState)?.name ?? c.homeState}${voteNote}`;

  refreshDerived(state);
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
    <div class="stat-line"><span>Scandal heat</span><span>${r.scandal ?? 0}/${TUNING.scandalMax}</span></div>
    <div class="stat-line"><span>Field staff</span><span>${state.staff}</span></div>`;

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
    const open = STATES.filter((s) => !state.ballotAccess[s.id]).length;
    bal.innerHTML = `<h3>Ballot access</h3>
      <div class="stat-line"><span>EV qualified</span><span>${ev} / ${TUNING.independentBallotTargetEv}</span></div>
      <div class="stat-line"><span>States left</span><span>${open}</span></div>`;
  } else bal.hidden = true;

  $('ap-label').textContent = `${state.weekPlan.apLeft} AP left`;
  renderCoalitionPanel(state, $('coalition-panel'));
  renderStaffPanel(state, $('staff-panel'));
  renderBattlegroundList(state, $('battleground-panel'));

  renderActions();
  renderQueue();
  renderDebate();
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
  const tabs = $('action-categories');
  tabs.innerHTML = ACTION_CATEGORIES.map(([id, label]) => {
    const on = actionCategory === id ? 'active' : '';
    return `<button type="button" class="tab ${on}" data-cat="${id}">${label}</button>`;
  }).join('');
  tabs.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      actionCategory = btn.dataset.cat;
      renderActions();
    });
  });

  const list = $('actions-list');
  let actions = actionsForPhase(state);
  if (actionCategory !== 'all') actions = actions.filter((a) => a.category === actionCategory);
  list.innerHTML = actions
    .map((a) => {
      const check = canAddAction(state, a.id);
      const disabled = check.ok ? '' : 'disabled';
      const costNote =
        state.candidate.party === 'I' && (a.id === 'ads_regional' || a.id === 'ads_state')
          ? ` · ×${TUNING.independentAdCostMult} I`
          : '';
      return `<button type="button" class="btn btn-action" data-action="${a.id}" ${disabled} title="${check.reason ?? ''}">
        <strong>${a.label}</strong> (${a.ap} AP${a.cashCost ? ` · ${money(a.cashCost)}` : ''}${costNote})<br>
        <span class="muted small">${a.description}</span>
      </button>`;
    })
    .join('');
  list.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => onActionClick(btn.dataset.action));
  });
}

function renderQueue() {
  const host = $('queue-panel');
  if (!host) return;
  const rows = state.weekPlan.actions.map((row, i) => {
    const def = ACTIONS.find((a) => a.id === row.id);
    const label = def?.label ?? row.id;
    const bits = [];
    if (row.picks?.stateId) bits.push(row.picks.stateId);
    if (row.picks?.region) bits.push(row.picks.region);
    if (row.picks?.socialTopicId) bits.push(row.picks.socialTopicId);
    return `<div class="queue-row"><span>${label}${bits.length ? ` (${bits.join(' · ')})` : ''}</span>
      <button type="button" class="btn btn-small btn-ghost" data-unqueue="${i}">Remove</button></div>`;
  });
  host.innerHTML = rows.length ? `<h4 class="small muted">Queued this week</h4>${rows.join('')}` : '';
  host.querySelectorAll('[data-unqueue]').forEach((btn) => {
    btn.addEventListener('click', () => {
      unqueueAction(state, Number(btn.dataset.unqueue));
      Storage.save(state);
      renderAll();
    });
  });
}

function renderDebate() {
  const card = $('debate-card');
  if (!card) return;
  card.hidden = !state.pendingDebate;
  if (card.hidden) return;
  $('debate-choices').innerHTML = DEBATE_STYLES.map(
    (s) => `<button type="button" class="btn" data-debate="${s.id}">${s.label}</button>`
  ).join('');
  $('debate-choices').querySelectorAll('[data-debate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      resolveDebate(state, btn.dataset.debate);
      Storage.save(state);
      renderAll();
      toast('Debate approach set.');
    });
  });
}

async function pickStateModal(title = 'Target state') {
  const promise = openModal(title, statePickerHtml(state.candidate.homeState));
  $('modal-body').onclick = (e) => {
    const cell = e.target.closest('[data-state]');
    if (cell) closeModal(cell.dataset.state);
  };
  return promise;
}

async function pickRegionModal() {
  const promise = openModal('Target region', regionPickerHtml());
  $('modal-body').onclick = (e) => {
    const btn = e.target.closest('[data-region]');
    if (btn) closeModal(btn.dataset.region);
  };
  return promise;
}

async function pickPolicyModal() {
  const promise = openModal('Highlight an issue', policyPickerHtml());
  $('modal-body').onclick = (e) => {
    const btn = e.target.closest('[data-policy]');
    if (btn) closeModal(btn.dataset.policy);
  };
  return promise;
}

async function pickStaffModal() {
  const html = staffPickerHtml(state);
  if (!html) {
    toast('Every senior role is filled or unavailable.');
    return null;
  }
  const promise = openModal('Senior hire', html);
  $('modal-body').onclick = (e) => {
    const btn = e.target.closest('[data-staff]');
    if (btn) closeModal(btn.dataset.staff);
  };
  return promise;
}

async function pickSocialModal() {
  let topicId = null;
  let tone = 'safe';
  $('modal-footer').innerHTML =
    '<button type="button" class="btn btn-primary" id="social-confirm">Queue post</button>';
  const promise = openModal('Social post', socialPickerHtml());
  const body = $('modal-body');
  body.onclick = (e) => {
    const topic = e.target.closest('[data-topic]');
    if (topic) {
      topicId = topic.dataset.topic;
      body.querySelectorAll('[data-topic]').forEach((b) => b.classList.toggle('sel', b === topic));
    }
    const toneBtn = e.target.closest('[data-tone]');
    if (toneBtn) tone = toneBtn.dataset.tone;
    if (e.target.id === 'social-confirm' && topicId) closeModal({ socialTopicId: topicId, socialTone: tone });
  };
  const result = await promise;
  $('modal-footer').innerHTML = '';
  body.onclick = null;
  return result;
}

async function pickEndorsementModal() {
  const promise = openModal('Court an endorsement', endorsementPickerHtml());
  $('modal-body').onclick = (e) => {
    const btn = e.target.closest('[data-endorse]');
    if (btn) closeModal(btn.dataset.endorse);
  };
  return promise;
}

async function pickVpModal() {
  const promise = openModal('Running mate', vpPickerHtml(state.vpShortlist));
  $('modal-body').onclick = (e) => {
    const btn = e.target.closest('[data-vp]');
    if (btn) closeModal(btn.dataset.vp);
  };
  return promise;
}

function independentAdPremium(def) {
  if (state.candidate.party !== 'I' || !def?.cashCost) return 0;
  if (def.id !== 'ads_regional' && def.id !== 'ads_state') return 0;
  return Math.round(def.cashCost * (TUNING.independentAdCostMult - 1));
}

async function onActionClick(actionId) {
  const def = ACTIONS.find((a) => a.id === actionId);
  if (!def) return;
  let picks = {};
  if (def.requiresStatePick) {
    const stateId = await pickStateModal();
    if (!stateId) return;
    picks.stateId = stateId;
  }
  if (def.requiresRegionPick) {
    const region = await pickRegionModal();
    if (!region) return;
    picks.region = region;
  }
  if (def.requiresPolicyPick) {
    const policyId = await pickPolicyModal();
    if (!policyId) return;
    picks.policyId = policyId;
  }
  if (def.requiresStaffPick) {
    const roleId = await pickStaffModal();
    if (!roleId) return;
    picks.staffRoleId = roleId;
  }
  if (def.requiresSocialPick) {
    const social = await pickSocialModal();
    if (!social) return;
    picks = { ...picks, ...social };
  }
  if (def.requiresEndorsementPick) {
    const endId = await pickEndorsementModal();
    if (!endId) return;
    picks.endorsementId = endId;
  }
  if (def.requiresVpPick) {
    const vpId = await pickVpModal();
    if (!vpId) return;
    picks.vpId = vpId;
  }
  const extra = independentAdPremium(def);
  if (extra > 0) {
    if (state.resources.cash < (def.cashCost ?? 0) + extra) return toast('Not enough cash (independent ad premium).');
    state.resources.cash -= extra;
    state.statsRecap.cashSpent += extra;
  }
  const res = queueAction(state, actionId, picks);
  if (!res.ok) return toast(res.reason);
  Storage.save(state);
  renderAll();
  toast(`Queued: ${res.label}`);
}

function showWeekRecap(recap) {
  if (!recap) return;
  openModal(`Week ${Math.max(1, state.week - 1)} recap`, weekRecapHtml(recap));
  $('modal-footer').innerHTML =
    '<button type="button" class="btn btn-primary" id="recap-done">Continue</button>';
  $('recap-done')?.addEventListener(
    'click',
    () => {
      closeModal(true);
      $('modal-footer').innerHTML = '';
    },
    { once: true }
  );
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
  const host = $('map-preview');
  host.innerHTML = lastMapSvg;
  host.onclick = (e) => {
    const id = e.target.closest('[data-state]')?.dataset?.state;
    if (!id) return;
    const st = getState(id);
    const sup = state.stateSupport[id] ?? 45;
    const petition =
      state.candidate.party === 'I'
        ? ` · petition ${state.petitionProgress?.[id] ?? 0}%${state.ballotAccess[id] ? ' · ✓ ballot' : ''}`
        : '';
    $('state-detail').textContent = `${st.name} (${st.ev} EV) — you ${sup}% support${petition}`;
  };
  $('map-legend').textContent = state.week >= TUNING.generalStart ? 'General election lean · click a state' : 'Campaign strength · click a state';
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
  if (state.pendingDebate) return toast('Choose a debate style first.');
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
  if (res.needsChoice) {
    toast('Decision required before the next week.');
    if (res.recap) showWeekRecap(res.recap);
  } else if (res.needsDebate) {
    toast('Debate night — pick your approach, then end the week again.');
    if (res.recap) showWeekRecap(res.recap);
  } else {
    if (res.recap) showWeekRecap(res.recap);
    else if (res.lines?.length) toast(res.lines[0]);
  }
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
  } else if (o?.type === 'scandal_out') {
    $('end-title').textContent = 'Campaign implosion';
    $('end-lede').textContent = `Scandal meter hit ${o.scandal} in week ${o.week}. The party and donors walk away.`;
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
    <div class="stat-line"><span>Best week</span><span>${recap.bestWeek ? `W${recap.bestWeek.week} (+${recap.bestWeek.delta} appr.)` : '—'}</span></div>
    <div class="stat-line"><span>Worst week</span><span>${recap.worstWeek ? `W${recap.worstWeek.week} (${recap.worstWeek.delta} appr.)` : '—'}</span></div>
    <p class="muted small">${(recap.keyMoments ?? []).join(' · ')}</p>`;
}

function wire() {
  $('btn-new').addEventListener('click', startNew);
  $('btn-policy-done')?.addEventListener('click', finishPolicyStep);
  wireModalCancel();
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
