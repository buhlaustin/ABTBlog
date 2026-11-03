import { STARTUP_CATEGORIES } from './modules/Categories.js';
import { createInitialState } from './modules/GameState.js';
import {
  bindSandboxCashToggle,
  populateCategorySelect,
  renderGarageHud,
  showScreen
} from './modules/UI.js';

let sessionState = null;

function init() {
  const categorySelect = document.getElementById('startup-category');
  populateCategorySelect(categorySelect, STARTUP_CATEGORIES);

  const setupForm = document.getElementById('setup-form');
  bindSandboxCashToggle(setupForm);

  document.getElementById('btn-new')?.addEventListener('click', () => {
    showScreen('setup');
  });

  document.getElementById('btn-setup-back')?.addEventListener('click', () => {
    showScreen('start');
  });

  document.getElementById('btn-back-start')?.addEventListener('click', () => {
    sessionState = null;
    showScreen('start');
  });

  setupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(setupForm);
    const companyName = String(fd.get('companyName') || '').trim();
    const categoryId = String(fd.get('category') || '');
    const mode = String(fd.get('mode') || 'career');
    const sandboxCash = fd.get('sandboxCash');

    if (!companyName || !categoryId) return;

    sessionState = createInitialState({
      companyName,
      categoryId,
      mode,
      sandboxCash
    });

    renderGarageHud(sessionState);
    showScreen('garage');
  });

  showScreen('start');
}

init();
