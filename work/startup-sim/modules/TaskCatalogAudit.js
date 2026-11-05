/** @typedef {{ id: string; code: string; message: string; taskId?: string }} TaskCatalogAuditIssue */

const VALID_TYPES = new Set(['marketing', 'sales', 'research', 'product', 'growth', 'support', 'success']);
const VALID_STAGES = new Set(['garage', 'office', 'xc', 'post_xc', 'public']);
const PLACEHOLDER_DESC = /keeps the rotating catalog|desk play #/i;
const PLACEHOLDER_TITLE = /\(cycle \d+\)/i;
const NONSENSE = /\b(asdf|lorem ipsum|foo bar|test task)\b/i;

const MIN_DESC_CHARS = 20;
/** Punchy one-liners are OK; reject single-phrase blurbs under three words. */
const MIN_DESC_WORDS = 3;
const MIN_TITLE_CHARS = 6;

const SIGNATURE_ID_PREFIXES = ['sig-', 'launch-pre-signature-'];
const SIGNATURE_IDS = new Set(['xc-demo-day']);

function wordCount(text) {
  return (text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Content + schema checks for one desk task definition.
 * @param {Record<string, unknown>} task
 * @returns {TaskCatalogAuditIssue[]}
 */
export function auditTaskDefinition(task) {
  /** @type {TaskCatalogAuditIssue[]} */
  const issues = [];
  const id = String(task.id ?? '');
  const title = String(task.title ?? '').trim();
  const description = String(task.description ?? '').trim();

  if (!id) issues.push({ id: '', code: 'missing_id', message: 'Task missing id' });
  if (title.length < MIN_TITLE_CHARS) {
    issues.push({
      id,
      code: 'title_too_short',
      message: `Title too short (${title.length} chars): “${title}”`,
      taskId: id
    });
  }
  if (!description) {
    issues.push({ id, code: 'missing_description', message: 'Missing description', taskId: id });
  } else {
    if (description.length < MIN_DESC_CHARS) {
      issues.push({
        id,
        code: 'description_too_short',
        message: `Description too short (${description.length} chars)`,
        taskId: id
      });
    }
    if (wordCount(description) < MIN_DESC_WORDS) {
      issues.push({
        id,
        code: 'description_too_few_words',
        message: `Description needs at least ${MIN_DESC_WORDS} words`,
        taskId: id
      });
    }
    if (PLACEHOLDER_DESC.test(description)) {
      issues.push({ id, code: 'placeholder_description', message: 'Placeholder catalog copy', taskId: id });
    }
    if (description.toLowerCase() === title.toLowerCase()) {
      issues.push({ id, code: 'description_equals_title', message: 'Description duplicates title', taskId: id });
    }
  }

  if (PLACEHOLDER_TITLE.test(title)) {
    issues.push({ id, code: 'placeholder_title', message: 'Placeholder cycle title', taskId: id });
  }
  if (NONSENSE.test(`${title} ${description}`)) {
    issues.push({ id, code: 'nonsense_copy', message: 'Nonsense placeholder text', taskId: id });
  }

  const types = task.types;
  if (!Array.isArray(types) || types.length === 0) {
    issues.push({ id, code: 'missing_types', message: 'Missing types[]', taskId: id });
  } else {
    for (const ty of types) {
      if (!VALID_TYPES.has(ty)) {
        issues.push({ id, code: 'invalid_type', message: `Unknown type “${ty}”`, taskId: id });
      }
    }
  }

  const stages = task.stages;
  if (!Array.isArray(stages) || stages.length === 0) {
    issues.push({ id, code: 'missing_stages', message: 'Missing stages[]', taskId: id });
  } else {
    for (const st of stages) {
      if (!VALID_STAGES.has(st)) {
        issues.push({ id, code: 'invalid_stage', message: `Unknown stage “${st}”`, taskId: id });
      }
    }
  }

  if (typeof task.cost !== 'number' || Number.isNaN(task.cost) || task.cost < 0) {
    issues.push({ id, code: 'invalid_cost', message: 'Invalid cost', taskId: id });
  }
  const rev = task.revenue;
  if (!Array.isArray(rev) || rev.length !== 2 || rev.some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    issues.push({ id, code: 'invalid_revenue', message: 'Invalid revenue range', taskId: id });
  }

  if (id.startsWith('cat-')) {
    const cats = task.categories;
    if (!Array.isArray(cats) || cats.length === 0) {
      issues.push({ id, code: 'category_task_missing_categories', message: 'Category task missing categories[]', taskId: id });
    }
  }

  if (task.signature === true) {
    const okSig =
      SIGNATURE_IDS.has(id) || SIGNATURE_ID_PREFIXES.some((p) => id.startsWith(p));
    if (!okSig) {
      issues.push({ id, code: 'signature_id_mismatch', message: 'signature flag on non-signature id', taskId: id });
    }
  }

  return issues;
}

/**
 * @param {Record<string, unknown>[]} tasks
 * @returns {{ ok: boolean; issues: TaskCatalogAuditIssue[]; taskCount: number }}
 */
export function auditTaskCatalog(tasks) {
  /** @type {TaskCatalogAuditIssue[]} */
  const issues = [];
  const ids = new Set();
  const titles = new Map();

  for (const task of tasks) {
    const id = String(task.id ?? '');
    if (ids.has(id)) {
      issues.push({ id, code: 'duplicate_id', message: `Duplicate task id “${id}”`, taskId: id });
    }
    ids.add(id);

    const titleKey = String(task.title ?? '').trim().toLowerCase();
    if (titleKey) {
      if (!titles.has(titleKey)) titles.set(titleKey, []);
      titles.get(titleKey).push(id);
    }

    issues.push(...auditTaskDefinition(task));
  }

  for (const [titleKey, taskIds] of titles) {
    if (taskIds.length > 1) {
      issues.push({
        id: taskIds[0],
        code: 'duplicate_title',
        message: `Duplicate title “${titleKey}” on ${taskIds.join(', ')}`,
        taskId: taskIds[0]
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    taskCount: tasks.length
  };
}
