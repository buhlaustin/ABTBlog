import { ACTIONS, TUNING } from "./Data.js";

const $ = (id) => document.getElementById(id);

function pct(n) {
  return `${Math.round(n)}%`;
}

export class UIManager {
  constructor() {
    this.setupScreen = $("screen-setup");
    this.gameScreen = $("screen-game");
    this.toastEl = $("toast");
    this._toastTimer = null;
  }

  showSetup() {
    this.setupScreen?.removeAttribute("hidden");
    this.gameScreen?.setAttribute("hidden", "");
  }

  showGame() {
    this.setupScreen?.setAttribute("hidden", "");
    this.gameScreen?.removeAttribute("hidden");
  }

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add("visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl?.classList.remove("visible"), 2200);
  }

  bindActions(onAction, onEndWeek, onUnqueue) {
    for (const [id, def] of Object.entries(ACTIONS)) {
      const btn = $(`act-${id}`);
      btn?.addEventListener("click", () => onAction(id));
    }
    $("btn-end-week")?.addEventListener("click", onEndWeek);
    $("btn-restart")?.addEventListener("click", () => window.location.reload());
    $("queue-list")?.addEventListener("click", (ev) => {
      const row = ev.target.closest("[data-index]");
      if (!row) return;
      onUnqueue(Number(row.dataset.index));
    });
  }

  bindSetup(onStart) {
    $("btn-start")?.addEventListener("click", onStart);
  }

  render(state) {
    $("week-label").textContent = `Week ${Math.min(state.week, TUNING.maxWeeks)} of ${TUNING.maxWeeks}`;
    $("ap-label").textContent = `${state.apLeft} AP left`;
    $("stat-growth").textContent = pct(state.growth);
    $("stat-health").textContent = pct(state.health);
    $("stat-moisture").textContent = pct(state.moisture);
    $("stat-sun").textContent = pct(state.sun);
    $("stat-nutrients").textContent = pct(state.nutrients);
    $("stat-mold").textContent = pct(state.mold);
    $("stat-reservoir").textContent = pct(state.reservoir);

    const bars = [
      ["bar-growth", state.growth],
      ["bar-health", state.health],
      ["bar-moisture", state.moisture],
      ["bar-sun", state.sun],
      ["bar-nutrients", state.nutrients],
      ["bar-mold", state.mold],
    ];
    for (const [id, val] of bars) {
      const el = $(id);
      if (el) el.style.setProperty("--fill", `${val}%`);
    }

    const weather = state.lastWeather;
    $("weather-chip").textContent = weather ? weather.label : "Plan the week";
    $("weather-detail").textContent = weather?.blurb ?? "Queue actions, then end the week.";

    const list = $("queue-list");
    if (list) {
      list.innerHTML = state.queued
        .map(
          (id, i) =>
            `<li data-index="${i}"><span>${ACTIONS[id]?.label ?? id}</span><button type="button" aria-label="Remove">×</button></li>`
        )
        .join("");
    }

    const log = $("event-log");
    if (log) {
      log.innerHTML = state.log
        .slice(0, 8)
        .map((row) => `<li><span class="log-week">W${row.week}</span> ${row.text}</li>`)
        .join("");
    }

    const overlay = $("screen-result");
    if (state.gameOver && overlay) {
      overlay.removeAttribute("hidden");
      $("result-title").textContent = state.won ? "Harvest shipped" : "Season lost";
      $("result-copy").textContent = state.won
        ? `Maturity hit ${pct(state.growth)} with ${pct(state.health)} plant health.`
        : `Growth stalled at ${pct(state.growth)}. Tune moisture, sun, and nutrients into the green band.`;
    }
  }
}