#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { auditGrowthCampaignCatalog } from '../modules/GrowthCampaignAudit.js';
import { getGrowthCampaigns } from '../modules/GrowthCampaigns.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(join(__dirname, '..'));

const campaigns = getGrowthCampaigns();
const report = auditGrowthCampaignCatalog(campaigns);

console.log(`Merged growth bank: ${report.campaignCount} campaigns`);
if (report.ok) {
  console.log('PASS: every paid growth campaign passes schema and copy-quality checks.');
  process.exit(0);
}

console.error(`FAIL: ${report.issues.length} issue(s)`);
for (const issue of report.issues) {
  console.error(`${issue.code}\t${issue.campaignId ?? issue.id}\t${issue.message}`);
}
process.exit(1);
