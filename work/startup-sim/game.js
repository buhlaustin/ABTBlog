import { loadCategories } from './modules/Categories.js';
import { createInitialState, normalizeSave } from './modules/GameState.js';
import { StorageManager } from './modules/Storage.js';
import { loadTaskCatalog } from './modules/Tasks.js';
import { initNarrativeApiUrl, isNarrativeApiEnabled } from './modules/NarrativeApi.js';
import {
  bindSandboxCashToggle,
  bindTabNavigation,
  flashSaveStatus,
  populateCategorySelect,
  renderAllPanels,
  setLoadButtonEnabled,
  showScreen
} from './modules/UI.js';

let sessionState = null;

function enterGame(state) {
  sessionState = state;
  renderAllPanels(sessionState);
  showScreen('game');
}

async function init() {
  const [categories] = await Promise.all([
    loadCategories(),
    loadTaskCatalog(),
    initNarrativeApiUrl()
  ]);

  const categorySelect = document.getElementById('startup-category');
  populateCategorySelect(categorySelect, categories);

  const setupForm = document.getElementById('setup-form');
  bindSandboxCashToggle(setupForm);
  bindTabNavigation();

  setLoadButtonEnabled(StorageManager.hasSave());

  const apiStatus = document.getElementById('start-api-status');
  if (apiStatus) {
    apiStatus.hidden = false;
    apiStatus.textContent = isNarrativeApiEnabled()
      ? 'AI narrative endpoint ready (used in Phase 4).'
      : 'AI narrative offline — core sim works without it.';
  }

  document.getElementById('btn-new')?.addEventListener('click', () => {
    showScreen('setup');
  });

  document.getElementById('btn-load')?.addEventListener('click', () => {
    const raw = StorageManager.load();
    const state = normalizeSave(raw);
    if (state) enterGame(state);
  });

  document.getElementById('btn-setup-back')?.addEventListener('click', () => {
    showScreen('start');
  });

  document.getElementById('btn-back-start')?.addEventListener('click', () => {
    sessionState = null;
    setLoadButtonEnabled(StorageManager.hasSave());
    showScreen('start');
  });

  document.getElementById('btn-save')?.addEventListener('click', () => {
    if (!sessionState) return;
    const ok = StorageManager.save(sessionState);
    flashSaveStatus(ok);
    setLoadButtonEnabled(StorageManager.hasSave());
  });

  setupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(setupForm);
    const companyName = String(fd.get('companyName') || '').trim();
    const categoryId = String(fd.get('category') || '');
    const mode = String(fd.get('mode') || 'career');
    const sandboxCash = fd.get('sandboxCash');

    if (!companyName || !categoryId) return;

    enterGame(
      createInitialState({
        companyName,
        categoryId,
        mode,
        sandboxCash
      })
    );
  });

  showScreen('start');
}

init();
