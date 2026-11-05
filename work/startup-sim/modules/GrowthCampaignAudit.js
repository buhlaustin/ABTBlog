/** @typedef {{ id: string; code: string; message: string; campaignId?: string }} GrowthCampaignAuditIssue */

const PLACEHOLDER_TITLE =
  /\(cycle \d+\)|\(\d+\)\s*$|#\d+\s*:|public whale|giga enterprise|mega enterprise close|wave \d+\s*$/i;
const PLACEHOLDER_DESC =
  /keeps the rotating catalog|desk play #|legal clears claims; growth clears the invoice|sales wants leads by friday\.|ir watches mentions; ops watches traffic\./i;
const TEMPLATE_TITLE = /^[^:]+:\s*(brand lift|demand gen|analyst mindshare|enterprise pipeline push)\s*$/i;
const NONSENSE = /\b(asdf|lorem ipsum|foo bar|test campaign)\b/i;

const MIN_DESC_CHARS = 18;
const MIN_DESC_WORDS = 3;
const MIN_TITLE_CHARS = 6;

function wordCount(text) {
  return (text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Collapse digits so “Spot (12)” and “Spot (99)” match as one template. */
export function normalizeCampaignTitleSkeleton(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/\(\d+\)/g, '(#)')
    .replace(/\s#\d+\b/g, ' #')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {Record<string, unknown>} campaign
 * @returns {GrowthCampaignAuditIssue[]}
 */
export function auditGrowthCampaignDefinition(campaign) {
  /** @type {GrowthCampaignAuditIssue[]} */
  const issues = [];
  const id = String(campaign.id ?? '');
  const title = String(campaign.title ?? '').trim();
  const description = String(campaign.description ?? '').trim();

  if (!id) issues.push({ id: '', code: 'missing_id', message: 'Campaign missing id' });
  if (title.length < MIN_TITLE_CHARS) {
    issues.push({
      id,
      code: 'title_too_short',
      message: `Title too short (${title.length} chars)`,
      campaignId: id
    });
  }
  if (!description) {
    issues.push({ id, code: 'missing_description', message: 'Missing description', campaignId: id });
  } else {
    if (description.length < MIN_DESC_CHARS) {
      issues.push({
        id,
        code: 'description_too_short',
        message: `Description too short (${description.length} chars)`,
        campaignId: id
      });
    }
    if (wordCount(description) < MIN_DESC_WORDS) {
      issues.push({
        id,
        code: 'description_too_few_words',
        message: `Description needs at least ${MIN_DESC_WORDS} words`,
        campaignId: id
      });
    }
    if (description.toLowerCase() === title.toLowerCase()) {
      issues.push({
        id,
        code: 'description_equals_title',
        message: 'Description duplicates title',
        campaignId: id
      });
    }
  }

  if (PLACEHOLDER_TITLE.test(title) || TEMPLATE_TITLE.test(title)) {
    issues.push({ id, code: 'placeholder_title', message: 'Generated/template campaign title', campaignId: id });
  }
  if (PLACEHOLDER_DESC.test(description)) {
    issues.push({ id, code: 'placeholder_description', message: 'Generated/template description', campaignId: id });
  }
  if (NONSENSE.test(`${title} ${description}`)) {
    issues.push({ id, code: 'nonsense_copy', message: 'Nonsense placeholder text', campaignId: id });
  }

  if (typeof campaign.cost !== 'number' || Number.isNaN(campaign.cost) || campaign.cost < 0) {
    issues.push({ id, code: 'invalid_cost', message: 'Invalid cost', campaignId: id });
  }
  const rev = campaign.revenue;
  if (!Array.isArray(rev) || rev.length !== 2 || rev.some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    issues.push({ id, code: 'invalid_revenue', message: 'Invalid revenue range', campaignId: id });
  }

  return issues;
}

/**
 * @param {Record<string, unknown>[]} campaigns
 * @returns {{ ok: boolean; issues: GrowthCampaignAuditIssue[]; campaignCount: number }}
 */
export function auditGrowthCampaignCatalog(campaigns) {
  /** @type {GrowthCampaignAuditIssue[]} */
  const issues = [];
  const ids = new Set();
  const titles = new Map();
  const descriptions = new Map();
  const skeletons = new Map();

  for (const campaign of campaigns) {
    const id = String(campaign.id ?? '');
    if (ids.has(id)) {
      issues.push({ id, code: 'duplicate_id', message: `Duplicate campaign id “${id}”`, campaignId: id });
    }
    ids.add(id);

    const titleKey = String(campaign.title ?? '').trim().toLowerCase();
    if (titleKey) {
      if (!titles.has(titleKey)) titles.set(titleKey, []);
      titles.get(titleKey).push(id);
    }

    const descKey = String(campaign.description ?? '').trim().toLowerCase();
    if (descKey) {
      if (!descriptions.has(descKey)) descriptions.set(descKey, []);
      descriptions.get(descKey).push(id);
    }

    const sk = normalizeCampaignTitleSkeleton(campaign.title);
    if (sk) {
      if (!skeletons.has(sk)) skeletons.set(sk, []);
      skeletons.get(sk).push(id);
    }

    issues.push(...auditGrowthCampaignDefinition(campaign));
  }

  for (const [titleKey, campaignIds] of titles) {
    if (campaignIds.length > 1) {
      issues.push({
        id: campaignIds[0],
        code: 'duplicate_title',
        message: `Duplicate title “${titleKey}” on ${campaignIds.join(', ')}`,
        campaignId: campaignIds[0]
      });
    }
  }

  for (const [descKey, campaignIds] of descriptions) {
    if (campaignIds.length > 1) {
      issues.push({
        id: campaignIds[0],
        code: 'duplicate_description',
        message: `Duplicate description on ${campaignIds.join(', ')}`,
        campaignId: campaignIds[0]
      });
    }
  }

  for (const [sk, campaignIds] of skeletons) {
    if (campaignIds.length > 1) {
      issues.push({
        id: campaignIds[0],
        code: 'template_title_skeleton',
        message: `Template title skeleton “${sk}” on ${campaignIds.join(', ')}`,
        campaignId: campaignIds[0]
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    campaignCount: campaigns.length
  };
}
