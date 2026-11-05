#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import tasksJson from '../data/tasks.json' with { type: 'json' };
import { hydrateTaskCatalog, getTaskDefinitions, taskCatalogSize } from '../modules/Tasks.js';
import { auditTaskCatalog } from '../modules/TaskCatalogAudit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(join(__dirname, '..'));

hydrateTaskCatalog(tasksJson);
const tasks = getTaskDefinitions();
const report = auditTaskCatalog(tasks);

console.log(`Merged catalog: ${taskCatalogSize()} tasks`);
if (report.ok) {
  console.log('PASS: every task passes schema and copy-quality checks.');
  process.exit(0);
}

console.error(`FAIL: ${report.issues.length} issue(s)`);
for (const issue of report.issues) {
  console.error(`${issue.code}\t${issue.taskId ?? issue.id}\t${issue.message}`);
}
process.exit(1);
