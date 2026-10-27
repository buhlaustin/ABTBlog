/**
 * House of Strategy — Main game controller.
 * Orchestrates the weekly loop: social → competition → nominations → veto → eviction.
 */

import { GameState, PHASES, FINALE_PHASES } from './modules/GameState.js';
import { AIController } from './modules/AI.js';
import { CompetitionManager } from './modules/Competition.js';
import { NarrativeEngine } from './modules/Events.js';
import { EvictionSystem } from './modules/Eviction.js';
import { FinaleManager } from './modules/Finale.js';
import { PlayerActions } from './modules/PlayerActions.js';
import { UIManager, setStorageRef } from './modules/UI.js';
import { StorageManager } from './modules/Storage.js';
import { aiCountForCast, escapeHtml } from './modules/utils.js';

class Game {
  constructor() {
    this.state = null;
    this.ui = new UIManager();
    this.ai = null;
    this.competition = null;
    this.narrative = null;
    this.eviction = null;
    this.finale = null;
    this.playerActions = null;
    this.pendingAction = null;
    this.pendingChallenge = null;

    setStorageRef(StorageManager);
    this._bindSetupEvents();
  }

  _bindSetupEvents() {
    const { ui } = this;

    ui.elements.btnNewGame.addEventListener('click', () => {
      const name = ui.elements.playerNameInput.value.trim() || 'You';
      const difficulty = ui.elements.difficultySelect.value;
      const castPreset = ui.elements.castSelect?.value || 'standard';
      const doubleEvictionEnabled = ui.elements.doubleEvictionToggle?.checked ?? true;
      this.startNewGame(name, difficulty, castPreset, doubleEvictionEnabled);
    });

    ui.elements.btnLoadGame.addEventListener('click', () => this.loadGame());
    ui.elements.btnSave.addEventListener('click', () => this.saveGame());
    ui.elements.btnMenu.addEventListener('click', () => this.returnToMenu());
    ui.elements.btnPlayAgain.addEventListener('click', () => {
      this._resetGame();
      ui.showSetup();
    });

    ui.showSetup();
  }

  _resetGame() {
    this.state = null;
    this.ai = null;
    this.competition = null;
    this.narrative = null;
    this.eviction = null;
    this.finale = null;
    this.playerActions = null;
    this.pendingAction = null;
    this.pendingChallenge = null;
    window.__gameContestants = null;
    window.__gamePlayer = null;
  }

  startNewGame(playerName, difficulty, castPreset = 'standard', doubleEvictionEnabled = true) {
    this._resetGame();
    const aiCount = aiCountForCast(castPreset);
    this.state = new GameState({
      playerName,
      difficulty,
      aiCount,
      castPreset,
      doubleEvictionEnabled
    });
    this._initSystems();
    this._exposeGlobals();

    const safeName = escapeHtml(playerName);
    const count = this.state.getActiveContestants().length;
    this.state.addStory({
      text: `Welcome to the Big Brother house, <strong>${safeName}</strong>! ${count} houseguests move in — only one will win.`,
      type: 'success'
    });
    this.state.addStory({
      text: 'Week 1 begins. Win Head of Household, survive the block, and build your jury case.',
      type: 'system'
    });

    this.ui.showGame();
    this.render();
    this.runPhase();
  }

  loadGame() {
    const data = StorageManager.loadRaw();
    if (!data) {
      this.ui.showToast('No save found.');
      return;
    }

    this._resetGame();
    this.state = GameState.fromJSON(data);
    this._initSystems();
    this.competition.restoreCompetition(data.currentCompetition, data.challengeData);
    this._exposeGlobals();
    this.ui.showGame();
    this.render();

    if (this.state.gameOver) {
      this.endGame();
      return;
    }

    this.runPhase();
    this.ui.showToast('Game loaded!');
  }

  saveGame() {
    if (!this.state) return;
    if (this.competition) {
      this.state.currentCompetition = this.competition.currentCompetition;
      this.state.challengeData = this.competition.challengeData;
    }
    if (StorageManager.save(this.state)) {
      this.ui.showToast('Game saved!');
    } else {
      this.ui.showToast('Save failed.');
    }
  }

  returnToMenu() {
    if (confirm('Return to menu? Unsaved progress will be lost.')) {
      this._resetGame();
      this.ui.showSetup();
    }
  }

  _maybeStartFinale() {
    if (!this.state.needsFinaleStart()) return false;
    this.state.enterFinale();
    this.logAndRender([
      {
        type: 'drama',
        text: '<strong>Final 3!</strong> The last three houseguests battle for the final Head of Household.'
      }
    ]);
    this.render();
    setTimeout(() => this.runFinalePhase(), 1200);
    return true;
  }

  runFinalePhase() {
    if (this.state.gameOver) {
      this.endGame();
      return;
    }

    const phase = this.state.finalePhase;
    const active = this.state.getActiveContestants();

    if (phase === FINALE_PHASES.R1) {
      const { results } = this.finale.runPart1();
      this.logAndRender(results);
      setTimeout(() => this.runFinalePhase(), 1400);
      return;
    }

    if (phase === FINALE_PHASES.R2) {
      const r1Winner = this.state.getContestant(this.state.finaleR1WinnerId);
      const losers = active.filter((c) => c.id !== r1Winner?.id);
      const { results } = this.finale.runPart2(losers);
      this.logAndRender(results);
      setTimeout(() => this.runFinalePhase(), 1400);
      return;
    }

    if (phase === FINALE_PHASES.R3) {
      const r1Winner = this.state.getContestant(this.state.finaleR1WinnerId);
      const r2Winner = this.state.getContestant(this.state.finaleR2WinnerId);
      const { results } = this.finale.runPart3(r1Winner, r2Winner);
      this.logAndRender(results);
      setTimeout(() => this.runFinalePhase(), 1400);
      return;
    }

    if (phase === FINALE_PHASES.FINAL_PICK) {
      const finalHOH = this.state.getContestant(this.state.finaleR3WinnerId);
      const candidates = active.filter((c) => c.id !== finalHOH?.id);
      if (finalHOH?.isPlayer && candidates.length === 2) {
        this._showFinalHOHPick(finalHOH, candidates);
        return;
      }
      const evict = this.finale.aiFinalPick(finalHOH, candidates);
      const { results } = this.finale.applyFinalPick(finalHOH, evict.id);
      this.logAndRender(results);
      setTimeout(() => this.runFinalePhase(), 1400);
      return;
    }

    if (phase === FINALE_PHASES.JURY_VOTE) {
      const { results, winner } = this.finale.runJuryVote();
      this.logAndRender(results);
      this.render();
      setTimeout(() => this.endGame(), 1500);
    }
  }

  _showFinalHOHPick(finalHOH, candidates) {
    let html = '<p>You won Final HOH! Choose who to take to the Final 2 (the other will be evicted):</p><div class="target-grid">';
    for (const c of candidates) {
      html += `<button class="btn target-btn" data-final-keep="${c.id}">Take ${escapeHtml(c.name)} to Final 2</button>`;
    }
    html += '</div>';
    this.ui.showActionDetail(html);
    this.ui.setActionPrompt('Final Head of Household decision');
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('[data-final-keep]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const keepId = btn.dataset.finalKeep;
        const evict = candidates.find((c) => c.id !== keepId);
        this.ui.hideActionDetail();
        const { results } = this.finale.applyFinalPick(finalHOH, evict.id);
        this.logAndRender(results);
        setTimeout(() => this.runFinalePhase(), 1000);
      });
    });
  }

  _initSystems() {
    this.ai = new AIController(this.state);
    this.competition = new CompetitionManager(this.state);
    this.narrative = new NarrativeEngine(this.state);
    this.eviction = new EvictionSystem(this.state, this.ai);
    this.finale = new FinaleManager(this.state, this.ai);
    this.playerActions = new PlayerActions(this.state);
  }

  _exposeGlobals() {
    window.__gameContestants = new Map(this.state.contestants.map((c) => [c.id, c]));
    window.__gamePlayer = this.state.getPlayer();
  }

  render() {
    const { state, ui } = this;
    ui.updateWeekDay(state.week, state.day, state.phase);
    ui.renderStoryLog(state.storyLog);
    ui.renderPlayer(state.getPlayer());
    ui.renderHouseguests(state.contestants, state.getPlayer());
    ui.renderAlliances(state.alliances, state.getPlayer());
    state.updateThreatLevels();
  }

  logAndRender(entries) {
    for (const entry of entries) {
      this.state.storyLog.push({
        ...entry,
        week: this.state.week,
        day: this.state.day,
        phase: this.state.phase
      });
    }
    this.ui.addStoryEntries(entries);
    this.render();
  }

  runPhase() {
    if (this.state.gameOver) {
      this.endGame();
      return;
    }

    if (this.state.isInFinale()) {
      this.runFinalePhase();
      return;
    }

    const player = this.state.getPlayer();
    if (player.evicted && !this.state.gameOver) {
      this._spectateRemaining();
      return;
    }

    switch (this.state.phase) {
      case PHASES.SOCIAL:
        this.runSocialPhase();
        break;
      case PHASES.COMPETITION:
        this.runCompetitionPhase();
        break;
      case PHASES.NOMINATION:
        this.runNominationPhase();
        break;
      case PHASES.VETO:
        this.runVetoPhase();
        break;
      case PHASES.EVICTION:
        this.runEvictionPhase();
        break;
      case PHASES.WEEK_END:
        this.runWeekEnd();
        break;
      default:
        break;
    }
  }

  runSocialPhase() {
    this.ui.setActionPrompt(
      this.state.actionsRemaining > 0
        ? `What will you do? (${this.state.actionsRemaining} action${this.state.actionsRemaining > 1 ? 's' : ''} left today)`
        : 'End the day to continue.'
    );

    const actions = this.playerActions.getAvailableActions();
    this.ui.renderActions(actions, (action) => this.handlePlayerAction(action));
  }

  handlePlayerAction(action) {
    if (action.id === 'end_day') {
      this.advanceDay();
      return;
    }

    const needsTarget = ['talk', 'befriend', 'alliance', 'spy', 'promise', 'break_promise', 'campaign', 'influence'].includes(action.id);

    if (needsTarget) {
      this.pendingAction = action;
      let html;

      if (action.id === 'break_promise') {
        const promiseTargets = this.state.getPlayer().promises
          .filter((p) => p.kept === null)
          .map((p) => this.state.getContestant(p.targetId))
          .filter(Boolean);
        html = '<p>Choose whose promise to break:</p><div class="target-grid">';
        for (const t of promiseTargets) {
          html += `<button class="btn target-btn" data-target="${t.id}">${escapeHtml(t.name)}</button>`;
        }
        html += '</div>';
      } else {
        const picker = this.ui.buildTargetPicker(
          this.state.contestants,
          `Choose a target for: ${action.label}`
        );
        html = picker.html;
      }

      this.ui.showActionDetail(
        html + '<button class="btn btn-ghost" data-cancel>Cancel</button>',
        null
      );

      this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.pendingAction = null;
          this.executePlayerAction(action.id, btn.dataset.target);
        });
      });

      const cancel = this.ui.elements.actionDetail.querySelector('[data-cancel]');
      if (cancel) {
        cancel.addEventListener('click', () => {
          this.pendingAction = null;
          this.ui.hideActionDetail();
        });
      }
      return;
    }

    this.executePlayerAction(action.id);
  }

  executePlayerAction(actionId, targetId = null, extra = {}) {
    const result = this.playerActions.execute(actionId, targetId, extra);

    if (!result.success && result.text) {
      this.logAndRender([{ text: result.text, type: result.type || 'warning' }]);
      this.runSocialPhase();
      return;
    }

    this.ui.hideActionDetail();

    if (result.endDay) {
      this.advanceDay();
      return;
    }

    if (result.text) {
      this.logAndRender([{ text: result.text, type: result.type || 'narrative' }]);
    }

    this._exposeGlobals();

    if (this.state.actionsRemaining <= 0) {
      this.ui.setActionPrompt('No actions remaining. End the day.');
      this.ui.renderActions(
        [{ id: 'end_day', label: 'End Day', description: 'Proceed to next day.' }],
        (a) => this.handlePlayerAction(a)
      );
    } else {
      this.runSocialPhase();
    }
  }

  advanceDay() {
    this.ui.hideActionDetail();

    const aiEvents = this.ai.runSocialPhase();
    if (aiEvents.length > 0) {
      this.logAndRender(aiEvents);
    }

    const event = this.narrative.generateDailyEvent();
    if (event) {
      this.logAndRender([event]);
    }

    this.state.day += 1;
    this.state.actionsRemaining = this.state.config.actionsPerDay;

    if (this.state.day > this.state.maxDaysPerWeek) {
      this.state.phase = PHASES.COMPETITION;
      this.state.day = 6;
      this.logAndRender([{
        type: 'system',
        text: 'Competition day has arrived!'
      }]);
      this.render();
      setTimeout(() => this.runPhase(), 800);
    } else {
      this.logAndRender([{
        type: 'system',
        text: `— Day ${this.state.day} —`
      }]);
      this.render();
      this.runSocialPhase();
    }
  }

  // ─── Competition ─────────────────────────────────────────────────

  runCompetitionPhase() {
    const comp = this.competition.startCompetition();
    this.ui.setActionPrompt(`${comp.name} — Get ready!`);

    this.logAndRender([{
      type: 'competition',
      text: `<strong>${comp.name}</strong>: ${comp.description}`
    }]);

    const player = this.state.getPlayer();
    if (player.evicted) {
      this._resolveCompetitionAI();
      return;
    }

    if (['trivia', 'memory', 'logic', 'endurance'].includes(comp.id)) {
      this.pendingChallenge = this.competition.challengeData
        || this.competition.createChallengeData(comp);
      this.competition.challengeData = this.pendingChallenge;
      this._startPlayerCompetition(comp, this.pendingChallenge);
    } else {
      this._resolveCompetitionAI();
    }
  }

  _startPlayerCompetition(comp, challenge) {
    const challengeData = this.competition.getPlayerChallengeData(challenge.type, challenge.data);
    if (!challengeData) {
      this._resolveCompetitionAI();
      return;
    }

    let html = `<p>${escapeHtml(challengeData.prompt)}</p><div class="competition-choices">`;
    for (const choice of challengeData.choices) {
      const value = typeof choice.value === 'string' ? choice.value : String(choice.value);
      html += `<button class="btn btn-action competition-choice" data-value="${escapeHtml(value)}">${escapeHtml(choice.label)}</button>`;
    }
    html += '</div>';

    this.ui.showActionDetail(html);
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('.competition-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.value;
        let value = raw;
        if (raw === 'true') value = true;
        else if (raw === 'false') value = false;
        else if (/^\d+$/.test(raw)) value = parseInt(raw, 10);
        this._resolveCompetitionWithPlayerChoice(value);
      });
    });
  }

  _resolveCompetitionWithPlayerChoice(playerChoice) {
    this.ui.hideActionDetail();
    const challenge = this.pendingChallenge || this.competition.challengeData;
    const { winner, results } = this.competition.runCompetition(challenge, playerChoice, true);
    this.pendingChallenge = null;
    this.logAndRender(results);
    this._afterCompetition(winner);
  }

  _resolveCompetitionAI() {
    const { winner, results } = this.competition.runCompetition(null, null, true);
    this.pendingChallenge = null;
    this.logAndRender(results);
    this._afterCompetition(winner);
  }

  _afterCompetition(winner) {
    this.state.phase = PHASES.NOMINATION;
    this.state.day = 7;
    this.render();
    setTimeout(() => this.runPhase(), 1000);
  }

  // ─── Nominations ───────────────────────────────────────────────────

  runNominationPhase() {
    const hoh = this.state.getActiveContestants().find((c) => c.isHOH);

    if (hoh?.isPlayer) {
      this.ui.setActionPrompt('You are HOH! Nominate two houseguests.');
      this._showNominationPicker();
      return;
    }

    const { results } = this.eviction.runNominations();
    this.logAndRender(results);
    this.state.phase = PHASES.VETO;
    this.render();
    setTimeout(() => this.runPhase(), 1200);
  }

  _showNominationPicker() {
    const player = this.state.getPlayer();
    const targets = this.state.getOthers(player);
    let selected = [];

    const renderPicker = () => {
      let html = `<p>Select 2 nominees (${selected.length}/2):</p><div class="target-grid">`;
      for (const t of targets) {
        const isSelected = selected.includes(t.id);
        html += `<button class="btn target-btn ${isSelected ? 'selected' : ''}" data-target="${t.id}">${escapeHtml(t.name)}</button>`;
      }
      html += `</div>`;
      if (selected.length === 2) {
        html += '<button class="btn btn-confirm" data-confirm>Confirm Nominations</button>';
      }
      this.ui.showActionDetail(html);

      this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.target;
          if (selected.includes(id)) {
            selected = selected.filter((s) => s !== id);
          } else if (selected.length < 2) {
            selected.push(id);
          }
          renderPicker();
        });
      });

      const confirm = this.ui.elements.actionDetail.querySelector('[data-confirm]');
      if (confirm) {
        confirm.addEventListener('click', () => {
          const picks = selected.map((id) => this.state.getContestant(id));
          const { results } = this.eviction.runNominations(picks);
          this.ui.hideActionDetail();
          this.logAndRender(results);
          this.state.phase = PHASES.VETO;
          this.render();
          setTimeout(() => this.runPhase(), 1000);
        });
      }
    };

    renderPicker();
    this.ui.renderActions([], () => {});
  }

  // ─── Veto ──────────────────────────────────────────────────────────

  runVetoPhase() {
    const { playerInComp } = this.eviction.getVetoSetup();

    if (playerInComp && !this.state.getPlayer().evicted) {
      this._showVetoCompetition();
      return;
    }

    this._finishVetoPhase(false);
  }

  _showVetoCompetition() {
    this.ui.setActionPrompt('Power of Veto — compete to save a nominee!');
    const html = `<p>The veto competition is intense. Can you outlast the distractions?</p>
      <div class="competition-choices">
        <button class="btn btn-action competition-choice" data-value="true">Push through and win!</button>
        <button class="btn btn-action competition-choice" data-value="false">Play it safe</button>
      </div>`;
    this.ui.showActionDetail(html);
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('.competition-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const heldStrong = btn.dataset.value === 'true';
        const won = this.competition.resolveVetoCompetition(heldStrong);
        this.ui.hideActionDetail();
        this._finishVetoPhase(won);
      });
    });
  }

  _finishVetoPhase(playerWonVeto) {
    const result = this.eviction.runVetoEvent(playerWonVeto);
    this.logAndRender(result.results);

    if (result.needsPlayerInput && result.vetoWinner?.isPlayer) {
      this._showVetoChoice(result.vetoWinner);
      return;
    }

    if (result.needsReplacementPick) {
      this._showReplacementPicker();
      return;
    }

    this.state.phase = PHASES.EVICTION;
    this.render();
    setTimeout(() => this.runPhase(), 1200);
  }

  _showVetoChoice(vetoWinner) {
    const nominees = this.state.nominees.map((id) => this.state.getContestant(id)).filter(Boolean);
    let html = '<p>You won the Veto! Use it?</p><div class="target-grid">';
    for (const n of nominees) {
      html += `<button class="btn target-btn" data-veto-target="${n.id}">Save ${escapeHtml(n.name)}</button>`;
    }
    html += '<button class="btn btn-action" data-veto-skip">Don\'t use the Veto</button></div>';
    this.ui.showActionDetail(html);

    this.ui.elements.actionDetail.querySelectorAll('[data-veto-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vetoResult = this.eviction.playerUseVeto(vetoWinner, btn.dataset.vetoTarget, true);
        this.ui.hideActionDetail();
        this.logAndRender(vetoResult.results);
        if (vetoResult.needsReplacementPick) {
          this._showReplacementPicker();
        } else {
          this.state.phase = PHASES.EVICTION;
          setTimeout(() => this.runPhase(), 1000);
        }
      });
    });

    const skip = this.ui.elements.actionDetail.querySelector('[data-veto-skip]');
    if (skip) {
      skip.addEventListener('click', () => {
        const vetoResult = this.eviction.playerUseVeto(vetoWinner, null, false);
        this.ui.hideActionDetail();
        this.logAndRender(vetoResult.results);
        this.state.phase = PHASES.EVICTION;
        setTimeout(() => this.runPhase(), 1000);
      });
    }
  }

  _showReplacementPicker() {
    const player = this.state.getPlayer();
    const nominees = new Set(this.state.nominees);
    const targets = this.state.getOthers(player).filter((c) => !nominees.has(c.id));

    let html = '<p>Pick a replacement nominee:</p><div class="target-grid">';
    for (const t of targets) {
      html += `<button class="btn target-btn" data-replacement="${t.id}">${escapeHtml(t.name)}</button>`;
    }
    html += '</div>';
    this.ui.showActionDetail(html);

    this.ui.elements.actionDetail.querySelectorAll('[data-replacement]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const results = this.eviction.playerPickReplacement(btn.dataset.replacement);
        this.ui.hideActionDetail();
        this.logAndRender(results);
        this.state.phase = PHASES.EVICTION;
        setTimeout(() => this.runPhase(), 1000);
      });
    });
  }

  // ─── Eviction ──────────────────────────────────────────────────────

  runEvictionPhase() {
    const player = this.state.getPlayer();

    if (!player.isNominated && !player.isHOH && !player.evicted) {
      this._showEvictionVote();
      return;
    }

    const { results, evicted } = this.eviction.runEvictionVote(null);
    this.logAndRender(results);
    this._afterEviction(evicted);
  }

  _showEvictionVote() {
    const nominees = this.state.nominees.map((id) => this.state.getContestant(id)).filter(Boolean);
    let html = '<p>Cast your vote to evict:</p><div class="target-grid">';
    for (const n of nominees) {
      html += `<button class="btn target-btn btn-danger" data-evict="${n.id}">Evict ${escapeHtml(n.name)}</button>`;
    }
    html += '</div>';
    this.ui.showActionDetail(html);
    this.ui.setActionPrompt('Eviction Night — cast your vote!');
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('[data-evict]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { results, evicted } = this.eviction.runEvictionVote(btn.dataset.evict);
        this.ui.hideActionDetail();
        this.logAndRender(results);
        this._afterEviction(evicted);
      });
    });
  }

  _afterEviction(evicted) {
    if (this.state.needsFinaleStart()) {
      this._maybeStartFinale();
      return;
    }

    if (this.state.doubleEvictionWeek && !this.state.secondEvictionPending) {
      this.state.secondEvictionPending = true;
      this.competition.currentCompetition = null;
      this.state.resetWeeklyFlags();
      this.logAndRender([
        {
          type: 'warning',
          text: '<strong>Double eviction!</strong> A second Head of Household will be crowned tonight.'
        }
      ]);
      this.state.phase = PHASES.COMPETITION;
      this.state.day = 6;
      this.render();
      setTimeout(() => this.runPhase(), 1500);
      return;
    }

    if (this.state.secondEvictionPending) {
      this.state.secondEvictionPending = false;
      this.state.doubleEvictionUsed = true;
      this.state.doubleEvictionWeek = false;
    }

    if (this.state.getPlayer().evicted) {
      const remaining = this.state.getActiveContestants().length;
      const jurorNote = this.state.getPlayer().isJuror
        ? ' You are on the jury.'
        : '';
      if (remaining > 1) {
        this.logAndRender([
          {
            type: 'system',
            text: `You may continue watching the house feed as a spectator.${jurorNote}`
          }
        ]);
        setTimeout(() => this._spectateRemaining(), 1500);
      } else {
        this.endGame();
      }
      return;
    }

    this.state.phase = PHASES.WEEK_END;
    this.render();
    setTimeout(() => this.runPhase(), 1500);
  }

  // ─── Week end ──────────────────────────────────────────────────────

  runWeekEnd() {
    const active = this.state.getActiveContestants().length;

    this.logAndRender([{
      type: 'system',
      text: `Week ${this.state.week} is over. ${active} houseguests remain.`
    }]);

    if (this.state.needsFinaleStart()) {
      this._maybeStartFinale();
      return;
    }

    this.state.startNewWeek();
    this.state.planDoubleEvictionForWeek();
    this.competition.currentCompetition = null;

    const weekLines = [
      {
        type: 'success',
        text: `<strong>Week ${this.state.week}</strong> begins.`
      }
    ];
    if (this.state.doubleEvictionWeek) {
      weekLines.push({
        type: 'warning',
        text: 'Double eviction week — two houseguests will leave the house tonight.'
      });
    }
    this.logAndRender(weekLines);

    this.render();
    this.runSocialPhase();
  }

  // ─── Spectator mode (player evicted) ───────────────────────────────

  _spectateRemaining() {
    while (!this.state.gameOver) {
      if (this.state.needsFinaleStart()) {
        this.state.enterFinale();
        const r1 = this.finale.runPart1();
        this.state.storyLog.push(...this._tagEntries(r1.results, PHASES.COMPETITION));
        const active = this.state.getActiveContestants();
        const r1w = this.state.getContestant(this.state.finaleR1WinnerId);
        const r2 = this.finale.runPart2(active.filter((c) => c.id !== r1w?.id));
        this.state.storyLog.push(...this._tagEntries(r2.results, PHASES.COMPETITION));
        const r3 = this.finale.runPart3(
          r1w,
          this.state.getContestant(this.state.finaleR2WinnerId)
        );
        this.state.storyLog.push(...this._tagEntries(r3.results, PHASES.COMPETITION));
        const finalHOH = this.state.getContestant(this.state.finaleR3WinnerId);
        const candidates = this.state.getActiveContestants().filter((c) => c.id !== finalHOH?.id);
        const evict = this.finale.aiFinalPick(finalHOH, candidates);
        const pick = this.finale.applyFinalPick(finalHOH, evict.id);
        this.state.storyLog.push(...this._tagEntries(pick.results, PHASES.EVICTION));
        const jury = this.finale.runJuryVote();
        this.state.storyLog.push(...this._tagEntries(jury.results, PHASES.EVICTION));
        break;
      }

      const activeCount = this.state.getActiveContestants().length;
      if (activeCount <= 2 && this.state.finalePhase === FINALE_PHASES.JURY_VOTE) {
        break;
      }

      this.state.startNewWeek();
      this.state.planDoubleEvictionForWeek();
      this.competition.currentCompetition = null;
      this._runAutomatedEvictionWeek();
    }

    this.render();
    this.endGame();
  }

  _tagEntries(results, phase) {
    return results.map((r) => ({
      ...r,
      week: this.state.week,
      day: this.state.day,
      phase
    }));
  }

  _runAutomatedEvictionWeek() {
    this.state.phase = PHASES.COMPETITION;
    this.state.day = 6;

    const { results } = this.competition.runCompetition();
    this.state.storyLog.push(...this._tagEntries(results, PHASES.COMPETITION));

    const nomResults = this.eviction.runNominations();
    this.state.storyLog.push(...this._tagEntries(nomResults.results, PHASES.NOMINATION));

    const vetoResults = this.eviction.runVetoEvent(false);
    this.state.storyLog.push(...this._tagEntries(vetoResults.results, PHASES.VETO));

    const evictResults = this.eviction.runEvictionVote(null);
    this.state.storyLog.push(...this._tagEntries(evictResults.results, PHASES.EVICTION));

    if (this.state.doubleEvictionWeek && !this.state.secondEvictionPending) {
      this.state.secondEvictionPending = true;
      this.competition.currentCompetition = null;
      this.state.resetWeeklyFlags();
      this._runAutomatedEvictionWeek();
      this.state.secondEvictionPending = false;
      this.state.doubleEvictionUsed = true;
      this.state.doubleEvictionWeek = false;
    }
  }

  // ─── End game ──────────────────────────────────────────────────────

  endGame() {
    const summary = this.narrative.generateEndgameSummary();
    const won = this.state.winner?.isPlayer;
    this.ui.renderEndSummary(summary);
    this.ui.showEnd(won);
    StorageManager.clear();
  }
}

const game = new Game();

export default game;
