/**
 * Neighborhood Greenhouse — minimal tick sim built for the 2026 tutorial blog.
 */

import { createInitialState, resetWeekPlan } from "./modules/GameState.js";
import { queueAction, resolveWeek, unqueueAction } from "./modules/Simulation.js";
import { UIManager } from "./modules/UI.js";

class GreenhouseGame {
  constructor() {
    this.state = null;
    this.seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    this.ui = new UIManager();
    this.ui.bindSetup(() => this.start());
    this.ui.bindActions(
      (id) => this.onAction(id),
      () => this.onEndWeek(),
      (i) => this.onUnqueue(i)
    );
    this.ui.showSetup();
  }

  start() {
    this.state = createInitialState();
    this.ui.showGame();
    this.render();
  }

  onAction(actionId) {
    const result = queueAction(this.state, actionId);
    if (!result.ok) {
      this.ui.showToast(result.reason);
      return;
    }
    this.render();
  }

  onUnqueue(index) {
    unqueueAction(this.state, index);
    this.render();
  }

  onEndWeek() {
    if (this.state.gameOver) return;
    resolveWeek(this.state, this.seed);
    if (!this.state.gameOver) resetWeekPlan(this.state);
    this.render();
  }

  render() {
    this.ui.render(this.state);
  }
}

new GreenhouseGame();