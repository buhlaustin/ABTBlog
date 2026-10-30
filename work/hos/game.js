/**
 * House of Strategy — Main game controller.
 * Orchestrates the weekly loop: social → competition → nominations → veto → eviction.
 */

import { GameState, PHASES, PHASE_LABELS } from './modules/GameState.js';
import { AIController } from './modules/AI.js';
import { CompetitionManager } from './modules/Competition.js';
import { NarrativeEngine } from './modules/Events.js';
import { EvictionSystem } from './modules/Eviction.js';
import { PlayerActions } from './modules/PlayerActions.js';
import { UIManager, setStorageRef } from './modules/UI.js';
import { StorageManager } from './modules/Storage.js';
import {
  fetchNarrativeBeat,
  initNarrativeApiUrl,
  isNarrativeApiEnabled
} from './modules/NarrativeApi.js';
import { aiCountForCast, escapeHtml, totalCastSize } from './modules/utils.js';

class Game {
  constructor() {
    this.state = null;
    this.ui = new UIManager();
    this.ai = null;
    this.competition = null;
    this.narrative = null;
    this.eviction = null;
    this.playerActions = null;
    this.pendingAction = null;
    this.pendingChallenge = null;
    this._narrativeWarned = false;

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
      void this.startNewGame(name, difficulty, castPreset, doubleEvictionEnabled);
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
    this.playerActions = null;
    this.pendingAction = null;
    this.pendingChallenge = null;
    window.__gameContestants = null;
    window.__gamePlayer = null;
  }

  async startNewGame(playerName, difficulty, castPreset = 'standard', doubleEvictionEnabled = true) {
    this._resetGame();
    await initNarrativeApiUrl();

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
    const castSize = totalCastSize(aiCount);
    this.state.addStory({
      text: `Welcome to the House, <strong>${safeName}</strong>! ${castSize} houseguests are competing. Only one will win.`,
      type: 'success'
    });
    this.state.addStory({
      text: 'Week 1 begins Tuesday. The house is open for social time until Friday’s first Head of Household.',
      type: 'system'
    });
    this.state.addStory({
      text: 'Calendar: <strong>Fri</strong> HOH · <strong>Sat</strong> Nominations · <strong>Sun</strong> POV comp · <strong>Mon</strong> Veto meeting · <strong>Tue–Wed</strong> Strategy · <strong>Thu</strong> Eviction.',
      type: 'system'
    });
    if (isNarrativeApiEnabled()) {
      this.state.addStory({
        text: 'Enhanced host narration is <strong>on</strong> for this session.',
        type: 'system'
      });
      void this._appendAiNarrative('host_line');
    }

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

  /** If only two remain, resolve the winner instead of running eviction. */
  _maybeEndAtFinalTwo() {
    if (this.state.getActiveContestants().length <= 2) {
      this.state.checkWinCondition(true);
      if (this.state.gameOver) {
        this.endGame();
        return true;
      }
    }
    return false;
  }

  _initSystems() {
    this.ai = new AIController(this.state);
    this.competition = new CompetitionManager(this.state);
    this.narrative = new NarrativeEngine(this.state);
    this.eviction = new EvictionSystem(this.state, this.ai);
    this.playerActions = new PlayerActions(this.state);
  }

  _exposeGlobals() {
    window.__gameContestants = new Map(this.state.contestants.map((c) => [c.id, c]));
    window.__gamePlayer = this.state.getPlayer();
  }

  render() {
    const { state, ui } = this;
    ui.updateWeekDay(state.week, state.weekdayIndex, state.phase);
    ui.renderStoryLog(state.storyLog);
    ui.renderPlayer(state.getPlayer());
    ui.renderHouseguests(state.contestants, state.getPlayer());
    ui.renderAlliances(state.alliances, state.getPlayer());
    state.updateThreatLevels();
  }

  async _appendAiNarrative(kind) {
    const beat = await fetchNarrativeBeat(kind, this.state);
    if (beat) {
      this.logAndRender([{
        ...beat,
        type: 'ai-host',
        text: `<strong>Host:</strong> ${beat.text}`
      }]);
      return;
    }
    if (isNarrativeApiEnabled() && !this._narrativeWarned) {
      this._narrativeWarned = true;
      this.logAndRender([{
        type: 'warning',
        text: 'Host narration could not load (network or blocker). Local story continues.'
      }]);
    }
  }

  async _beginScheduledHouseDay() {
    if (isNarrativeApiEnabled()) {
      await this._appendAiNarrative('host_line');
    }
    this._runScheduledHouseEvent();
  }

  _runScheduledHouseEvent() {
    switch (this.state.phase) {
      case PHASES.COMPETITION:
        this.runCompetitionPhase();
        break;
      case PHASES.NOMINATION:
        this.runNominationPhase();
        break;
      case PHASES.VETO_COMP:
        this.runVetoCompPhase();
        break;
      case PHASES.VETO_CEREMONY:
      case PHASES.VETO:
        this.runVetoCeremonyPhase();
        break;
      case PHASES.EVICTION:
        this.runEvictionPhase();
        break;
      default:
        this.runPhase();
        break;
    }
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

    const player = this.state.getPlayer();
    if (player.evicted && !this.state.gameOver) {
      this._spectateRemaining();
      return;
    }

    if (this.state.isScheduledHouseEventDay() && !this.state.houseEventComplete) {
      this.runEventDaySocialPhase();
      return;
    }

    if (
      this.state.phase === PHASES.SOCIAL
      || (this.state.isScheduledHouseEventDay() && this.state.houseEventComplete)
    ) {
      this.runSocialPhase();
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
      case PHASES.VETO_COMP:
        this.runVetoCompPhase();
        break;
      case PHASES.VETO_CEREMONY:
      case PHASES.VETO:
        this.runVetoCeremonyPhase();
        break;
      case PHASES.EVICTION:
        this.runEvictionPhase();
        break;
      case PHASES.WEEK_END:
        void this.runWeekEnd();
        break;
      default:
        break;
    }
  }

  runSocialPhase() {
    const dayName = this.state.getWeekdayName();
    const phaseHint = this.state.isScheduledHouseEventDay() && this.state.houseEventComplete
      ? ` After ${dayName}'s ceremony, the house is still awake.`
      : '';
    this.ui.setActionPrompt(
      this.state.actionsRemaining > 0
        ? `What will you do? (${this.state.actionsRemaining} action${this.state.actionsRemaining > 1 ? 's' : ''} left today)${phaseHint}`
        : 'End the day to continue.'
    );

    const actions = this.playerActions.getAvailableActions();
    this.ui.renderActions(actions, (action) => this.handlePlayerAction(action));
  }

  runEventDaySocialPhase() {
    const dayName = this.state.getWeekdayName();
    const eventLabel = PHASE_LABELS[this.state.phase] || 'House event';
    this.ui.setActionPrompt(
      `${dayName} — ${eventLabel}. Mingle in the house, then begin the live event when you're ready.`
    );
    const actions = [
      {
        id: 'begin_house_event',
        label: `Begin ${dayName} live event`,
        description: eventLabel
      },
      ...this.playerActions.getAvailableActions()
    ];
    this.ui.renderActions(actions, (action) => this.handlePlayerAction(action));
  }

  handlePlayerAction(action) {
    if (action.id === 'continue_day' || action.id === 'begin_house_event') {
      void this._beginScheduledHouseDay();
      return;
    }

    if (action.id === 'end_day') {
      this.advanceDay();
      return;
    }

    const needsTarget = [
      'talk',
      'befriend',
      'alliance',
      'expand_alliance',
      'spy',
      'promise',
      'break_promise',
      'campaign',
      'influence',
      'scheme_nom',
      'pregame',
      'comfort_nominee'
    ].includes(action.id);

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
      } else if (action.id === 'expand_alliance') {
        const player = this.state.getPlayer();
        const mine = this.state.alliances.filter((a) => a.members.includes(player.id));
        html = '<p>Which alliance?</p><div class="target-grid">';
        for (const a of mine) {
          html += `<button class="btn target-btn" data-alliance="${a.id}">${escapeHtml(a.name)} (${a.members.length})</button>`;
        }
        html += '</div><button class="btn btn-ghost" data-cancel>Cancel</button>';
        this.ui.showActionDetail(html, null);
        this.ui.elements.actionDetail.querySelectorAll('[data-alliance]').forEach((btn) => {
          btn.addEventListener('click', () => {
            this.pendingAction = { ...action, allianceId: btn.dataset.alliance };
            const picker = this.ui.buildTargetPicker(
              this.state.contestants,
              `Invite someone into ${btn.textContent}`
            );
            this.ui.showActionDetail(
              picker.html + '<button class="btn btn-ghost" data-cancel>Cancel</button>',
              null
            );
            this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((tbtn) => {
              tbtn.addEventListener('click', () => {
                this.pendingAction = null;
                this.executePlayerAction(action.id, tbtn.dataset.target, {
                  allianceId: btn.dataset.alliance
                });
              });
            });
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
    const result = this.playerActions.execute(actionId, targetId, {
      promiseType: extra.promiseType,
      allianceId: extra.allianceId
    });

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
    if (this.state.isScheduledHouseEventDay() && !this.state.houseEventComplete) {
      this.ui.showToast('Begin today’s live house event before ending the day.');
      this.runEventDaySocialPhase();
      return;
    }

    this.ui.hideActionDetail();

    const aiEvents = this.ai.runSocialPhase();
    if (aiEvents.length > 0) {
      this.logAndRender(aiEvents);
    }

    const event = this.narrative.generateDailyEvent();
    if (event) {
      this.logAndRender([event]);
    }
    void this._appendAiNarrative('daily_beat');

    this.state.advanceWeekday();
    this.state.actionsRemaining = this.state.config.actionsPerDay;

    this.logAndRender([
      {
        type: 'system',
        text: `— ${this.state.getWeekdayName()} — ${PHASE_LABELS[this.state.phase] || ''}`
      }
    ]);
    this.render();
    this.runPhase();
  }

  _onHouseEventComplete() {
    this.state.houseEventComplete = true;
    this.state.actionsRemaining = this.state.config.actionsPerDay;
    this.logAndRender([
      {
        type: 'system',
        text: 'The live event is over — the house is still buzzing. Use your actions before the day ends.'
      }
    ]);
    this.render();
    this.runSocialPhase();
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
    if (this._maybeEndAtFinalTwo()) return;
    this._onHouseEventComplete();
  }

  // ─── Nominations ───────────────────────────────────────────────────

  runNominationPhase() {
    if (this._maybeEndAtFinalTwo()) return;

    const hoh = this.state.getActiveContestants().find((c) => c.isHOH);

    if (hoh?.isPlayer) {
      this.ui.setActionPrompt('You are HOH! Nominate two houseguests.');
      this._showNominationPicker();
      return;
    }

    const { results } = this.eviction.runNominations();
    this.logAndRender(results);
    this._onHouseEventComplete();
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
          this._onHouseEventComplete();
        });
      }
    };

    renderPicker();
    this.ui.renderActions([], () => {});
  }

  // ─── Veto ──────────────────────────────────────────────────────────

  runVetoCompPhase() {
    const { playerInComp } = this.eviction.getVetoSetup();

    if (playerInComp && !this.state.getPlayer().evicted) {
      this._showVetoCompetition();
      return;
    }

    this._finishVetoComp(false);
  }

  runVetoCeremonyPhase() {
    const vetoWinner = this.state.vetoHolderId
      ? this.state.getContestant(this.state.vetoHolderId)
      : null;
    this._finishVetoCeremony(vetoWinner);
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
        this._finishVetoComp(won);
      });
    });
  }

  _finishVetoComp(playerWonVeto) {
    const result = this.eviction.runVetoCompetition(playerWonVeto);
    this.logAndRender(result.results);
    this._onHouseEventComplete();
  }

  _finishVetoCeremony(vetoWinner) {
    const result = this.eviction.runVetoCeremony(vetoWinner);
    this.logAndRender(result.results);

    if (result.needsPlayerInput && result.vetoWinner?.isPlayer) {
      this._showVetoChoice(result.vetoWinner);
      return;
    }

    if (result.needsReplacementPick) {
      this._showReplacementPicker();
      return;
    }

    this._onHouseEventComplete();
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
          this._onHouseEventComplete();
        }
      });
    });

    const skip = this.ui.elements.actionDetail.querySelector('[data-veto-skip]');
    if (skip) {
      skip.addEventListener('click', () => {
        const vetoResult = this.eviction.playerUseVeto(vetoWinner, null, false);
        this.ui.hideActionDetail();
        this.logAndRender(vetoResult.results);
        this._onHouseEventComplete();
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
        this._onHouseEventComplete();
      });
    });
  }

  // ─── Eviction ──────────────────────────────────────────────────────

  runEvictionPhase() {
    if (this._maybeEndAtFinalTwo()) return;

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
    if (this.state.getPlayer().evicted) {
      const remaining = this.state.getActiveContestants().length;
      if (remaining > 1) {
        this.logAndRender([{
          type: 'system',
          text: 'You may continue watching the house as a spectator...'
        }]);
        setTimeout(() => this._spectateRemaining(), 1500);
      } else {
        this.state.checkWinCondition();
        this.endGame();
      }
      return;
    }

    this.state.phase = PHASES.WEEK_END;
    this.render();
    this.runPhase();
  }

  // ─── Week end ──────────────────────────────────────────────────────

  async runWeekEnd() {
    const active = this.state.getActiveContestants().length;

    this.logAndRender([{
      type: 'system',
      text: `Week ${this.state.week} is over. ${active} houseguests remain.`
    }]);

    if (isNarrativeApiEnabled()) {
      await this._appendAiNarrative('week_recap');
    }

    if (this.state.checkWinCondition(true)) {
      this.endGame();
      return;
    }

    this.state.startNewWeek();
    this.competition.currentCompetition = null;
    this.logAndRender([{
      type: 'success',
      text: `<strong>Week ${this.state.week}</strong> begins. The game is heating up.`
    }]);

    this.render();
    this.runPhase();
  }

  // ─── Spectator mode (player evicted) ───────────────────────────────

  _spectateRemaining() {
    while (!this.state.gameOver) {
      const activeCount = this.state.getActiveContestants().length;
      if (activeCount <= 2) {
        this.state.checkWinCondition(true);
        break;
      }

      this.state.startNewWeek();
      this.competition.currentCompetition = null;

      const { results } = this.competition.runCompetition();
      this.state.storyLog.push(
        ...results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.COMPETITION
        }))
      );

      const nomResults = this.eviction.runNominations();
      this.state.storyLog.push(
        ...nomResults.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.NOMINATION
        }))
      );

      const vetoComp = this.eviction.runVetoCompetition(false);
      this.state.storyLog.push(
        ...vetoComp.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.VETO_COMP
        }))
      );

      const vetoMeet = this.eviction.runVetoCeremony(vetoComp.vetoWinner);
      this.state.storyLog.push(
        ...vetoMeet.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.VETO_CEREMONY
        }))
      );

      const evictResults = this.eviction.runEvictionVote(null);
      this.state.storyLog.push(
        ...evictResults.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.EVICTION
        }))
      );

      if (this.state.getActiveContestants().length <= 2) {
        this.state.checkWinCondition(true);
        break;
      }
    }

    this.render();
    this.endGame();
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
