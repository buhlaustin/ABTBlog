/**
 * Ensures interactive ids / data-* hooks rendered in startup-sim modules
 * are handled in game.js (click / submit / change delegation).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sim = join(root, 'work', 'startup-sim');
const gameJs = readFileSync(join(sim, 'game.js'), 'utf8');

const moduleFiles = readdirSync(join(sim, 'modules'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => join(sim, 'modules', f));

const html = readFileSync(join(sim, 'index.html'), 'utf8');
const sources = [{ name: 'index.html', text: html }, ...moduleFiles.map((p) => ({ name: p, text: readFileSync(p, 'utf8') }))];

const btnIds = new Set();
const dataAttrs = new Set();

for (const { text } of sources) {
  for (const m of text.matchAll(/\bid="(btn-[a-z0-9-]+)"/g)) btnIds.add(m[1]);
  for (const m of text.matchAll(/\bid='(btn-[a-z0-9-]+)'/g)) btnIds.add(m[1]);
  for (const m of text.matchAll(/data-(complete-task|complete-board-task|staff-delta|remove-satellite|crisis-choice|decision-choice|acquisition-buy|acquisition-sell|acquisition-reinvest-pick|acquisition-reinvest-submit|acquisition-diligence|companies-filter|companies-page|companies-sort|stock-guidance|stock-buyback|stock-follow-on|stock-split|stock-dividend|join-accelerator|loan-draw|loan-prepay|owner-draw|ceo-salary-preset|social-tab|staff-input|tutorial-id|toggle-task-offer|purchase-workspace|hire-exec|product-action)/g)) {
    dataAttrs.add(m[1]);
  }
}

/** Bound on index.html or dedicated listeners outside app delegation. */
const externalBtnHandlers = new Set([
  'btn-new',
  'btn-load',
  'btn-continue-open',
  'btn-dismiss-continue-offer',
  'btn-setup-back',
  'btn-back-start',
  'btn-save',
  'btn-gameover-menu',
  'btn-export-run',
  'btn-start-game',
  'btn-month-summary-close',
  'btn-confirm-task-lineup',
  'btn-start-exec-hire',
  'btn-cancel-exec-hire'
]);

const unhandled = [];
for (const id of btnIds) {
  if (externalBtnHandlers.has(id)) continue;
  const patterns = [
    `e.target.id === '${id}'`,
    `getElementById('${id}')`,
    `id === '${id}'`
  ];
  if (!patterns.some((p) => gameJs.includes(p))) {
    unhandled.push({ kind: 'button-id', id });
  }
}

const dataPatterns = {
  'complete-task': "closest('[data-complete-task]')",
  'staff-delta': "closest('[data-staff-delta]')",
  'remove-satellite': "closest('[data-remove-satellite]')",
  'crisis-choice': "closest('[data-crisis-choice]')",
  'decision-choice': "closest('[data-decision-choice]')",
  'acquisition-buy': "closest('[data-acquisition-buy]')",
  'acquisition-sell': "closest('[data-acquisition-sell]')",
  'acquisition-reinvest-pick': "closest('[data-acquisition-reinvest-pick]')",
  'acquisition-reinvest-submit': "closest('[data-acquisition-reinvest-submit]')",
  'companies-filter': "closest('[data-companies-filter]')",
  'companies-page': "closest('[data-companies-page]')",
  'companies-sort': "closest('[data-companies-sort]')",
  'acquisition-diligence': "closest('[data-acquisition-diligence]')",
  'stock-guidance': "closest('[data-stock-guidance]')",
  'stock-buyback': "closest('[data-stock-buyback]')",
  'stock-follow-on': "closest('[data-stock-follow-on]')",
  'stock-split': "closest('[data-stock-split]')",
  'stock-dividend': "closest('[data-stock-dividend]')",
  'social-tab': "closest('[data-social-tab]')",
  'staff-input': "closest('[data-staff-input]')",
  'tutorial-id': 'btn-dismiss-tutorial',
  'toggle-task-offer': "closest('[data-toggle-task-offer]')",
  'purchase-workspace': "closest('[data-purchase-workspace]')",
  'complete-board-task': "closest('[data-complete-board-task]')",
  'hire-exec': "closest('[data-hire-exec]')",
  'product-action': "closest('[data-product-action]')",
  'join-accelerator': "closest('[data-join-accelerator]')",
  'loan-draw': "closest('[data-loan-draw]')",
  'loan-prepay': "closest('[data-loan-prepay]')",
  'owner-draw': "closest('[data-owner-draw]')",
  'ceo-salary-preset': "closest('[data-ceo-salary-preset]')"
};

for (const attr of dataAttrs) {
  const needle = dataPatterns[attr];
  if (!needle || !gameJs.includes(needle)) {
    unhandled.push({ kind: 'data-attr', id: attr });
  }
}

const forms = new Set();
for (const { text } of sources) {
  for (const m of text.matchAll(/\bid="([a-z0-9-]+-form)"/g)) forms.add(m[1]);
}

const externalFormHandlers = {
  'setup-form': "getElementById('setup-form')"
};

for (const formId of forms) {
  const external = externalFormHandlers[formId];
  if (external && gameJs.includes(external)) continue;
  if (!gameJs.includes(`e.target.id === '${formId}'`)) {
    unhandled.push({ kind: 'form-id', id: formId });
  }
}

if (unhandled.length) {
  console.error('startup-sim wiring audit FAILED:');
  for (const u of unhandled) console.error(`  ${u.kind}: ${u.id}`);
  process.exit(1);
}

console.log(`startup-sim wiring audit OK (${btnIds.size} button ids, ${forms.size} forms, ${dataAttrs.size} data hooks)`);
