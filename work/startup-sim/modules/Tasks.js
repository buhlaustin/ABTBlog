import { assetBaseUrl } from './utils.js';

let taskCatalog = null;

export async function loadTaskCatalog() {
  if (taskCatalog) return taskCatalog;
  try {
    const res = await fetch(`${assetBaseUrl()}data/tasks.json`, { cache: 'no-store' });
    if (!res.ok) return { version: 1, tasks: [] };
    taskCatalog = await res.json();
  } catch {
    taskCatalog = { version: 1, tasks: [] };
  }
  return taskCatalog;
}

/** Phase 1: deal monthly task deck. */
export function getAvailableTasks(_state) {
  return [];
}
