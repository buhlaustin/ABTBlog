#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'work', 'cfb-dynasty-sim', 'data');
let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

function load(relative) {
  return JSON.parse(readFileSync(join(root, relative), 'utf8'));
}

const fbs = load('schools/fbs_2026.json');
const fcs = load('schools/fcs_2026.json');

if (fbs.schools.length !== 138) fail(`expected 138 FBS schools, got ${fbs.schools.length}`);
if (fcs.schools.length !== 128) fail(`expected 128 FCS schools, got ${fcs.schools.length}`);

const ids = new Set();
for (const s of [...fbs.schools, ...fcs.schools]) {
  if (ids.has(s.id)) fail(`duplicate school id ${s.id}`);
  ids.add(s.id);
  if (!s.conferenceId) fail(`missing conferenceId for ${s.id}`);
}

const confIds = new Set([
  ...fbs.conferences.map((c) => c.id),
  ...fcs.conferences.map((c) => c.id)
]);
for (const s of [...fbs.schools, ...fcs.schools]) {
  if (!confIds.has(s.conferenceId)) fail(`unknown conference ${s.conferenceId} for ${s.id}`);
}

if (!failed) {
  console.log('OK: CFB Dynasty school data (FBS 138, FCS 128, unique ids)');
}
process.exit(failed ? 1 : 0);
