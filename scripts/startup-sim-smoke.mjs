/**
 * Headless smoke checks for Startup Simulator (no browser).
 * Run: node scripts/startup-sim-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sim = join(root, 'work', 'startup-sim');

const tasksJson = JSON.parse(readFileSync(join(sim, 'data/tasks.json'), 'utf8'));
const { STAGES, getMonthlyTaskSlots, getMonthlyTaskOfferCount } = await import(
  `file://${join(sim, 'modules/constants.js')}`
);
const { createInitialState, normalizeSave, formatMoney } = await import(
  `file://${join(sim, 'modules/GameState.js')}`
);
const {
  hydrateTaskCatalog,
  dealMonthlyTasks,
  pickMonthlyTaskDefs,
  monthDealHasDuplicateTaskIds,
  confirmTaskLineup,
  selectedOfferCount,
  needsTaskLineup,
  getTaskPoolSize,
  getEligibleDeskTasks,
  getTaskDefinitions,
  taskCatalogSize,
  RECENT_TASK_COOLDOWN_MONTHS
} = await import(`file://${join(sim, 'modules/Tasks.js')}`);
hydrateTaskCatalog(tasksJson);

let failed = false;

const lifetimeSample = formatMoney(20_754_580_000_000);
const groupedHuge = formatMoney(1_234_560_000_000_000);
const midSample = formatMoney(1_234_567);
if (lifetimeSample !== '$20.75T') {
  console.error(`FAIL: formatMoney should compact trillions (got ${lifetimeSample})`);
  failed = true;
} else if (groupedHuge !== '$1,234.56T') {
  console.error(`FAIL: formatMoney should compact huge trillions (got ${groupedHuge})`);
  failed = true;
} else if (midSample !== '$1,234,567') {
  console.error(`FAIL: formatMoney should comma-group under $10M (got ${midSample})`);
  failed = true;
} else if (!failed) {
  console.log(`OK: formatMoney (${midSample}, ${lifetimeSample}, ${groupedHuge})`);
}

if (taskCatalogSize() < 1200) {
  console.error(`FAIL: merged task catalog ${taskCatalogSize()} < 1200`);
  failed = true;
} else {
  console.log(`OK: task catalog size ${taskCatalogSize()} (cooldown ${RECENT_TASK_COOLDOWN_MONTHS} months)`);
}
const publicWhales = getTaskDefinitions().filter((t) => t.whale === true && t.stages?.includes('public'));
if (!getTaskDefinitions().some((t) => t.id === 'whale-fortune50-platform-renewal')) {
  console.error('FAIL: handcrafted public whale pack not merged into catalog');
  failed = true;
} else if (publicWhales.length < 23) {
  console.error(`FAIL: expected 23+ public whale desk tasks, got ${publicWhales.length}`);
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'public-esg-metrics-audit-defense')) {
  console.error('FAIL: public late handcrafted pack not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'public-ipo-first-earnings-dry-run')) {
  console.error('FAIL: public post-IPO handcrafted pack not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'mid-soc2-type2-evidence-sprint')) {
  console.error('FAIL: mid-game handcrafted pack not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'launch-post-handcrafted-churn-interviews')) {
  console.error('FAIL: post-launch handcrafted pack not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'launch-pre-cat-ai-tools-pretrain-shard-mix')) {
  console.error('FAIL: ai-tools pre-launch pack not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'launch-chatxgpt-ga-flip')) {
  console.error('FAIL: ChatXGPT launch pack not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'cat-ai-tools-post-batch-api-release')) {
  console.error('FAIL: AI post-batch API release task not merged');
  failed = true;
} else if (!getTaskDefinitions().some((t) => t.id === 'whale-ai-tools-hyperscaler-marketplace-credits')) {
  console.error('FAIL: AI post-XC API credit whale pack not merged');
  failed = true;
} else if (!failed) {
  console.log(`OK: public whale desk tasks (${publicWhales.length} flagged whale)`);
}
const publicMegawhales = getTaskDefinitions().filter(
  (t) => t.megawhale === true && t.stages?.includes('public')
);
if (!getTaskDefinitions().some((t) => t.id === 'megawhale-federal-cloud-continuity-mandate')) {
  console.error('FAIL: handcrafted public megawhale desk pack not merged');
  failed = true;
} else if (publicMegawhales.length < 18) {
  console.error(`FAIL: expected 18+ public megawhale desk tasks, got ${publicMegawhales.length}`);
  failed = true;
} else if (!failed) {
  console.log(`OK: public megawhale desk tasks (${publicMegawhales.length} multi-billion)`);
}

const genericPool = getTaskDefinitions().filter((t) => !t.categories?.length && !t.launchPhase);
for (let i = 0; i < 80; i += 1) {
  const recent = genericPool.slice(i * 3, i * 3 + 80).map((t) => t.id);
  const picked = pickMonthlyTaskDefs(genericPool, 10, recent);
  if (monthDealHasDuplicateTaskIds(picked) || picked.length !== new Set(picked.map((t) => t.id)).size) {
    console.error('FAIL: monthly task offers must be unique ids');
    failed = true;
    break;
  }
}
if (!failed) {
  console.log('OK: monthly offers unique (no duplicate options per month)');
}

const { auditTaskCatalog } = await import(`file://${join(sim, 'modules/TaskCatalogAudit.js')}`);
const catalogAudit = auditTaskCatalog(getTaskDefinitions());
if (!catalogAudit.ok) {
  console.error(`FAIL: task catalog audit (${catalogAudit.issues.length} issues on ${catalogAudit.taskCount} tasks)`);
  catalogAudit.issues.slice(0, 12).forEach((issue) => {
    console.error(`  ${issue.code} ${issue.taskId ?? issue.id}: ${issue.message}`);
  });
  failed = true;
} else {
  console.log(`OK: all ${catalogAudit.taskCount} desk tasks pass catalog audit (schema + copy bar)`);
}

const { auditGrowthCampaignCatalog } = await import(
  `file://${join(sim, 'modules/GrowthCampaignAudit.js')}`
);
const { getGrowthCampaigns } = await import(`file://${join(sim, 'modules/GrowthCampaigns.js')}`);
const growthAudit = auditGrowthCampaignCatalog(getGrowthCampaigns());
if (!growthAudit.ok) {
  console.error(
    `FAIL: growth campaign audit (${growthAudit.issues.length} issues on ${growthAudit.campaignCount} campaigns)`
  );
  growthAudit.issues.slice(0, 12).forEach((issue) => {
    console.error(`  ${issue.code} ${issue.campaignId ?? issue.id}: ${issue.message}`);
  });
  failed = true;
} else {
  console.log(
    `OK: all ${growthAudit.campaignCount} paid growth campaigns pass catalog audit (unique, no template slop)`
  );
}

function categoryAllowed(task, categoryId) {
  const cats = task.categories;
  if (!cats?.length) return true;
  return cats.includes(categoryId);
}

function stageAllowed(task, stage) {
  const stages = task.stages ?? ['garage'];
  if (stage === STAGES.GARAGE || stage === STAGES.OFFICE) return stages.includes(stage);
  if (stage === STAGES.XC) return stages.includes('xc') || stages.includes('office');
  if (stage === STAGES.POST_XC) return stages.includes('post_xc') || stages.includes('xc');
  if (stage === STAGES.PUBLIC) return stages.includes('public') || stages.includes('post_xc');
  return stages.includes(stage);
}

const smokeCategory = 'b2b-saas';
for (const stage of Object.values(STAGES)) {
  const pool = tasksJson.tasks.filter(
    (t) => stageAllowed(t, stage) && categoryAllowed(t, smokeCategory)
  );
  const slots = getMonthlyTaskSlots(stage);
  if (pool.length === 0) {
    console.error(`FAIL: no tasks for stage ${stage}`);
    failed = true;
    continue;
  }
  if (pool.length < slots) {
    console.error(`FAIL: stage ${stage} category ${smokeCategory} pool ${pool.length} < slots ${slots}`);
    failed = true;
  }
  console.log(`OK: stage ${stage} pool ${pool.length}, slots ${slots}`);
}

const allCategories = JSON.parse(readFileSync(join(sim, 'data/categories.json'), 'utf8')).map(
  (c) => c.id
);
for (const stage of [STAGES.POST_XC, STAGES.PUBLIC]) {
  const slots = getMonthlyTaskSlots(stage);
  for (const categoryId of allCategories) {
    const pool = tasksJson.tasks.filter(
      (t) => stageAllowed(t, stage) && categoryAllowed(t, categoryId)
    );
    if (pool.length < slots) {
      console.error(
        `FAIL: ${stage} / ${categoryId} pool ${pool.length} < ${slots} monthly slots`
      );
      failed = true;
      continue;
    }
    let recent = [];
    let dupMonth = false;
    for (let i = 0; i < 40; i += 1) {
      const picked = pickMonthlyTaskDefs(pool, slots, recent);
      if (monthDealHasDuplicateTaskIds(picked)) {
        dupMonth = true;
        break;
      }
      recent = [...recent, ...picked.map((d) => d.id)];
    }
    if (dupMonth) {
      console.error(`FAIL: duplicate task ids in one month for ${stage} / ${categoryId}`);
      failed = true;
    } else {
      console.log(`OK: ${stage} / ${categoryId} unique monthly deals (${pool.length} tasks)`);
    }
  }
}

const state = createInitialState({
  companyName: 'SmokeTest',
  categoryId: 'b2b-saas',
  mode: 'career'
});

if (!state.calendar.monthTaskOffers?.length) {
  dealMonthlyTasks(state);
}
if (state.calendar.monthTaskOffers?.length && !state.calendar.taskLineupConfirmed) {
  const slots = state.calendar.monthTaskSlotTarget ?? 4;
  let picked = 0;
  for (const offer of state.calendar.monthTaskOffers) {
    if (picked >= slots) break;
    offer.selected = true;
    picked += 1;
  }
  confirmTaskLineup(state);
}
if (!state.calendar.monthTasks?.length) {
  console.error('FAIL: could not deal tasks after hydrating catalog');
  failed = true;
} else {
  console.log(`OK: initial deal ${state.calendar.monthTasks.length} tasks`);
}

const { getTaskDef } = await import(`file://${join(sim, 'modules/Tasks.js')}`);
const garageOffers = state.calendar.monthTaskOffers?.length
  ? state.calendar.monthTaskOffers
  : state.calendar.monthTasks;
const preLaunchOnly = (garageOffers ?? []).every((o) => {
  const def = getTaskDef(o.taskId);
  return def?.launchPhase === 'pre_launch';
});
if (!preLaunchOnly || !(garageOffers?.length >= 4)) {
  console.error('FAIL: garage should deal pre-launch playbook tasks only');
  failed = true;
} else {
  console.log('OK: garage pre-launch task pool');
}

const {
  canSchedulePublicLaunch,
  PRE_LAUNCH_BUZZ_REQUIRED,
  PRE_LAUNCH_PRODUCT_REQUIRED,
  onScheduleLaunchTaskCompleted,
  recordPreLaunchTaskOutcome
} = await import(`file://${join(sim, 'modules/LaunchLifecycle.js')}`);
const garagePool = getTaskPoolSize(state);
const offerNeed = getMonthlyTaskOfferCount(STAGES.GARAGE);
if (garagePool < offerNeed) {
  console.error(`FAIL: garage pre-launch pool ${garagePool} < offers ${offerNeed}`);
  failed = true;
}
state.product.buzz = PRE_LAUNCH_BUZZ_REQUIRED - 1;
if (canSchedulePublicLaunch(state)) {
  console.error('FAIL: schedule launch should require 10 buzz');
  failed = true;
}
const blocked = onScheduleLaunchTaskCompleted(state);
if (blocked.ok) {
  console.error('FAIL: schedule with low buzz should fail');
  failed = true;
}
state.product.buzz = PRE_LAUNCH_BUZZ_REQUIRED;
state.product.level = PRE_LAUNCH_PRODUCT_REQUIRED - 1;
if (canSchedulePublicLaunch(state)) {
  console.error('FAIL: schedule should require product level');
  failed = true;
}
state.product.level = PRE_LAUNCH_PRODUCT_REQUIRED;
if (!canSchedulePublicLaunch(state)) {
  console.error('FAIL: schedule should unlock at buzz + product gates');
  failed = true;
}
const wl = recordPreLaunchTaskOutcome(state, { launchPhase: 'pre_launch', types: ['marketing'], buzz: 2 }, 500);
if (!state.launch.waitlistSignups || !wl.length) {
  console.error('FAIL: pre-launch waitlist tracking');
  failed = true;
} else if (!failed) {
  console.log(`OK: pre-launch gates (${PRE_LAUNCH_BUZZ_REQUIRED} buzz, ${PRE_LAUNCH_PRODUCT_REQUIRED} product)`);
}

const crowdPreLaunch = getTaskDefinitions().filter(
  (t) => t.launchPhase === 'pre_launch' && t.crowdfunding
);
if (crowdPreLaunch.length < 12) {
  console.error(`FAIL: pre-launch crowdfunding desk bank too small (${crowdPreLaunch.length})`);
  failed = true;
}
const { applyTaskOutcome, rollTaskOutcome } = await import(
  `file://${join(sim, 'modules/Finance.js')}`
);
const crowdDef = crowdPreLaunch[0];
if (crowdDef) {
  const rolledCrowd = rollTaskOutcome(crowdDef, state);
  const beforeMrr = state.finance.mrr ?? 0;
  applyTaskOutcome(state, crowdDef, rolledCrowd);
  recordPreLaunchTaskOutcome(state, crowdDef, rolledCrowd.revenue, rolledCrowd);
  if ((state.finance.mrr ?? 0) <= beforeMrr || !(state.launch.crowdfundingMrr > 0)) {
    console.error('FAIL: crowdfunding desk task should add MRR and track campaigns');
    failed = true;
  } else {
    console.log(`OK: pre-launch crowdfunding desk tasks (${crowdPreLaunch.length} in bank)`);
  }
}

const aiPreLaunch = getTaskDefinitions().filter(
  (t) => t.launchPhase === 'pre_launch' && t.categories?.includes('ai-tools')
);
if (aiPreLaunch.length < 9) {
  console.error(`FAIL: ai-tools pre-launch bank ${aiPreLaunch.length} < 9`);
  failed = true;
} else {
  const aiLaunchState = createInitialState({
    companyName: 'ModelCo',
    categoryId: 'ai-tools',
    mode: 'career'
  });
  if (getTaskPoolSize(aiLaunchState) < getMonthlyTaskOfferCount(STAGES.GARAGE)) {
    console.error(`FAIL: ai-tools garage pre-launch pool ${getTaskPoolSize(aiLaunchState)} too small`);
    failed = true;
  } else {
    console.log(`OK: ai-tools pre-launch tasks (${aiPreLaunch.length} in bank)`);
  }
}

const {
  usesChatXgptLaunchPlaybook,
  CHATXGPT_PRODUCT_NAME,
  launchPhaseLabel,
  LAUNCH_MONTH_GARAGE_TASK_SLOTS,
  getMonthlyTaskSlotsForState,
  getMonthlyTaskOfferCountForState,
  isLaunchMonthGarage
} = await import(`file://${join(sim, 'modules/LaunchLifecycle.js')}`);
const launchWeekGarageState = createInitialState({
  companyName: 'LaunchWeekCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
launchWeekGarageState.launch.phase = 'launch_month';
if (!isLaunchMonthGarage(launchWeekGarageState)) {
  console.error('FAIL: launch_month garage detection');
  failed = true;
} else if (getMonthlyTaskSlotsForState(launchWeekGarageState) !== LAUNCH_MONTH_GARAGE_TASK_SLOTS) {
  console.error(
    `FAIL: launch month garage slots expected ${LAUNCH_MONTH_GARAGE_TASK_SLOTS}, got ${getMonthlyTaskSlotsForState(launchWeekGarageState)}`
  );
  failed = true;
} else {
  dealMonthlyTasks(launchWeekGarageState);
  if (launchWeekGarageState.calendar.monthTaskSlotTarget !== LAUNCH_MONTH_GARAGE_TASK_SLOTS) {
    console.error('FAIL: launch month deal should set 6 slot target');
    failed = true;
  } else if ((launchWeekGarageState.calendar.monthTaskOffers?.length ?? 0) < LAUNCH_MONTH_GARAGE_TASK_SLOTS) {
    console.error('FAIL: launch month offer board smaller than slot target');
    failed = true;
  } else {
    console.log(`OK: launch month garage desk (${LAUNCH_MONTH_GARAGE_TASK_SLOTS} slots, ${getMonthlyTaskOfferCountForState(launchWeekGarageState)} offers)`);
  }
}

const aiLaunchMonthState = createInitialState({
  companyName: 'ModelCo',
  categoryId: 'ai-tools',
  mode: 'career'
});
aiLaunchMonthState.launch.phase = 'launch_month';
if (!usesChatXgptLaunchPlaybook(aiLaunchMonthState)) {
  console.error('FAIL: ai-tools should use ChatXGPT launch playbook');
  failed = true;
} else if (!launchPhaseLabel(aiLaunchMonthState)?.includes(CHATXGPT_PRODUCT_NAME)) {
  console.error('FAIL: ChatXGPT launch phase label');
  failed = true;
} else if (getTaskPoolSize(aiLaunchMonthState) < getMonthlyTaskOfferCount(STAGES.GARAGE)) {
  console.error(`FAIL: ChatXGPT launch-month pool ${getTaskPoolSize(aiLaunchMonthState)} too small`);
  failed = true;
} else {
  const aiLaunchDeskIds = getEligibleDeskTasks(aiLaunchMonthState).map((t) => t.id);
  const aiLaunchDesk = getTaskDefinitions().filter(
    (t) => t.launchPhase === 'launch' && t.categories?.includes('ai-tools')
  );
  if (aiLaunchDesk.length < 6) {
    console.error(`FAIL: ChatXGPT launch-month bank ${aiLaunchDesk.length} < 6`);
    failed = true;
  } else if (aiLaunchDeskIds.includes('launch-day-product-hunt')) {
    console.error('FAIL: ai-tools launch month should not offer generic Product Hunt task');
    failed = true;
  } else if (!aiLaunchDeskIds.includes('launch-chatxgpt-ga-flip')) {
    console.error('FAIL: ChatXGPT GA task missing from ai-tools launch-month pool');
    failed = true;
  } else {
    const b2bLaunchState = createInitialState({
      companyName: 'SaaSCo',
      categoryId: 'b2b-saas',
      mode: 'career'
    });
    b2bLaunchState.launch.phase = 'launch_month';
    const b2bIds = getEligibleDeskTasks(b2bLaunchState).map((t) => t.id);
    if (!b2bIds.includes('launch-day-product-hunt')) {
      console.error('FAIL: b2b-saas should still get generic launch-month tasks');
      failed = true;
    } else if (b2bIds.includes('launch-chatxgpt-ga-flip')) {
      console.error('FAIL: ChatXGPT tasks should not appear for b2b-saas launch month');
      failed = true;
    } else {
      console.log(`OK: ChatXGPT launch playbook (${aiLaunchDesk.length} launch-month tasks)`);
    }
  }
}

const {
  isAiPostBatchApiReleaseMonth,
  AI_POST_BATCH_API_RELEASE_TASK_ID,
  onPostBatchApiReleaseTaskCompleted
} = await import(`file://${join(sim, 'modules/XC.js')}`);
const aiPostBatchState = createInitialState({
  companyName: 'BatchAPI',
  categoryId: 'ai-tools',
  mode: 'career'
});
aiPostBatchState.flags.xcResidencyComplete = true;
aiPostBatchState.flags.xcBatchActive = false;
aiPostBatchState.xc.demoDayTaskDone = true;
aiPostBatchState.xc.postBatchApiReleasePending = true;
if (!isAiPostBatchApiReleaseMonth(aiPostBatchState)) {
  console.error('FAIL: AI post-batch API release month gate');
  failed = true;
} else {
  dealMonthlyTasks(aiPostBatchState);
  const offers = aiPostBatchState.calendar.monthTaskOffers ?? [];
  if (!offers.some((o) => o.taskId === AI_POST_BATCH_API_RELEASE_TASK_ID)) {
    console.error('FAIL: post-batch API release task not on desk offers');
    failed = true;
  } else {
    const slots = aiPostBatchState.calendar.monthTaskSlotTarget ?? 4;
    for (const offer of offers.slice(0, slots)) {
      offer.selected = offer.taskId === AI_POST_BATCH_API_RELEASE_TASK_ID;
    }
    let picked = offers.filter((o) => o.selected).length;
    for (const offer of offers) {
      if (picked >= slots) break;
      if (!offer.selected) {
        offer.selected = true;
        picked += 1;
      }
    }
    const withoutApi = offers.map((o) => ({
      ...o,
      selected: o.selected && o.taskId !== AI_POST_BATCH_API_RELEASE_TASK_ID
    }));
    aiPostBatchState.calendar.monthTaskOffers = withoutApi;
    const blocked = confirmTaskLineup(aiPostBatchState);
    if (blocked.ok) {
      console.error('FAIL: lineup should require post-batch API release task');
      failed = true;
    } else {
      aiPostBatchState.calendar.monthTaskOffers = offers;
      for (const offer of offers) {
        offer.selected = offers.indexOf(offer) < slots;
      }
      if (!offers.some((o) => o.selected && o.taskId === AI_POST_BATCH_API_RELEASE_TASK_ID)) {
        offers[0].selected = true;
        offers.find((o) => o.taskId === AI_POST_BATCH_API_RELEASE_TASK_ID).selected = true;
      }
      confirmTaskLineup(aiPostBatchState);
      onPostBatchApiReleaseTaskCompleted(aiPostBatchState);
      if (aiPostBatchState.xc.postBatchApiReleaseDone !== true || isAiPostBatchApiReleaseMonth(aiPostBatchState)) {
        console.error('FAIL: post-batch API release completion flags');
        failed = true;
      } else {
        console.log('OK: AI post-batch ChatXGPT API release desk task');
      }
    }
  }
}

const aiCreditWhales = getTaskDefinitions().filter(
  (t) => t.whale && t.apiCreditsWhale && t.categories?.includes('ai-tools')
);
if (aiCreditWhales.length < 10) {
  console.error(`FAIL: expected 10+ AI API credit whales, got ${aiCreditWhales.length}`);
  failed = true;
} else {
  const aiWhaleFreqState = createInitialState({
    companyName: 'CreditWhaleCo',
    categoryId: 'ai-tools',
    mode: 'career'
  });
  aiWhaleFreqState.flags.xcResidencyComplete = true;
  aiWhaleFreqState.flags.seedRoundClosed = true;
  aiWhaleFreqState.flags.seriesAClosed = true;
  aiWhaleFreqState.xc.postBatchApiReleaseDone = true;
  aiWhaleFreqState.launch.phase = 'graduated';
  aiWhaleFreqState.stage = STAGES.OFFICE;
  aiWhaleFreqState.finance.mrr = 85000;
  const whaleIds = new Set(aiCreditWhales.map((t) => t.id));
  let monthsWithWhale = 0;
  for (let i = 0; i < 18; i += 1) {
    dealMonthlyTasks(aiWhaleFreqState);
    const offerIds = (aiWhaleFreqState.calendar.monthTaskOffers ?? []).map((o) => o.taskId);
    if (offerIds.some((id) => whaleIds.has(id))) monthsWithWhale += 1;
    aiWhaleFreqState.calendar.monthIndex = (aiWhaleFreqState.calendar.monthIndex ?? 1) + 1;
    if (aiWhaleFreqState.calendar.monthIndex > 12) {
      aiWhaleFreqState.calendar.monthIndex = 1;
      aiWhaleFreqState.calendar.year = (aiWhaleFreqState.calendar.year ?? 2026) + 1;
    }
  }
  if (monthsWithWhale < 12) {
    console.error(`FAIL: AI API credit whales should appear often (${monthsWithWhale}/18 months)`);
    failed = true;
  } else {
    console.log(`OK: AI post-XC API credit whales (${aiCreditWhales.length}, ${monthsWithWhale}/18 offer boards)`);
  }
}

const { totalHeadcountCap } = await import(`file://${join(sim, 'modules/Offices.js')}`);
const { HEADCOUNT_CAP_BY_WORKSPACE_TIER, WORKSPACE_TIER: CAP_WS_TIER } = await import(
  `file://${join(sim, 'modules/Workspace.js')}`
);
if (totalHeadcountCap(state) !== 0) {
  console.error('FAIL: garage headcount cap expected 0 got', totalHeadcountCap(state));
  failed = true;
} else {
  console.log('OK: Offices STAGES import / headcount cap');
}
const sandGarageCap = createInitialState({
  companyName: 'Sand Garage',
  categoryId: 'b2b-saas',
  mode: 'sandbox'
});
if (totalHeadcountCap(sandGarageCap) === 10_000) {
  console.error('FAIL: sandbox garage should not use flat 10k headcount cap');
  failed = true;
}
const sandOfficeCap = createInitialState({
  companyName: 'Sand Cap',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { startingStage: 'garage', revenueMult: 1, ipoGateArr: 50_000_000 }
});
sandOfficeCap.workspace.tier = CAP_WS_TIER.SMALL;
sandOfficeCap.workspace.smallOfficeOwned = true;
if (totalHeadcountCap(sandOfficeCap) !== HEADCOUNT_CAP_BY_WORKSPACE_TIER[CAP_WS_TIER.SMALL]) {
  console.error(
    `FAIL: sandbox office start cap should match small office (${HEADCOUNT_CAP_BY_WORKSPACE_TIER[CAP_WS_TIER.SMALL]}), got ${totalHeadcountCap(sandOfficeCap)}`
  );
  failed = true;
} else {
  sandOfficeCap.workspace.tier = CAP_WS_TIER.CAMPUS;
  sandOfficeCap.workspace.campusOwned = true;
  if (totalHeadcountCap(sandOfficeCap) !== HEADCOUNT_CAP_BY_WORKSPACE_TIER[CAP_WS_TIER.CAMPUS]) {
    console.error(
      `FAIL: sandbox campus cap expected ${HEADCOUNT_CAP_BY_WORKSPACE_TIER[CAP_WS_TIER.CAMPUS]}, got ${totalHeadcountCap(sandOfficeCap)}`
    );
    failed = true;
  } else if (!failed) {
    console.log('OK: sandbox headcount cap follows office tier (not flat 10k)');
  }
}

if (normalizeSave(null) !== null) failed = true;
if (normalizeSave({ company: {}, finance: {} }) !== null) failed = true;

const {
  getTaskRevenueMultiplierPreview,
  getCoreTaskRevenueMult,
  getRawTaskRevenueMultiplier,
  REV_MULT_CAP_CAREER,
  REV_MULT_CAP_SANDBOX,
  REV_MULT_CAP_SANDBOX_HUB,
  getTaskRevenueCap,
  sandboxRevMultTierBase
} = await import(`file://${join(sim, 'modules/Finance.js')}`);
const careerMult = getTaskRevenueMultiplierPreview(state);
if (careerMult < 0.9 || careerMult > 2.5) {
  console.error(`FAIL: career HUD revenue mult out of range: ${careerMult}`);
  failed = true;
} else {
  console.log(`OK: career effective revenue mult ${careerMult}`);
}

const lowCashSandbox = createInitialState({
  companyName: 'SandboxScrappy',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 25_000,
  sandboxTuning: { revenueMult: 2, startingStage: 'garage', ipoGateArr: 50_000_000 }
});
if (lowCashSandbox.finance.cash !== 25_000) {
  console.error(`FAIL: sandbox low cash expected 25000 got ${lowCashSandbox.finance.cash}`);
  failed = true;
} else {
  console.log('OK: sandbox can start at $25k with tuning');
}

const { parseSandboxTuning } = await import(`file://${join(sim, 'modules/SandboxTuning.js')}`);
const { migrateLegacyCalendar } = await import(`file://${join(sim, 'modules/GameCalendar.js')}`);
const sandboxCalendarForm = new FormData();
sandboxCalendarForm.set('sandboxRevenueMult', '1');
sandboxCalendarForm.set('sandboxStartStage', 'garage');
sandboxCalendarForm.set('sandboxIpoGate', '1000000000');
const { sandboxCalendarYearOptions } = await import(
  `file://${join(sim, 'modules/GameCalendar.js')}`
);
const pastYear = sandboxCalendarYearOptions()[0];
sandboxCalendarForm.set('sandboxStartYear', String(pastYear));
sandboxCalendarForm.set('sandboxStartMonth', '7');
const calendarTuning = parseSandboxTuning(sandboxCalendarForm, 'sandbox');
const ancientStart = createInitialState({
  companyName: 'TimeTravel',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: calendarTuning
});
if (ancientStart.calendar.year !== pastYear || ancientStart.calendar.monthIndex !== 7) {
  console.error(
    `FAIL: sandbox calendar start expected Jul ${pastYear} got ${ancientStart.calendar.monthIndex}/${ancientStart.calendar.year}`
  );
  failed = true;
} else {
  migrateLegacyCalendar(ancientStart);
  if (ancientStart.calendar.year !== pastYear) {
    console.error(`FAIL: migrateLegacyCalendar rewrote sandbox year ${ancientStart.calendar.year}`);
    failed = true;
  } else {
    const span = sandboxCalendarYearOptions().length;
    console.log(`OK: sandbox calendar dropdown (${span} years, oldest ${pastYear}) + save migration`);
  }
}

const sandboxState = createInitialState({
  companyName: 'SandboxMult',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { revenueMult: 2, costMult: 1, ipoGateArr: 1_000_000_000 }
});
const sandboxMult = getTaskRevenueMultiplierPreview(sandboxState);
const sandboxCore = getCoreTaskRevenueMult(sandboxState);
if (sandboxMult < 1.5) {
  console.error(`FAIL: sandbox 2x tuning should raise effective mult, got ${sandboxMult}`);
  failed = true;
} else {
  console.log(`OK: sandbox tuned revenue mult ${sandboxMult}`);
}
const overlayState = createInitialState({
  companyName: 'Overlay',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { revenueMult: 2, startingStage: 'garage', ipoGateArr: 1_000_000_000 }
});
overlayState.flags.seedRoundClosed = true;
overlayState.flags.seriesAClosed = true;
const coreCareer = getCoreTaskRevenueMult({
  ...overlayState,
  mode: 'career',
  sandboxTuning: null
});
const coreSand = getCoreTaskRevenueMult(overlayState);
const totalSand = getTaskRevenueMultiplierPreview(overlayState);
const expectedUncapped = Math.round(coreSand * 2 * 100) / 100;
const overlayCapBase = sandboxRevMultTierBase(overlayState);
const expected = Math.min(expectedUncapped, Math.round(overlayCapBase * 0.3 * 100) / 100);
if (Math.abs(totalSand - expected) > 0.05) {
  console.error(
    `FAIL: sandbox overlay expected ~${expected} (core ${coreSand} × 2 capped), got ${totalSand}`
  );
  failed = true;
} else {
  console.log(`OK: sandbox overlay stacks (${coreSand} × 2 = ${totalSand})`);
}
if (Math.abs(coreSand - coreCareer) > 0.05) {
  console.error(`FAIL: core mult should match career vs sandbox core ${coreSand} vs ${coreCareer}`);
  failed = true;
}

const { completeXcAcceptance, isInResidency, nextXcBatchStart } = await import(
  `file://${join(sim, 'modules/XC.js')}`
);
const { startMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
const xcState = createInitialState({
  companyName: 'XCSchedule',
  categoryId: 'b2b-saas',
  mode: 'career'
});
xcState.calendar = { year: 2026, monthIndex: 4 };
xcState.meta.calendarStartYear = 2026;
xcState.meta.calendarStartMonth = 4;
xcState.flags.xcUnlocked = true;
const accept = completeXcAcceptance(xcState);
const expectedStart = nextXcBatchStart(2026, 4);
if (!accept.ok || !xcState.xc?.batchStartsTurn) {
  console.error('FAIL: XC acceptance should schedule batch start turn');
  failed = true;
} else if (xcState.xc.scheduledBatchCode !== 'XC S26') {
  console.error(
    `FAIL: April acceptance should schedule XC S26, got ${xcState.xc.scheduledBatchCode}`
  );
  failed = true;
} else if (isInResidency(xcState)) {
  console.error('FAIL: XC batch should not start same month as acceptance');
  failed = true;
} else {
  const { advanceCalendarMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
  while (
    xcState.calendar.year < expectedStart.year ||
    (xcState.calendar.year === expectedStart.year &&
      xcState.calendar.monthIndex < expectedStart.monthIndex)
  ) {
    advanceCalendarMonth(xcState);
    startMonth(xcState);
  }
  if (!isInResidency(xcState) || xcState.xc?.residencyMonthsRemaining !== 3) {
    console.error('FAIL: XC batch should begin at seasonal start with 3 months remaining');
    failed = true;
  } else if (xcState.xc.batchLabel !== 'XC S26') {
    console.error(`FAIL: residency batch label should be XC S26, got ${xcState.xc.batchLabel}`);
    failed = true;
  } else {
    console.log('OK: XC seasonal batch (April accept → Summer S26 in July)');
  }
}

const fallState = createInitialState({
  companyName: 'XCFall',
  categoryId: 'b2b-saas',
  mode: 'career'
});
fallState.calendar = { year: 2026, monthIndex: 9 };
fallState.meta.calendarStartYear = 2026;
fallState.meta.calendarStartMonth = 9;
fallState.flags.xcUnlocked = true;
completeXcAcceptance(fallState);
if (fallState.xc.scheduledBatchCode !== 'XC F26') {
  console.error(`FAIL: September acceptance should schedule XC F26, got ${fallState.xc.scheduledBatchCode}`);
  failed = true;
} else {
  console.log('OK: XC seasonal batch (September accept → Fall F26 in October)');
}

const {
  beginResidency,
  isXcDemoDayMonth,
  applyDemoDayPitchChoice,
  getSeedRoundTerms,
  onDemoDayTaskCompleted,
  XC_DEMO_DAY_TASK_ID
} = await import(`file://${join(sim, 'modules/XC.js')}`);
const demoState = createInitialState({
  companyName: 'DemoDayCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
demoState.flags.xcAccepted = true;
demoState.flags.xcBatchActive = true;
demoState.flags.xcResidencyComplete = false;
beginResidency(demoState);
demoState.xc.residencyMonthsRemaining = 1;
if (!isXcDemoDayMonth(demoState)) {
  console.error('FAIL: residencyMonthsRemaining 1 should be Demo Day month');
  failed = true;
} else {
  dealMonthlyTasks(demoState);
  const offers = demoState.calendar.monthTaskOffers ?? [];
  if (!offers.some((o) => o.taskId === XC_DEMO_DAY_TASK_ID)) {
    console.error('FAIL: Demo Day task should appear on final XC month board');
    failed = true;
  } else {
    const slots = demoState.calendar.monthTaskSlotTarget ?? 6;
    let picked = 0;
    for (const o of offers) {
      if (o.taskId === XC_DEMO_DAY_TASK_ID) {
        o.selected = true;
        picked += 1;
      }
    }
    for (const o of offers) {
      if (picked >= slots) break;
      if (!o.selected) {
        o.selected = true;
        picked += 1;
      }
    }
    confirmTaskLineup(demoState);
    onDemoDayTaskCompleted(demoState);
    applyDemoDayPitchChoice(demoState, 0);
    const terms = getSeedRoundTerms(demoState);
    if (terms.raised !== 3_200_000 || terms.postMoney !== 19_000_000) {
      console.error(`FAIL: focused Demo Day pitch seed terms ${JSON.stringify(terms)}`);
      failed = true;
    } else {
      console.log('OK: Demo Day task + focused pitch sets seed terms');
    }
  }
}

const { progressionRevenueMult } = await import(
  `file://${join(sim, 'modules/ProgressionEconomy.js')}`
);
const scaled = createInitialState({
  companyName: 'Scaled',
  categoryId: 'b2b-saas',
  mode: 'career'
});
scaled.flags.seedRoundClosed = true;
scaled.flags.seriesAClosed = true;
scaled.flags.seriesBClosed = true;
scaled.finance.mrr = 2_000_000;
scaled.finance.arr = 24_000_000;
const progMult = progressionRevenueMult(scaled);
if (progMult < 8 || progMult > 120) {
  console.error(`FAIL: post-Series-B progression mult out of range: ${progMult}`);
  failed = true;
} else {
  console.log(`OK: progression revenue mult after A/B ${progMult}`);
}

const { WORKSPACE_TIER } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
const maxed = createInitialState({
  companyName: 'CapTest',
  categoryId: 'b2b-saas',
  mode: 'career'
});
maxed.flags.xcResidencyComplete = true;
maxed.flags.seedRoundClosed = true;
maxed.flags.seriesAClosed = true;
maxed.flags.seriesBClosed = true;
maxed.flags.seriesCClosed = true;
maxed.flags.seriesDClosed = true;
maxed.flags.seriesEClosed = true;
maxed.flags.seriesFClosed = true;
maxed.flags.ipoFiled = true;
maxed.workspace.tier = WORKSPACE_TIER.HUB;
maxed.offices.hubId = 'bay';
maxed.offices.modifiers = { revenueMult: 1.12, costMult: 1.15, salaryMult: 1.12 };
maxed.finance.arr = 500_000_000;
maxed.product.level = 40;
maxed.product.buzz = 40;
maxed.staff.headcountByDept = { engineering: 50, sales: 50, marketing: 50, product: 50 };
const rawCareer = getRawTaskRevenueMultiplier(maxed);
const cappedCareer = getTaskRevenueMultiplierPreview(maxed);
if (cappedCareer > REV_MULT_CAP_CAREER + 0.01) {
  console.error(`FAIL: career cap exceeded: ${cappedCareer}`);
  failed = true;
} else if (rawCareer <= REV_MULT_CAP_CAREER) {
  console.log(`OK: career cap not triggered (raw ${rawCareer.toFixed(2)}×)`);
} else {
  console.log(`OK: career rev mult capped ${rawCareer.toFixed(1)}× → ${cappedCareer}×`);
}

const maxedSand = createInitialState({
  companyName: 'CapTestSand',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { revenueMult: 20, ipoGateArr: 1_000_000_000, costMult: 1, startingStage: 'garage' }
});
maxedSand.flags = { ...maxed.flags };
maxedSand.workspace = { ...maxed.workspace };
maxedSand.offices = JSON.parse(JSON.stringify(maxed.offices));
maxedSand.finance = { ...maxed.finance };
maxedSand.product = { ...maxed.product };
maxedSand.staff = JSON.parse(JSON.stringify(maxed.staff));
maxedSand.staff.headcountByDept = {
  engineering: 2500,
  product: 1500,
  sales: 2500,
  marketing: 2000,
  finance: 800,
  support: 700
};
maxedSand.staff.draftHeadcountByDept = { ...maxedSand.staff.headcountByDept };
const sandCap = getTaskRevenueCap(maxedSand);
const cappedSand = getTaskRevenueMultiplierPreview(maxedSand);
if (cappedSand > sandCap + 0.01) {
  console.error(`FAIL: sandbox cap exceeded: ${cappedSand} > ${sandCap}`);
  failed = true;
} else if (sandCap < REV_MULT_CAP_SANDBOX_HUB - 1) {
  console.error(`FAIL: expected hub sandbox workforce cap ~${REV_MULT_CAP_SANDBOX_HUB}× got ${sandCap}×`);
  failed = true;
} else {
  console.log(`OK: sandbox rev mult cap ${cappedSand}× (hub workforce ceiling ${sandCap}×)`);
}
const garageCapState = createInitialState({
  companyName: 'GarageCap',
  categoryId: 'b2b-saas',
  mode: 'sandbox'
});
const garageCap = getTaskRevenueCap(garageCapState);
const garageTierBase = sandboxRevMultTierBase(garageCapState);
if (garageTierBase !== REV_MULT_CAP_SANDBOX || garageCap !== Math.round(REV_MULT_CAP_SANDBOX * 0.3 * 100) / 100) {
  console.error(`FAIL: garage rev× cap expected tier ${REV_MULT_CAP_SANDBOX}× / effective ${REV_MULT_CAP_SANDBOX * 0.3}× got ${garageTierBase}× / ${garageCap}×`);
  failed = true;
} else if (!failed) {
  console.log(`OK: garage rev× cap unchanged (${garageCap}× at empty HC, tier base ${garageTierBase}×)`);
}

const { completeBoardTask, dealBoardTasks, getBoardTaskDefs, ensureBoardRoster } = await import(
  `file://${join(sim, 'modules/Board.js')}`
);
if (getBoardTaskDefs().length < 18) {
  console.error(`FAIL: board task catalog too small (${getBoardTaskDefs().length})`);
  failed = true;
}
const boardState = createInitialState({
  companyName: 'BoardSmoke',
  categoryId: 'b2b-saas',
  mode: 'career'
});
boardState.flags.seriesAClosed = true;
boardState.finance.cash = 500_000;
dealBoardTasks(boardState);
ensureBoardRoster(boardState);
if ((boardState.board?.members?.length ?? 0) < 2) {
  console.error('FAIL: board roster should include lead + founder after Series A');
  failed = true;
}
const inst = boardState.board?.monthTasks?.[0];
if (!inst) {
  console.error('FAIL: board tasks not dealt');
  failed = true;
} else {
  const boardResult = completeBoardTask(boardState, inst.instanceId);
  if (
    !boardResult.ok ||
    boardResult.sentimentAfter == null ||
    boardResult.sentimentDelta == null
  ) {
    console.error('FAIL: board task should return approval delta and new score');
    failed = true;
  } else {
    console.log('OK: board task outcome fields');
  }
}

const { applyOfflineMonthlyNews, archiveCurrentNews } = await import(
  `file://${join(sim, 'modules/News.js')}`
);
const newsA = createInitialState({
  companyName: 'NewsCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
newsA.meta.runSeed = 4242;
applyOfflineMonthlyNews(newsA);
const headA = newsA.news.currentMonthArticles?.[0]?.headline ?? '';
archiveCurrentNews(newsA);
const { advanceCalendarMonth: advanceNewsMonth } = await import(
  `file://${join(sim, 'modules/Calendar.js')}`
);
let headB = headA;
for (let i = 0; i < 8 && headB === headA; i += 1) {
  advanceNewsMonth(newsA);
  applyOfflineMonthlyNews(newsA);
  headB = newsA.news.currentMonthArticles?.[0]?.headline ?? '';
  if (headB !== headA) break;
  archiveCurrentNews(newsA);
}
if (!headA || headA === headB) {
  console.error(`FAIL: monthly news should rotate (${headA} vs ${headB})`);
  failed = true;
} else if ((newsA.news.unreadCount ?? 0) < 1) {
  console.error('FAIL: new month news should mark unread');
  failed = true;
} else {
  console.log('OK: monthly news rotates and marks unread');
}

const { applyScenarioEffects, scenarioRevenueMult, isFundraisingBlockedByScenario } =
  await import(`file://${join(sim, 'modules/ScenarioEffects.js')}`);
const { applyDecisionChoice, hasActiveDecision, createInitialDecisionState } = await import(
  `file://${join(sim, 'modules/DecisionEvents.js')}`
);
const { canEndMonth } = await import(`file://${join(sim, 'modules/Tasks.js')}`);

const scenarioState = createInitialState({
  companyName: 'ScenarioCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
scenarioState.decision = createInitialDecisionState();
scenarioState.decision.active = {
  id: 'test',
  title: 'Test fork',
  choices: [
    {
      label: 'Take premium path',
      effects: {
        cash: -1000,
        sentiment: 3,
        modifier: { id: 'smoke-premium', label: 'Premium path', revenueMult: 1.1, months: 2 }
      }
    }
  ]
};
if (canEndMonth(scenarioState)) {
  console.error('FAIL: active decision should block month close');
  failed = true;
}
const decResult = applyDecisionChoice(scenarioState, 0);
if (!decResult.ok || hasActiveDecision(scenarioState) || scenarioRevenueMult(scenarioState) < 1.09) {
  console.error('FAIL: decision choice should apply modifier and clear active');
  failed = true;
} else {
  console.log('OK: desk decision applies fallout and unblocks month');
}

applyScenarioEffects(scenarioState, {
  modifier: {
    id: 'smoke-block',
    label: 'PR freeze',
    fundraisingBlocked: true,
    months: 1
  }
});
if (!isFundraisingBlockedByScenario(scenarioState)) {
  console.error('FAIL: scenario modifier should block fundraising');
  failed = true;
} else {
  console.log('OK: scenario fundraising block');
}

const preSeedState = createInitialState({
  companyName: 'PreSeedPool',
  categoryId: 'b2b-saas',
  mode: 'career'
});
preSeedState.flags.xcResidencyComplete = true;
preSeedState.flags.seedRoundClosed = false;
for (const categoryId of allCategories) {
  preSeedState.company.categoryId = categoryId;
  const poolSize = getTaskPoolSize(preSeedState);
  const need = getMonthlyTaskSlots(STAGES.POST_XC) + 2;
  if (poolSize < need) {
    console.error(
      `FAIL: post-XC pre-seed pool for ${categoryId} is ${poolSize} (need ≥ ${need} offers)`
    );
    failed = true;
  }
}
if (!failed) {
  console.log('OK: post-XC pre-seed desk pool covers monthly offers (all categories)');
}

const {
  preloadAcquisitionCatalog,
  getAcquisitionCatalog,
  purchaseTarget,
  totalSubsidiaryMrr,
  applySubsidiaryMrrPayout,
  computeReinvestQuote,
  reinvestInSubsidiary,
  subsidiarySalePrice,
  subsidiaryValuationMark,
  tickAcquisitionsAtMonthStart
} = await import(`file://${join(sim, 'modules/Acquisitions.js')}`);
const { portfolioPulseSummary } = await import(`file://${join(sim, 'modules/Companies.js')}`);
await preloadAcquisitionCatalog();
const acqCatalog = getAcquisitionCatalog();
const acqCatalogSize = acqCatalog.length;
if (acqCatalogSize !== 165) {
  console.error(`FAIL: expected 165 acquisition targets, got ${acqCatalogSize}`);
  failed = true;
} else {
  console.log(`OK: acquisition catalog has ${acqCatalogSize} handcrafted companies`);
}
const acqNames = new Set(acqCatalog.map((c) => c.name));
if (acqNames.size !== acqCatalogSize) {
  console.error('FAIL: acquisition catalog has duplicate company names');
  failed = true;
} else {
  console.log('OK: acquisition names are unique');
}
const maxEntAcqMrr = Math.max(
  ...acqCatalog.filter((c) => c.segment === 'enterprise').map((c) => c.baseMrr)
);
if (maxEntAcqMrr < 5_000_000) {
  console.error(`FAIL: enterprise acquisition MRR ceiling too low (${maxEntAcqMrr})`);
  failed = true;
} else {
  console.log(`OK: enterprise acquisition MRR scales to ${formatMoney(maxEntAcqMrr)}/mo`);
}
const acqState = createInitialState({
  companyName: 'HoldCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 100_000_000
});
acqState.flags.xcResidencyComplete = true;
const small = getAcquisitionCatalog().find((c) => c.segment === 'small' && !c.isRival);
const buy = purchaseTarget(acqState, small.id);
if (!buy.ok) {
  console.error(`FAIL: could not buy small co: ${buy.reason}`);
  failed = true;
} else {
  const before = acqState.finance.cash;
  const payout = applySubsidiaryMrrPayout(acqState);
  if (payout.total < 1 || acqState.finance.cash <= before) {
    console.error('FAIL: subsidiary MRR payout should add cash');
    failed = true;
  } else {
    console.log(`OK: acquisition + portfolio MRR (${formatMoney(totalSubsidiaryMrr(acqState))}/mo)`);
  }
  const holding = acqState.acquisitions.owned[0];
  const implied = subsidiarySalePrice(acqState, holding, small);
  const quote5 = computeReinvestQuote(acqState, small.id, 5, 'product');
  if (!quote5.ok) {
    console.error(`FAIL: reinvest quote: ${quote5.reason}`);
    failed = true;
  } else {
    const expected = Math.round(implied * 0.05);
    const tol = Math.max(5000, Math.round(implied * 0.002));
    if (Math.abs(quote5.amount - expected) > tol && quote5.amount !== Math.max(expected, tol)) {
      console.error(
        `FAIL: reinvest 5% should scale with implied value (~${formatMoney(expected)}), got ${formatMoney(quote5.amount)}`
      );
      failed = true;
    } else {
      const rein = reinvestInSubsidiary(acqState, small.id, { pctOfValue: 2, program: 'gtm' });
      if (!rein.ok || rein.pctOfValue !== 2) {
        console.error(`FAIL: pct-based reinvest: ${rein.reason ?? 'bad result'}`);
        failed = true;
      } else {
        console.log(`OK: portfolio reinvest scales with value (${formatMoney(rein.amount)} for 2%)`);
      }
    }
  }
  const markBefore = subsidiaryValuationMark(holding);
  const exitBefore = subsidiarySalePrice(acqState, holding, small);
  acqState.calendar.monthIndex += 1;
  if (acqState.calendar.monthIndex > 12) {
    acqState.calendar.monthIndex = 1;
    acqState.calendar.year += 1;
  }
  tickAcquisitionsAtMonthStart(acqState);
  const markAfter = subsidiaryValuationMark(holding);
  const exitAfter = subsidiarySalePrice(acqState, holding, small);
  if (markAfter === markBefore && exitAfter === exitBefore) {
    console.error('FAIL: portfolio valuation mark should drift monthly');
    failed = true;
  } else if (markAfter < 0.65 || markAfter > 1.85) {
    console.error(`FAIL: valuation mark out of bounds (${markAfter})`);
    failed = true;
  } else {
    console.log(`OK: portfolio mark drift (${markBefore.toFixed(3)}× → ${markAfter.toFixed(3)}×)`);
  }
  const pulse = portfolioPulseSummary(acqState);
  if (pulse.portfolioMrr < 1 || pulse.exitVal <= 0 || pulse.invested <= 0) {
    console.error('FAIL: portfolio pulse summary');
    failed = true;
  } else {
    console.log(`OK: companies pulse (MRR ${formatMoney(pulse.portfolioMrr)}/mo, unrealized ${formatMoney(pulse.unrealized)})`);
  }
}

const { STAGES: ST } = await import(`file://${join(sim, 'modules/constants.js')}`);
const { PUBLIC_FLOAT_ROW_ID, getFounderRow, totalOutstandingShares } = await import(
  `file://${join(sim, 'modules/CapTable.js')}`
);
const {
  fileIpo,
  tickPublicMarket,
  setPublicGuidanceTone,
  executeStockBuyback,
  executeStockSplit,
  whisperRevenueTarget,
  sellFounderSharesPartial,
  ytdSmoothedMonthlyRevenue,
  computeFundamentalSharePrice,
  marketCap,
  treasuryNetCash,
  estimateEquityValue
} = await import(`file://${join(sim, 'modules/IPO.js')}`);
const { calendarTurn } = await import(`file://${join(sim, 'modules/XC.js')}`);
const pub = createInitialState({ companyName: 'Ticker Co', categoryId: 'b2b-saas', mode: 'sandbox' });
pub.stage = ST.PUBLIC;
pub.flags.seedRoundClosed = true;
pub.flags.ipoUnlocked = true;
pub.finance.mrr = 5_000_000;
pub.finance.monthlyBurn = 400_000;
const cashBeforeIpo = 50_000_000;
pub.finance.cash = cashBeforeIpo;
const ipo = fileIpo(pub);
const floatRow = pub.capTable?.find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
const listPrice = pub.publicMarket?.sharePrice ?? 0;
if (!ipo.ok) {
  console.error(`FAIL: fileIpo smoke: ${ipo.reason}`);
  failed = true;
} else if (!floatRow?.shares || floatRow.shares < 1000) {
  console.error('FAIL: IPO should add public float shares on cap table');
  failed = true;
} else if (listPrice > 450 || listPrice < 5) {
  console.error(`FAIL: IPO share price out of band (${listPrice})`);
  failed = true;
} else if ((pub.finance.cash ?? 0) <= cashBeforeIpo) {
  console.error(`FAIL: IPO should add primary proceeds to company cash (before ${cashBeforeIpo}, after ${pub.finance.cash})`);
  failed = true;
} else if ((ipo.primaryProceeds ?? 0) <= 0) {
  console.error('FAIL: fileIpo should report primary proceeds');
  failed = true;
} else {
  const founder = getFounderRow(pub);
  const floatPct = floatRow?.pct ?? 0;
  if ((founder?.pct ?? 0) < 18) {
    console.error(`FAIL: founder pct at IPO too low (${founder?.pct}%)`);
    failed = true;
  } else if (floatPct < 20 || floatPct > 34) {
    console.error(`FAIL: IPO public float should be realistic (~20–32% FD, got ${floatPct}%)`);
    failed = true;
  } else if ((founder?.pct ?? 0) > 82) {
    console.error(`FAIL: IPO float too small — founder still ${founder?.pct}% (expected meaningful dilution)`);
    failed = true;
  } else {
    console.log(
      `OK: IPO primary + float (${formatMoney(ipo.primaryProceeds)} primary, float ${floatPct}%, founder ${founder?.pct}%, ${formatMoney(listPrice)}/share)`
    );
    pub.finance.cash = 1_000_000_000_000;
    pub.finance.mrr = 250_000;
    const fundPx = computeFundamentalSharePrice(pub);
    const shares = totalOutstandingShares(pub);
    const modelCap = Math.round(fundPx * shares);
    const net = treasuryNetCash(pub);
    if (modelCap < net * 0.9) {
      console.error(`FAIL: model cap ${modelCap} should reflect net cash ${net}`);
      failed = true;
    } else {
      console.log(`OK: valuation model includes balance sheet cash (model cap ${formatMoney(modelCap)})`);
    }
  }
  const { hasInstitutionalBoard, meetsHubInvestorGate } = await import(
    `file://${join(sim, 'modules/Sentiment.js')}`
  );
  const { canPurchaseTier, WORKSPACE_TIER } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
  if (!pub.flags.seriesAClosed && !hasInstitutionalBoard(pub)) {
    console.error('FAIL: IPO without Series A should activate institutional board');
    failed = true;
  } else if (!meetsHubInvestorGate(pub)) {
    console.error('FAIL: IPO should satisfy hub investor gate');
    failed = true;
  } else {
    console.log('OK: public listing unlocks board + hub investor gate (no Series A)');
  }
  const legacyPublic = createInitialState({
    companyName: 'Legacy Pub',
    categoryId: 'b2b-saas',
    mode: 'sandbox'
  });
  legacyPublic.flags.seedRoundClosed = true;
  legacyPublic.flags.ipoFiled = true;
  legacyPublic.flags.seriesAClosed = false;
  legacyPublic.stage = ST.PUBLIC;
  legacyPublic.finance.mrr = 50_000_000;
  legacyPublic.flags.xcResidencyComplete = true;
  legacyPublic.workspace.campusOwned = true;
  legacyPublic.workspace.tier = 'campus';
  legacyPublic.board = { members: [] };
  legacyPublic.sentiment = { score: 68, lastDelta: 0, lastReason: null };
  const migrated = normalizeSave(JSON.parse(JSON.stringify(legacyPublic)));
  if (!migrated || !hasInstitutionalBoard(migrated)) {
    console.error('FAIL: normalizeSave should repair public-only board access');
    failed = true;
  } else if (!migrated.board?.members?.some((m) => m.id === 'lead-public-chair')) {
    console.error('FAIL: migrated public save should seat IPO board chair');
    failed = true;
  } else {
    const hubGate = canPurchaseTier(migrated, WORKSPACE_TIER.HUB);
    if (!hubGate.ok && hubGate.reason?.includes('Series A or B')) {
      console.error(`FAIL: hub gate should accept IPO listing: ${hubGate.reason}`);
      failed = true;
    } else if (!hubGate.ok && !hubGate.reason?.includes('ARR')) {
      console.error(`FAIL: unexpected hub gate after IPO migrate: ${hubGate.reason}`);
      failed = true;
    } else {
      console.log('OK: save migrate seats public board + hub gate (IPO path)');
    }
  }
  const tone = setPublicGuidanceTone(pub, 'aggressive');
  if (!tone.ok || whisperRevenueTarget(pub) <= 0) {
    console.error('FAIL: public guidance / whisper target');
    failed = true;
  }
  const tick = tickPublicMarket(pub);
  if (!pub.publicMarket.sharePrice || tick.deltaPct == null) {
    console.error('FAIL: tickPublicMarket');
    failed = true;
  }
  pub.finance.fiscal = {
    current: { year: pub.calendar.year, revenue: 9_500_000, expenses: 0 },
    prior: { year: pub.calendar.year - 1, revenue: 0, expenses: 0, profit: 0 },
    taxPaidYear: null,
    charityDonatedLifetime: 0
  };
  pub.calendar.monthIndex = 10;
  pub.calendar.monthRevenue = 500_000;
  pub.finance.mrr = 500_000;
  pub.finance.monthlyRevenue = 500_000;
  pub.publicMarket.priorYtdRunRateMrr = 850_000;
  const smoothMrr = ytdSmoothedMonthlyRevenue(pub);
  const spotMrr = pub.finance.mrr;
  const priorRun = pub.publicMarket.priorYtdRunRateMrr;
  const blendMrr = spotMrr * 0.32 + smoothMrr * 0.68;
  const clampGrowth = (g) => Math.max(-0.12, Math.min(0.22, g));
  const spotGrowth = clampGrowth((spotMrr - priorRun) / priorRun);
  const blendGrowth = clampGrowth((blendMrr - priorRun) / priorRun);
  if (smoothMrr < 940_000 || smoothMrr > 960_000) {
    console.error(`FAIL: YTD smoothed MRR expected ~950k, got ${smoothMrr}`);
    failed = true;
  } else if (blendGrowth <= spotGrowth) {
    console.error(
      `FAIL: blended YTD pace should beat spot-only growth (${blendGrowth} vs ${spotGrowth})`
    );
    failed = true;
  } else if (!failed) {
    console.log('OK: stock model blends spot MRR with YTD revenue pace');
  }
  const bb = executeStockBuyback(pub, 250_000);
  if (!bb.ok) {
    console.error(`FAIL: buyback smoke: ${bb.reason}`);
    failed = true;
  }
  pub.publicMarket.sharePrice = 400;
  pub.publicMarket.lastSplitTurn = calendarTurn(pub);
  const sandboxSplitA = executeStockSplit(pub);
  const sandboxSplitB = executeStockSplit(pub);
  if (!sandboxSplitA.ok) {
    console.error(`FAIL: sandbox stock split: ${sandboxSplitA.reason}`);
    failed = true;
  } else if (!sandboxSplitB.ok) {
    console.error(`FAIL: sandbox should allow back-to-back splits: ${sandboxSplitB.reason}`);
    failed = true;
  } else {
    const careerSplitState = createInitialState({
      companyName: 'Split Gate Co',
      categoryId: 'b2b-saas',
      mode: 'career'
    });
    careerSplitState.flags.seedRoundClosed = true;
    careerSplitState.flags.ipoFiled = true;
    careerSplitState.stage = ST.PUBLIC;
    careerSplitState.publicMarket = {
      ...pub.publicMarket,
      sharePrice: 400,
      ipoPrice: 400,
      lastSplitTurn: null
    };
    careerSplitState.capTable = JSON.parse(JSON.stringify(pub.capTable));
    const careerSplitOnce = executeStockSplit(careerSplitState);
    const careerSplitTwice = executeStockSplit(careerSplitState);
    if (!careerSplitOnce.ok) {
      console.error(`FAIL: career stock split: ${careerSplitOnce.reason}`);
      failed = true;
    } else if (careerSplitTwice.ok) {
      console.error('FAIL: career should enforce 6-month split cooldown');
      failed = true;
    } else if (!failed) {
      console.log('OK: sandbox unlimited stock splits; career keeps 6-month gate');
    }
  }
  const { tickPublicMarketAtMonthStart } = await import(`file://${join(sim, 'modules/IPO.js')}`);
  tickPublicMarketAtMonthStart(pub);
  if (!pub.publicMarket.marketTape?.length) {
    console.error('FAIL: market tape after buyback');
    failed = true;
  } else if (!failed) {
    console.log('OK: late-game public market (IPO, guidance, tick, buyback, tape)');
  }
  const { runPublicMarketEvent } = await import(`file://${join(sim, 'modules/PublicMarkets.js')}`);
  pub.flags.seriesAClosed = true;
  const credBefore = pub.publicMarket.streetCredibility ?? 0;
  const irEv = runPublicMarketEvent(pub, 'public-analyst-briefing');
  if (!irEv.ok) {
    console.error(`FAIL: public IR event: ${irEv.reason}`);
    failed = true;
  } else if (!pub.publicMarket.irEventLog?.length) {
    console.error('FAIL: IR event log should record activity');
    failed = true;
  } else if ((pub.publicMarket.streetCredibility ?? 0) <= credBefore) {
    console.error('FAIL: IR event should raise street credibility');
    failed = true;
  } else if (!failed) {
    console.log('OK: public IR event (analyst briefing, credibility, activity log)');
  }
  pub.publicMarket.lockupMonthsRemaining = 0;
  const founderBefore = getFounderRow(pub)?.shares ?? 0;
  const partial = sellFounderSharesPartial(pub, 10);
  const founderAfter = getFounderRow(pub)?.shares ?? 0;
  if (!partial.ok || partial.proceeds <= 0) {
    console.error(`FAIL: partial founder stock sale: ${partial.reason ?? 'bad result'}`);
    failed = true;
  } else if (founderAfter >= founderBefore || (pub.ceo.careerStockSales ?? 0) < 1) {
    console.error('FAIL: partial sale should reduce founder shares and credit CEO bank');
    failed = true;
  } else if (!failed) {
    console.log(
      `OK: partial founder stock sale (${formatMoney(partial.proceeds)}, ${founderBefore - founderAfter} shares)`
    );
  }
}

const { closeAngelSafe, canCloseAngelSafe } = await import(`file://${join(sim, 'modules/AngelSafe.js')}`);
const { joinAccelerator } = await import(`file://${join(sim, 'modules/Accelerators.js')}`);
const { computeCreditLimit, requestLoanDraw, loanOverheadMonthly, prepayLoan, computeCreditScore, bankApprovalBreakdown } =
  await import(`file://${join(sim, 'modules/BankLoan.js')}`);
const { convertOutstandingSafesAtSeed } = await import(`file://${join(sim, 'modules/FinanceCapital.js')}`);
const { drawRevenueAdvance, rbfOutstanding } = await import(`file://${join(sim, 'modules/RevenueAdvance.js')}`);
const angelState = createInitialState({ companyName: 'Angel Co', categoryId: 'b2b-saas', mode: 'sandbox' });
angelState.product.level = 2;
const ag = closeAngelSafe(angelState);
if (!ag.ok) {
  console.error(`FAIL: angel SAFE: ${ag.reason}`);
  failed = true;
} else if (angelState.finance.cash < 50_000) {
  console.error('FAIL: angel SAFE cash');
  failed = true;
} else if (closeAngelSafe(angelState).ok) {
  console.error('FAIL: second angel SAFE should be blocked');
  failed = true;
}
const xcAccel = createInitialState({ companyName: 'Accel Co', categoryId: 'b2b-saas', mode: 'sandbox' });
xcAccel.flags.xcAccepted = true;
xcAccel.finance.arr = 80_000;
xcAccel.finance.mrr = Math.round(80_000 / 12);
const ja = joinAccelerator(xcAccel, 'angel-rail');
if (!ja.ok) {
  console.error(`FAIL: accelerator after XC: ${ja.reason}`);
  failed = true;
} else if (joinAccelerator(xcAccel, 'techlot').ok) {
  console.error('FAIL: third accelerator should be blocked');
  failed = true;
}
const postASeries = createInitialState({ companyName: 'Post A', categoryId: 'b2b-saas', mode: 'sandbox' });
postASeries.flags.seriesAClosed = true;
postASeries.finance.arr = 5_000_000;
postASeries.finance.mrr = Math.round(5_000_000 / 12);
if (joinAccelerator(postASeries, 'velocity-lab').ok) {
  console.error('FAIL: accelerator after Series A should be blocked');
  failed = true;
}
const loanState = createInitialState({ companyName: 'Loan Co', categoryId: 'b2b-saas', mode: 'sandbox' });
loanState.finance.lifetimeRevenue = 100_000;
loanState.finance.arr = 60_000;
loanState.finance.mrr = 5_000;
loanState.meta.runSeed = 42;
let approved = false;
const { advanceCalendarMonth: advanceLoanMonth } = await import(
  `file://${join(sim, 'modules/Calendar.js')}`
);
for (let i = 0; i < 12; i += 1) {
  if (i > 0) advanceLoanMonth(loanState);
  const r = requestLoanDraw(loanState, 25_000);
  if (r.ok) {
    approved = true;
    break;
  }
}
if (!approved) {
  console.error('FAIL: loan draw never approved in 12 tries');
  failed = true;
} else if (loanOverheadMonthly(loanState) <= 0) {
  console.error('FAIL: loan overhead');
  failed = true;
}
if (!failed && computeCreditScore(loanState) < 480) {
  console.error('FAIL: credit score range');
  failed = true;
}
if (!failed && !bankApprovalBreakdown(loanState, 25_000).factors?.length) {
  console.error('FAIL: approval breakdown');
  failed = true;
}
if (!failed) {
  loanState.finance.cash = 200_000;
  const prep = prepayLoan(loanState, 10_000);
  if (!prep.ok) {
    console.error(`FAIL: loan prepay: ${prep.reason}`);
    failed = true;
  }
}
const { loanDrawPresets, loanHeadroom } = await import(`file://${join(sim, 'modules/BankLoan.js')}`);
const scaleLoanState = createInitialState({ companyName: 'BigLine', categoryId: 'b2b-saas', mode: 'sandbox' });
scaleLoanState.flags.seedRoundClosed = true;
scaleLoanState.flags.seriesAClosed = true;
scaleLoanState.finance.arr = 80_000_000;
scaleLoanState.finance.mrr = Math.round(80_000_000 / 12);
scaleLoanState.finance.lifetimeRevenue = 400_000_000;
scaleLoanState.finance.cash = 10_000_000_000_000;
scaleLoanState.finance.valuation = 500_000_000;
const bigLimit = computeCreditLimit(scaleLoanState);
const presets = loanDrawPresets(scaleLoanState);
const maxPreset = presets.find((p) => p.fraction === 1);
if (bigLimit <= 750_000) {
  console.error(`FAIL: scaled credit limit should exceed $750k, got ${bigLimit}`);
  failed = true;
} else if (!maxPreset || maxPreset.amount !== loanHeadroom(scaleLoanState)) {
  console.error('FAIL: loan Max preset should equal headroom');
  failed = true;
} else {
  console.log(`OK: scaled credit limit ${formatMoney(bigLimit)} · max draw ${formatMoney(maxPreset.amount)}`);
}
if (!failed && ag.ok) {
  const lines = convertOutstandingSafesAtSeed(angelState, 15_000_000);
  const converted = angelState.finance.instruments.every((i) => i.type !== 'safe' || i.converted);
  if (!converted || !lines.length) {
    console.error('FAIL: SAFE conversion at seed');
    failed = true;
  }
}
const rbfState = createInitialState({ companyName: 'RBF Co', categoryId: 'b2b-saas', mode: 'sandbox' });
rbfState.finance.mrr = 8_000;
const rbf = drawRevenueAdvance(rbfState);
if (!rbf.ok) {
  console.error(`FAIL: revenue advance: ${rbf.reason}`);
  failed = true;
} else if (rbfOutstanding(rbfState) <= 0) {
  console.error('FAIL: revenue advance owed');
  failed = true;
}
const {
  setCeoSalaryAnnual,
  takeOwnerDraw,
  ownerDrawsUnlocked,
  canTakeOwnerDraw,
  ceoSalaryMonthly,
  recordCeoSalaryForMonth,
  wealthMix,
  buildCompLedger,
  suggestedCeoSalaryBand,
  ceoSalaryBoardNote
} = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);
const {
  salaryForDept,
  tickMarketSalaryDemand,
  MARKET_SALARY_ANNUAL_BUMP_PCT
} = await import(`file://${join(sim, 'modules/Staff.js')}`);
const { purchaseWorkspaceTier, WORKSPACE_TIER: PAY_WS_TIER } = await import(
  `file://${join(sim, 'modules/Workspace.js')}`
);
const { projectMonthlyBurn, estimateEraRevenuePotential, allTierRevenuePotentialRows } =
  await import(`file://${join(sim, 'modules/Finance.js')}`);
const {
  computeCompanyOverheadBreakdown,
  scheduledCompanyOverhead,
  COMPANY_VARIABLE_OPEX_CATEGORIES
} = await import(`file://${join(sim, 'modules/CompanyOverhead.js')}`);
const { TIER_REVENUE_PROFILE, eraBaseRevenueScaleForTask } = await import(
  `file://${join(sim, 'modules/ProgressionEconomy.js')}`
);
const ceoState = createInitialState({ companyName: 'CEO Pay Co', categoryId: 'b2b-saas', mode: 'sandbox' });
const sal = setCeoSalaryAnnual(ceoState, 120_000);
if (!sal.ok) {
  console.error(`FAIL: set CEO salary: ${sal.reason}`);
  failed = true;
} else if (ceoSalaryMonthly(ceoState) !== 10_000) {
  console.error('FAIL: CEO monthly salary');
  failed = true;
} else if (projectMonthlyBurn(ceoState) < 10_000) {
  console.error('FAIL: CEO salary in burn');
  failed = true;
} else {
  const { prepareCompanyOverheadForMonth } = await import(
    `file://${join(sim, 'modules/CompanyOverhead.js')}`
  );
  prepareCompanyOverheadForMonth(ceoState);
  const oh = computeCompanyOverheadBreakdown(ceoState);
  const ohSum = oh.breakdown.reduce((s, l) => s + l.amount, 0);
  if (ohSum !== oh.total || oh.total !== projectMonthlyBurn(ceoState)) {
    console.error(`FAIL: company overhead breakdown mismatch (${ohSum} vs ${oh.total})`);
    failed = true;
  } else if (!oh.breakdown.some((l) => l.label === 'CEO compensation')) {
    console.error('FAIL: company overhead missing CEO compensation line');
    failed = true;
  } else if (
    !oh.breakdown.some((l) => COMPANY_VARIABLE_OPEX_CATEGORIES.includes(l.label) || l.label.includes('Cloud'))
  ) {
    console.error('FAIL: company overhead missing variable OPEX categories');
    failed = true;
  } else if (scheduledCompanyOverhead(ceoState).total !== oh.total) {
    console.error('FAIL: scheduled company overhead out of sync');
    failed = true;
  } else if (!failed) {
    console.log(`OK: company overhead breakdown (${oh.breakdown.length} lines, ${formatMoney(oh.total)}/mo)`);
  }
}
if (!failed) {
  ceoState.finance.cash = 50_000;
  if (!ownerDrawsUnlocked(ceoState)) {
    console.error('FAIL: owner draws should unlock before seed');
    failed = true;
  } else {
    const od = takeOwnerDraw(ceoState, 5_000);
    if (!od.ok || ceoState.ceo.careerOwnerDraws !== 5_000) {
      console.error('FAIL: owner draw');
      failed = true;
    }
  }
}
if (!failed) {
  const postSeed = createInitialState({ companyName: 'CEO Pay Co', categoryId: 'b2b-saas', mode: 'sandbox' });
  postSeed.flags.seedRoundClosed = true;
  postSeed.finance.cash = 100_000;
  const blocked = canTakeOwnerDraw(postSeed, 5_000);
  if (blocked.ok || ownerDrawsUnlocked(postSeed)) {
    console.error('FAIL: owner draw should block after seed close');
    failed = true;
  } else {
    console.log('OK: owner draws pre-seed only (hidden after seed close)');
  }
}
if (!failed) {
  recordCeoSalaryForMonth(ceoState);
  if (ceoState.ceo.careerSalaryPaid !== 10_000) {
    console.error('FAIL: career salary accrual');
    failed = true;
  } else if (!ceoState.ceo.salaryPayLog?.length) {
    console.error('FAIL: salary pay log');
    failed = true;
  } else if (!buildCompLedger(ceoState).length) {
    console.error('FAIL: comp ledger');
    failed = true;
  } else if (!suggestedCeoSalaryBand(ceoState).presets?.length) {
    console.error('FAIL: salary band');
    failed = true;
  } else if (wealthMix(ceoState).salary <= 0) {
    console.error('FAIL: wealth mix');
    failed = true;
  }
}
const ipoSalaryState = createInitialState({
  companyName: 'IPO Salary Co',
  categoryId: 'b2b-saas',
  mode: 'sandbox'
});
ipoSalaryState.flags.seedRoundClosed = true;
ipoSalaryState.flags.ipoFiled = true;
ipoSalaryState.flags.seriesAClosed = false;
ipoSalaryState.stage = STAGES.PUBLIC;
ipoSalaryState.ceo.salaryAnnual = 450_000;
const ipoBand = suggestedCeoSalaryBand(ipoSalaryState);
const ipoBoardNote = ceoSalaryBoardNote(ipoSalaryState);
if (ipoBand.label !== 'Public company') {
  console.error(`FAIL: IPO-without-A salary band should be public (got ${ipoBand.label})`);
  failed = true;
} else if (ipoBoardNote?.includes('pre–Series A')) {
  console.error(`FAIL: IPO path should not show pre-Series A salary warning (${ipoBoardNote})`);
  failed = true;
} else if (!failed) {
  console.log('OK: public CEO comp band + no pre-Series A warning without Series A');
}
const marketPayState = createInitialState({
  companyName: 'Market Pay Co',
  categoryId: 'b2b-saas',
  mode: 'career'
});
marketPayState.finance.mrr = 15_000;
marketPayState.flags.seedRoundClosed = true;
const officeOk = purchaseWorkspaceTier(marketPayState, PAY_WS_TIER.SMALL);
const engBefore = salaryForDept('engineering', null, marketPayState);
marketPayState.staff.marketSalaryLastBumpYear = marketPayState.calendar.year;
marketPayState.staff.marketSalaryLastBumpMonth = marketPayState.calendar.monthIndex;
marketPayState.calendar.year += 1;
const marketLines = tickMarketSalaryDemand(marketPayState);
const engAfter = salaryForDept('engineering', null, marketPayState);
const expectedEng = Math.round(engBefore * (1 + MARKET_SALARY_ANNUAL_BUMP_PCT));
if (!officeOk.ok) {
  console.error(`FAIL: market pay office: ${officeOk.reason}`);
  failed = true;
} else if (!marketLines.length) {
  console.error('FAIL: expected annual market salary bump log line');
  failed = true;
} else if (Math.abs(engAfter - expectedEng) > 2) {
  console.error(`FAIL: market salary bump ${engBefore} → ${engAfter} (expected ~${expectedEng})`);
  failed = true;
} else if (!failed) {
  console.log(`OK: annual market salary bump (+${MARKET_SALARY_ANNUAL_BUMP_PCT * 100}% every 12 months)`);
}
if (!failed) {
  if (TIER_REVENUE_PROFILE.length !== 8) {
    console.error(`FAIL: tier revenue profile length ${TIER_REVENUE_PROFILE.length}`);
    failed = true;
  } else {
    const eraRows = allTierRevenuePotentialRows(ceoState);
    const era = estimateEraRevenuePotential(ceoState);
    if (eraRows.length !== 8 || era.desk[1] < era.desk[0] || era.growth[1] < era.growth[0]) {
      console.error('FAIL: tier revenue potential rows');
      failed = true;
    }
  }
}
if (!failed) {
  const sharedTask = getTaskDefinitions().find((t) => t.id === 'mega-deal-close');
  if (sharedTask) {
    const seedEra = createInitialState({ companyName: 'Era', categoryId: 'b2b-saas', mode: 'career' });
    seedEra.flags.seedRoundClosed = true;
    const pubEra = createInitialState({ companyName: 'Era', categoryId: 'b2b-saas', mode: 'career' });
    pubEra.flags.ipoFiled = true;
    pubEra.stage = STAGES.PUBLIC;
    const seedRoll = rollTaskOutcome(sharedTask, seedEra).revenue;
    const pubRoll = rollTaskOutcome(sharedTask, pubEra).revenue;
    if (pubRoll <= seedRoll * 50) {
      console.error(`FAIL: era base scale seed=${seedRoll} public=${pubRoll}`);
      failed = true;
    }
  }
}
if (!failed) {
  const bigSal = setCeoSalaryAnnual(ceoState, 20_000_000);
  if (!bigSal.ok || bigSal.annual !== 20_000_000) {
    console.error('FAIL: CEO salary should not be capped at $2M');
    failed = true;
  }
}
const { isRealCalendarYear, formatStateMonth } = await import(
  `file://${join(sim, 'modules/GameCalendar.js')}`
);
const {
  rollInitialPersonalBankBalance,
  ceoPersonalBankBalance,
  settlePersonalExpensesAtMonthEnd,
  personalExpenseBandForSalary,
  scheduledPersonalExpense,
  preparePersonalExpensesForMonth,
  rollPersonalExpenseTotal
} = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);
const bankA = createInitialState({ companyName: 'Bank A', categoryId: 'b2b-saas', mode: 'career', ceoFirstName: 'A', ceoLastName: 'One' });
const bankB = createInitialState({ companyName: 'Bank B', categoryId: 'b2b-saas', mode: 'career', ceoFirstName: 'B', ceoLastName: 'Two' });
const openA = ceoPersonalBankBalance(bankA);
const openB = ceoPersonalBankBalance(bankB);
if (openA < 4500 || openA > 10500 || openB < 4500 || openB > 10500) {
  console.error('FAIL: personal bank opening range');
  failed = true;
} else if (openA === openB && bankA.meta.runSeed !== bankB.meta.runSeed) {
  console.error('FAIL: personal bank should vary by run');
  failed = true;
}
if (!failed) {
  preparePersonalExpensesForMonth(bankA);
  const garageDue = scheduledPersonalExpense(bankA).total;
  const { GARAGE_PHASE_PERSONAL_EXPENSE_MO, isGaragePhasePersonalExpenses } = await import(
    `file://${join(sim, 'modules/CeoEconomics.js')}`
  );
  if (!isGaragePhasePersonalExpenses(bankA) || garageDue !== GARAGE_PHASE_PERSONAL_EXPENSE_MO) {
    console.error(`FAIL: garage-phase CEO expenses expected ${GARAGE_PHASE_PERSONAL_EXPENSE_MO}, got ${garageDue}`);
    failed = true;
  }
  const { purchaseWorkspaceTier, WORKSPACE_TIER } = await import(
    `file://${join(sim, 'modules/Workspace.js')}`
  );
  bankA.finance.arr = 200_000;
  bankA.finance.mrr = Math.round(bankA.finance.arr / 12);
  const officeBuy = purchaseWorkspaceTier(bankA, WORKSPACE_TIER.SMALL);
  if (!officeBuy.ok) {
    console.error(`FAIL: garage salary test office purchase: ${officeBuy.reason}`);
    failed = true;
  } else {
    setCeoSalaryAnnual(bankA, 60_000);
    recordCeoSalaryForMonth(bankA);
    const band60 = personalExpenseBandForSalary(60_000);
    preparePersonalExpensesForMonth(bankA);
    const due = scheduledPersonalExpense(bankA).total;
    if (due > band60.max * 1.2 || due < band60.min * 0.9) {
      console.error(`FAIL: $60k salary expense ${due} outside band ${band60.min}-${band60.max}`);
      failed = true;
    }
  }
  bankA.finance.arr = 500_000_000;
  preparePersonalExpensesForMonth(bankA);
  const dueRich = scheduledPersonalExpense(bankA).total;
  const { purchaseCeoHomeMortgage, ceoHousingSummary } = await import(
    `file://${join(sim, 'modules/CeoLifestyle.js')}`
  );
  const homeState = createInitialState({ companyName: 'Home CEO', categoryId: 'b2b-saas', mode: 'sandbox' });
  homeState.ceo.bankBalance = 2_000_000;
  homeState.ceo.salaryAnnual = 350_000;
  const beforeSched = scheduledPersonalExpense(homeState);
  const housingLineBefore = beforeSched.breakdown.find((l) => l.label === 'Housing')?.amount ?? 0;
  const mort = purchaseCeoHomeMortgage(homeState, 'starter-condo');
  if (!mort.ok) {
    console.error(`FAIL: CEO mortgage purchase: ${mort.reason}`);
    failed = true;
  } else {
    preparePersonalExpensesForMonth(homeState);
    const afterSched = scheduledPersonalExpense(homeState);
    const housingLine = afterSched.breakdown.find((l) => l.label.startsWith('Mortgage'));
    const summary = ceoHousingSummary(homeState);
    if (!housingLine || housingLine.amount !== summary.monthlyHousingDebit) {
      console.error('FAIL: mortgage should replace Housing debit line');
      failed = true;
    } else if (afterSched.total === beforeSched.total) {
      console.error('FAIL: scheduled debit total should change after mortgage');
      failed = true;
    } else {
      console.log(
        `OK: CEO mortgage replaces housing debit (${formatMoney(housingLineBefore)} → ${formatMoney(housingLine.amount)})`
      );
    }
  }
  if (typeof band60 !== 'undefined' && dueRich > band60.max * 1.2) {
    console.error(`FAIL: personal debits should not scale with ARR (${dueRich})`);
    failed = true;
  }
  const beforeExp = bankA.ceo.bankBalance;
  settlePersonalExpensesAtMonthEnd(bankA);
  if (bankA.ceo.bankBalance >= beforeExp) {
    console.error('FAIL: personal expenses should reduce bank');
    failed = true;
  }
  const { advanceCalendarMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
  const monthA = rollPersonalExpenseTotal(bankA);
  advanceCalendarMonth(bankA);
  preparePersonalExpensesForMonth(bankA);
  const monthB = rollPersonalExpenseTotal(bankA);
  if (monthA === monthB) {
    console.error('FAIL: personal debits should vary month to month');
    failed = true;
  } else {
    console.log('OK: salary-based personal debits (not ARR, vary monthly)');
  }
}

const { hireCoo, isCooHired, cooSalaryMonthly, garageCooSalaryFromEquity } = await import(
  `file://${join(sim, 'modules/Coo.js')}`
);
const garageState = createInitialState({
  companyName: 'Garage COO',
  categoryId: 'b2b-saas',
  mode: 'career'
});
if (garageCooSalaryFromEquity(5) !== 2500 || garageCooSalaryFromEquity(10) !== 0) {
  console.error('FAIL: garage COO equity/salary curve (5%→2.5K, 10%→0)');
  failed = true;
}
const hireLow = hireCoo(garageState, { firstName: 'Riley', lastName: 'Chen', equityPct: 2 });
if (!hireLow.ok || !isCooHired(garageState)) {
  console.error(`FAIL: garage COO hire: ${hireLow.reason ?? 'unknown'}`);
  failed = true;
} else {
  const founderBefore = getFounderRow(garageState)?.pct ?? 100;
  const sal2 = cooSalaryMonthly(garageState);
  if (founderBefore >= 99 || sal2 <= 2500 || sal2 >= 7500) {
    console.error(`FAIL: COO 2% salary band founder=${founderBefore} sal=${sal2}`);
    failed = true;
  } else {
    console.log('OK: named COO from garage with equity on cap table');
  }
}
const garageZero = createInitialState({
  companyName: 'Garage COO Zero',
  categoryId: 'b2b-saas',
  mode: 'career'
});
const hireMax = hireCoo(garageZero, { firstName: 'Jordan', lastName: 'Lee', equityPct: 10 });
if (!hireMax.ok || cooSalaryMonthly(garageZero) !== 0) {
  console.error(`FAIL: 10% garage COO should be $0/mo sal=${cooSalaryMonthly(garageZero)}`);
  failed = true;
} else {
  console.log('OK: 10% garage COO at $0/mo');
}
if (!failed) {
  const { workspaceRentMonthly, WORKSPACE_TIER: WS_TIER } = await import(
    `file://${join(sim, 'modules/Workspace.js')}`
  );
  const campusRent = workspaceRentMonthly({
    workspace: { tier: WS_TIER.CAMPUS }
  });
  const hubRentState = createInitialState({ companyName: 'Hub Rent', categoryId: 'b2b-saas', mode: 'career' });
  hubRentState.workspace.tier = WS_TIER.HUB;
  hubRentState.offices = { hubId: 'nashville' };
  hubRentState.finance.hubRentMonthly = 125_000;
  const hubMo = workspaceRentMonthly(hubRentState);
  if (hubMo < 125_000 || hubMo <= campusRent) {
    console.error(`FAIL: hub rent ${hubMo} should exceed campus ${campusRent}`);
    failed = true;
  } else {
    console.log(`OK: hub city rent (${hubMo}/mo) above campus HQ (${campusRent}/mo)`);
  }

  const { addSatellite, getSatelliteTemplates, availableSatelliteTemplates } = await import(
    `file://${join(sim, 'modules/Offices.js')}`
  );
  const catalog = getSatelliteTemplates();
  if (catalog.length < 30) {
    console.error(`FAIL: expected 30+ satellite cities (got ${catalog.length})`);
    failed = true;
  }
  const satState = createInitialState({ companyName: 'SatCo', categoryId: 'b2b-saas', mode: 'sandbox' });
  satState.offices = { hubId: 'atlanta', hubLabel: 'Atlanta', satellites: [], usedSatelliteTemplateIds: [] };
  const open = addSatellite(satState, 'sat-denver', 'medium');
  const dup = addSatellite(satState, 'sat-denver', 'large');
  const avail = availableSatelliteTemplates(satState);
  if (!open.ok || dup.ok) {
    console.error(`FAIL: satellite one-time use (open ${open.ok}, dup ${dup.ok})`);
    failed = true;
  } else if (avail.some((t) => t.id === 'sat-denver')) {
    console.error('FAIL: used satellite should not appear in available list');
    failed = true;
  } else if (!failed) {
    console.log(`OK: satellite catalog (${catalog.length} cities, one-time open)`);
  }
  const { computeSatelliteOffice } = await import(`file://${join(sim, 'modules/SatelliteOffices.js')}`);
  const denverTpl = catalog.find((t) => t.id === 'sat-denver');
  const knoxTpl = catalog.find((t) => t.id === 'sat-knoxville');
  const denverMed = computeSatelliteOffice(denverTpl, 'medium');
  const knoxMed = computeSatelliteOffice(knoxTpl, 'medium');
  const laTpl = catalog.find((t) => t.id === 'sat-los-angeles');
  const laMed = computeSatelliteOffice(laTpl, 'medium');
  if (laMed.seats <= knoxMed.seats || laMed.rentMonthly <= knoxMed.rentMonthly) {
    console.error('FAIL: Los Angeles medium satellite should exceed Knoxville on seats and rent');
    failed = true;
  } else if (knoxMed.rentMonthly >= laMed.rentMonthly) {
    console.error('FAIL: Knoxville should rent cheaper than Los Angeles at the same footprint size');
    failed = true;
  } else {
    const laLarge = computeSatelliteOffice(laTpl, 'large');
    const laXl = computeSatelliteOffice(laTpl, 'xlarge');
    if (laMed.seats < 16 || laMed.seats > 24) {
      console.error(`FAIL: LA medium satellite should land ~19 seats (got ${laMed.seats})`);
      failed = true;
    } else if (laLarge.seats <= laMed.seats + 10) {
      console.error(`FAIL: LA large satellite should exceed medium by a wide margin (${laLarge.seats} vs ${laMed.seats})`);
      failed = true;
    } else if (laXl.seats <= laLarge.seats) {
      console.error('FAIL: extra-large satellite should beat large on seats');
      failed = true;
    } else if (!failed) {
      console.log(
        `OK: satellite sizing (Knoxville medium ${knoxMed.seats}/${knoxMed.rentMonthly}, LA medium/large/xl ${laMed.seats}/${laLarge.seats}/${laXl.seats} seats)`
      );
    }
  }

  const { totalHeadcountCap, headcountCapBreakdown } = await import(
    `file://${join(sim, 'modules/Offices.js')}`
  );
  const { maxHeadcountForStage } = await import(`file://${join(sim, 'modules/Staff.js')}`);
  const { HUB_HEADCOUNT_CAP } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
  const hubCapState = createInitialState({ companyName: 'HubCap', categoryId: 'b2b-saas', mode: 'career' });
  hubCapState.workspace = { ...(hubCapState.workspace ?? {}), tier: WS_TIER.HUB, hubOwned: true };
  hubCapState.offices = {
    hubId: 'atlanta',
    hubLabel: 'Atlanta',
    satellites: [
      {
        id: 'sat-denver',
        templateId: 'sat-denver',
        label: 'Denver',
        size: 'medium',
        sizeLabel: 'Medium',
        seats: denverMed.seats,
        rentMonthly: denverMed.rentMonthly
      }
    ],
    usedSatelliteTemplateIds: ['sat-denver']
  };
  const hubBaseCap = headcountCapBreakdown(hubCapState);
  if (hubBaseCap.base !== HUB_HEADCOUNT_CAP || totalHeadcountCap(hubCapState) !== HUB_HEADCOUNT_CAP + denverMed.seats) {
    console.error(
      `FAIL: hub cap expected ${HUB_HEADCOUNT_CAP}+${denverMed.seats} seats got base ${hubBaseCap.base} total ${totalHeadcountCap(hubCapState)}`
    );
    failed = true;
  } else if (maxHeadcountForStage(hubCapState.stage, hubCapState) !== totalHeadcountCap(hubCapState)) {
    console.error('FAIL: People tab cap should match totalHeadcountCap with satellites');
    failed = true;
  } else {
    console.log(`OK: hub HQ cap ${HUB_HEADCOUNT_CAP} + satellite seats (${totalHeadcountCap(hubCapState)} hiring cap)`);
  }
  const { headcountCap, getWorkspaceTier } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
  const { hiringAllowed } = await import(`file://${join(sim, 'modules/Staff.js')}`);
  const driftHubState = createInitialState({
    companyName: 'Drift Hub',
    categoryId: 'b2b-saas',
    mode: 'career'
  });
  driftHubState.workspace = {
    ...(driftHubState.workspace ?? {}),
    tier: WS_TIER.CAMPUS,
    campusOwned: true
  };
  driftHubState.offices = {
    hubId: 'atlanta',
    hubLabel: 'Atlanta',
    satellites: [{ id: 'sat-denver', templateId: 'sat-denver', label: 'Denver', seats: denverMed.seats }],
    usedSatelliteTemplateIds: ['sat-denver']
  };
  const driftTotal = totalHeadcountCap(driftHubState);
  if (headcountCap(driftHubState) !== HUB_HEADCOUNT_CAP || driftTotal !== HUB_HEADCOUNT_CAP + denverMed.seats) {
    console.error(
      `FAIL: hub city should set hub cap even when workspace tier drifted (got ${headcountCap(driftHubState)}/${driftTotal})`
    );
    failed = true;
  } else if (!hiringAllowed(driftHubState)) {
    console.error('FAIL: hub city should allow hiring when workspace tier drifted');
    failed = true;
  } else {
    const migratedDrift = normalizeSave(JSON.parse(JSON.stringify(driftHubState)));
    if (getWorkspaceTier(migratedDrift) !== WS_TIER.HUB) {
      console.error('FAIL: normalizeSave should restore hub workspace tier when hubId is set');
      failed = true;
    } else {
      console.log('OK: hub headcount cap follows hub city + save migrate fixes tier drift');
    }
  }
  const sandPostXc = createInitialState({
    companyName: 'Sandbox Hub Start',
    categoryId: 'b2b-saas',
    mode: 'sandbox',
    sandboxTuning: { startingStage: 'post_xc', revenueMult: 1, ipoGateArr: 50_000_000 }
  });
  if (!sandPostXc.offices?.hubId) {
    console.error('FAIL: sandbox post_xc start should open a hub city');
    failed = true;
  } else if (getWorkspaceTier(sandPostXc) !== WS_TIER.HUB) {
    console.error(`FAIL: sandbox post_xc start should set hub workspace tier (got ${getWorkspaceTier(sandPostXc)})`);
    failed = true;
  } else if (!hiringAllowed(sandPostXc) || totalHeadcountCap(sandPostXc) !== HUB_HEADCOUNT_CAP) {
    console.error(
      `FAIL: sandbox post_xc hub cap should be hub HQ (${HUB_HEADCOUNT_CAP}), got ${totalHeadcountCap(sandPostXc)}`
    );
    failed = true;
  } else {
    sandPostXc.offices.satellites = [
      {
        id: 'sat-denver',
        templateId: 'sat-denver',
        label: 'Denver',
        seats: denverMed.seats,
        rentMonthly: denverMed.rentMonthly
      }
    ];
    const sandHubTotal = totalHeadcountCap(sandPostXc);
    const expectedSandHub = HUB_HEADCOUNT_CAP + denverMed.seats;
    if (sandHubTotal !== expectedSandHub || sandHubTotal === 10_000) {
      console.error(
        `FAIL: sandbox hub cap should be HQ+seats (${expectedSandHub}), not flat 10k (got ${sandHubTotal})`
      );
      failed = true;
    } else if (!failed) {
      console.log(`OK: sandbox hub cap ${HUB_HEADCOUNT_CAP} + satellites (${sandHubTotal}, not flat 10k)`);
    }
  }
}
if (!failed) {
  const publicCoo = createInitialState({ companyName: 'Public COO', categoryId: 'b2b-saas', mode: 'sandbox' });
  publicCoo.workspace.tier = WORKSPACE_TIER.LARGE;
  publicCoo.flags.ipoFiled = true;
  publicCoo.stage = STAGES.PUBLIC;
  setCeoSalaryAnnual(publicCoo, 20_000_000);
  const hired = hireCoo(publicCoo, { firstName: 'Sam', lastName: 'Ops', equityPct: 2 });
  if (!hired.ok) {
    console.error(`FAIL: public COO hire: ${hired.reason}`);
    failed = true;
  } else {
    const expectedFloor = Math.round((20_000_000 / 12) * 0.6);
    const cooMo = cooSalaryMonthly(publicCoo);
    if (cooMo < expectedFloor) {
      console.error(`FAIL: public COO ${cooMo} < 60% CEO ${expectedFloor}`);
      failed = true;
    } else {
      console.log(`OK: public COO comp tracks CEO (${cooMo}/mo ≥ 60% floor)`);
    }
  }
}

const {
  growthCampaignCatalogSize,
  GROWTH_MONTHLY_OFFER_COUNT,
  growthMonthlyOfferCount,
  refreshGrowthCampaignOffers,
  availableCampaigns,
  runGrowthCampaign,
  resetGrowthCampaignsMonth
} = await import(`file://${join(sim, 'modules/GrowthCampaigns.js')}`);
const { getProductActions, sideTaskBankSize, sideTaskPlaysPerMonth } = await import(
  `file://${join(sim, 'modules/ProductActions.js')}`
);
const { growthCampaignSlots } = await import(
  `file://${join(sim, 'modules/SideTaskProgression.js')}`
);
const earlySide = createInitialState({ companyName: 'Side Cap', categoryId: 'b2b-saas', mode: 'career' });
const earlyPlays = sideTaskPlaysPerMonth(earlySide);
if (earlyPlays < 2) {
  console.error(`FAIL: early side plays expected >=2 got ${earlyPlays}`);
  failed = true;
}
earlySide.flags.seedRoundClosed = true;
earlySide.flags.seriesAClosed = true;
earlySide.flags.seriesBClosed = true;
earlySide.product.level = 12;
earlySide.product.buzz = 24;
earlySide.staff.headcountByDept = { marketing: 16, product: 8, engineering: 12 };
const scaledPlays = sideTaskPlaysPerMonth(earlySide);
const scaledCampaigns = growthCampaignSlots(earlySide);
if (scaledPlays <= earlyPlays || scaledCampaigns < 3) {
  console.error(`FAIL: side limits should scale (${earlyPlays}→${scaledPlays}, campaigns ${scaledCampaigns})`);
  failed = true;
}
if (scaledPlays > scaledCampaigns) {
  console.error(`FAIL: side plays should be capped at campaign ceiling (${scaledPlays} > ${scaledCampaigns})`);
  failed = true;
}
const hubState = createInitialState({ companyName: 'Hub Side', categoryId: 'b2b-saas', mode: 'career' });
hubState.workspace.tier = WORKSPACE_TIER.HUB;
hubState.offices = { ...(hubState.offices ?? {}), hubId: 'test-hub' };
if (
  sideTaskPlaysPerMonth(hubState) !== Infinity ||
  growthCampaignSlots(hubState) !== Infinity
) {
  console.error('FAIL: hub workspace should grant unlimited side tasks');
  failed = true;
} else {
  console.log(`OK: dynamic side limits (${earlyPlays}→${scaledPlays} plays, hub unlimited)`);
}

const spaceState = createInitialState({
  companyName: 'Orbit Labs',
  categoryId: 'space-exploration',
  mode: 'career'
});
if (spaceState.world?.competitor?.name !== 'SpaceXY') {
  console.error(`FAIL: space rival expected SpaceXY got ${spaceState.world?.competitor?.name}`);
  failed = true;
}
const spaceDesk = getTaskDefinitions().filter((t) => t.categories?.includes('space-exploration'));
const spaceSigs = spaceDesk.filter((t) => t.signature);
if (spaceDesk.length < 70) {
  console.error(`FAIL: space-exploration desk bank ${spaceDesk.length} < 70`);
  failed = true;
} else if (spaceSigs.length < 10) {
  console.error(`FAIL: space-exploration signatures ${spaceSigs.length} < 10`);
  failed = true;
} else if (getTaskPoolSize(spaceState) < getMonthlyTaskOfferCount(STAGES.GARAGE)) {
  console.error(`FAIL: space-exploration garage pool ${getTaskPoolSize(spaceState)} too small`);
  failed = true;
} else {
  console.log(
    `OK: space-exploration category (${spaceDesk.length} custom desk tasks, ${spaceSigs.length} signatures, rival SpaceXY)`
  );
}

const growthRosterState = createInitialState({
  companyName: 'Growth Roster',
  categoryId: 'b2b-saas',
  mode: 'sandbox'
});
growthRosterState.flags.ipoFiled = true;
growthRosterState.stage = STAGES.PUBLIC;
growthRosterState.finance.cash = 50_000_000_000;
resetGrowthCampaignsMonth(growthRosterState);
const roster = growthRosterState.growth.monthCampaignOffers ?? [];
const expectedOffers = growthMonthlyOfferCount(growthRosterState);
if (roster.length < 1 || roster.length > expectedOffers) {
  console.error(`FAIL: growth monthly roster size ${roster.length} (max ${expectedOffers})`);
  failed = true;
} else {
  const playable = availableCampaigns(growthRosterState);
  if (!playable.length) {
    console.error('FAIL: public growth roster has no playable campaigns');
    failed = true;
  } else {
    const first = playable[0];
    const run = runGrowthCampaign(growthRosterState, first.id);
    if (!run.ok || !growthRosterState.growth.recentCampaignIds?.includes(first.id)) {
      console.error(`FAIL: growth campaign run / cooldown track: ${run.reason ?? 'ok'}`);
      failed = true;
    } else {
      resetGrowthCampaignsMonth(growthRosterState);
      if (availableCampaigns(growthRosterState).some((c) => c.id === first.id)) {
        console.error('FAIL: ran growth campaign should stay off roster until cooldown');
        failed = true;
      } else {
        const whaleOnRoster = roster.some((id) => {
          const def = getGrowthCampaigns().find((c) => c.id === id);
          return def?.whale === true;
        });
        const megaOnRoster = roster.some((id) => {
          const def = getGrowthCampaigns().find((c) => c.id === id);
          return def?.megawhale === true;
        });
        if (!whaleOnRoster) {
          console.error('FAIL: public growth roster should include at least one whale paid play');
          failed = true;
        } else if (!megaOnRoster) {
          console.error('FAIL: public growth roster should include at least one megawhale paid play');
          failed = true;
        } else {
          console.log(`OK: growth roster + cooldown (${roster.length}/mo, era-scaled payouts)`);
        }
      }
    }
  }
}

const productSideBank = sideTaskBankSize(['product', 'both']);
const publicGrowthWhales = getGrowthCampaigns().filter((c) => c.whale === true && (c.tierMin ?? 0) >= 7);
const publicGrowthMegawhales = getGrowthCampaigns().filter(
  (c) => c.megawhale === true && (c.tierMin ?? 0) >= 7
);
if (publicGrowthWhales.length < 20) {
  console.error(`FAIL: expected 20+ post-IPO whale growth campaigns (got ${publicGrowthWhales.length})`);
  failed = true;
} else if (publicGrowthMegawhales.length < 15) {
  console.error(`FAIL: expected 15+ post-IPO megawhale growth campaigns (got ${publicGrowthMegawhales.length})`);
  failed = true;
} else if (growthCampaignCatalogSize() < 315) {
  console.error(`FAIL: growth campaign bank too small (${growthCampaignCatalogSize()}, want ≥315)`);
  failed = true;
} else if (getProductActions().length < 75) {
  console.error(`FAIL: side-task lever bank too small (${getProductActions().length})`);
  failed = true;
} else if (productSideBank < 32) {
  console.error(`FAIL: product side-task bank too small (${productSideBank})`);
  failed = true;
} else {
  console.log(
    `OK: side-task banks (${growthCampaignCatalogSize()} paid campaigns, ${getProductActions().length} levers, ${productSideBank} product-focused)`
  );
}

const { runAllRemainingSideTasks, canBuyAllRemainingSideTasks } = await import(
  `file://${join(sim, 'modules/ProductActions.js')}`
);
const sideBulk = createInitialState({
  companyName: 'SideBulk',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 500_000
});
sideBulk.flags.xcResidencyComplete = true;
sideBulk.flags.seedRoundClosed = true;
if (!canBuyAllRemainingSideTasks(sideBulk, ['product', 'growth', 'brand', 'both'])) {
  console.error('FAIL: sandbox should allow buy-all side plays');
  failed = true;
} else {
  const bulk = runAllRemainingSideTasks(sideBulk, ['product', 'growth', 'brand', 'both']);
  if (!bulk.ok || bulk.count < 1) {
    console.error(`FAIL: buy-all side plays: ${bulk.reason ?? 'empty'}`);
    failed = true;
  } else {
    console.log(`OK: buy-all side plays (${bulk.count} runs)`);
  }
}

const {
  payCompanyWideBonus,
  totalEmployeeSalaryMassMonthly,
  canPayAnnualCompanyBonus,
  monthsUntilAnnualCompanyBonus,
  EXTRA_PERKS,
  runExtraEmployeePerk
} = await import(`file://${join(sim, 'modules/EmployeeBenefits.js')}`);
const { payCeoArrBonus, canPayCeoArrBonus, priorYearArrRevenue } = await import(
  `file://${join(sim, 'modules/CeoEconomics.js')}`
);

function bumpCalendarMonths(state, delta) {
  let y = state.calendar?.year ?? 2026;
  let m = state.calendar?.monthIndex ?? 1;
  for (let i = 0; i < delta; i += 1) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  state.calendar = { ...state.calendar, year: y, monthIndex: m };
}
const { expandEmployeeOptionPool, applySeedCapTableSnapshot } = await import(
  `file://${join(sim, 'modules/CapTable.js')}`
);
const perkState = createInitialState({
  companyName: 'PerkCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 2_000_000
});
perkState.flags.seedRoundClosed = true;
perkState.flags.xcResidencyComplete = true;
perkState.staff.headcountByDept.engineering = 5;
perkState.ceo.salaryAnnual = 120_000;
const mass = totalEmployeeSalaryMassMonthly(perkState);
if (mass.total < 1) {
  console.error('FAIL: employee salary mass should be positive with staff');
  failed = true;
} else {
  const bonus = payCompanyWideBonus(perkState, 5);
  if (!bonus.ok || (perkState.ceo.careerEmployeeBonuses ?? 0) < 1) {
    console.error(`FAIL: company bonus: ${bonus.reason ?? 'no ceo credit'}`);
    failed = true;
  } else {
    console.log(`OK: company bonus (${bonus.pct}%, CEO ${formatMoney(bonus.ceoShare)})`);
  }
}
const annualBonusState = createInitialState({
  companyName: 'AnnualBonusCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 8_000_000
});
annualBonusState.staff.headcountByDept.engineering = 5;
annualBonusState.ceo.salaryAnnual = 120_000;
annualBonusState.staff.companyBonusAnnualMode = true;
const massAnnual = totalEmployeeSalaryMassMonthly(annualBonusState);
const expectedAnnualPool = Math.round(massAnnual.total * 12 * 0.05);
const bonusAnnual = payCompanyWideBonus(annualBonusState, 5);
if (!bonusAnnual.ok || bonusAnnual.pool !== expectedAnnualPool || !bonusAnnual.annualMode) {
  console.error(
    `FAIL: annual company bonus: ${bonusAnnual.reason ?? `expected pool ${expectedAnnualPool}, got ${bonusAnnual.pool}`}`
  );
  failed = true;
} else {
  console.log(`OK: annual company bonus (${bonusAnnual.pct}%, pool ${formatMoney(bonusAnnual.pool)})`);
}
if (annualBonusState.staff.companyBonusAnnualMode) {
  console.error('FAIL: annual bonus should clear annual mode after payout');
  failed = true;
} else if (canPayAnnualCompanyBonus(annualBonusState)) {
  console.error('FAIL: annual bonus should start 12-month cooldown');
  failed = true;
} else if (monthsUntilAnnualCompanyBonus(annualBonusState) !== 12) {
  console.error(
    `FAIL: annual bonus cooldown expected 12 months, got ${monthsUntilAnnualCompanyBonus(annualBonusState)}`
  );
  failed = true;
} else {
  annualBonusState.staff.benefitsThisMonth.companyBonusPct = null;
  const monthlyAfterAnnual = payCompanyWideBonus(annualBonusState, 2);
  if (!monthlyAfterAnnual.ok || monthlyAfterAnnual.annualMode) {
    console.error(`FAIL: monthly bonus after annual: ${monthlyAfterAnnual.reason ?? 'unexpected annual mode'}`);
    failed = true;
  } else {
    console.log('OK: annual bonus 12-month cooldown + monthly bonus still available');
  }
}
if (EXTRA_PERKS.length < 15) {
  console.error(`FAIL: expected 15+ employee perks, got ${EXTRA_PERKS.length}`);
  failed = true;
} else {
  perkState.flags.seriesAClosed = true;
  const beforeProduct = perkState.product?.level ?? 0;
  const hack = runExtraEmployeePerk(perkState, 'hackathon');
  if (!hack.ok || (perkState.product?.level ?? 0) !== beforeProduct + 1) {
    console.error(`FAIL: hackathon perk: ${hack.reason ?? 'product level unchanged'}`);
    failed = true;
  } else {
    console.log(`OK: employee perks catalog (${EXTRA_PERKS.length}) + hackathon run`);
  }
}
const { skippedSeriesBToIpo, meetsProgressionTierMin } = await import(
  `file://${join(sim, 'modules/ProgressionEconomy.js')}`
);
const skipBIpoState = createInitialState({
  companyName: 'SkipBCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 500_000
});
skipBIpoState.flags.seedRoundClosed = true;
skipBIpoState.flags.seriesAClosed = true;
skipBIpoState.flags.ipoFiled = true;
skipBIpoState.stage = STAGES.PUBLIC;
skipBIpoState.finance.cash = 500_000;
if (!skippedSeriesBToIpo(skipBIpoState) || !meetsProgressionTierMin(skipBIpoState, 4)) {
  console.error('FAIL: Series A → IPO without B should satisfy Series B+ unlock tier');
  failed = true;
} else {
  const family = runExtraEmployeePerk(skipBIpoState, 'family-stipend');
  if (!family.ok) {
    console.error(`FAIL: family stipend after skip-B IPO: ${family.reason ?? 'blocked'}`);
    failed = true;
  } else {
    console.log('OK: Series B+ perks unlock on IPO after Series A (no B raise)');
  }
}
const poolState = createInitialState({ companyName: 'PoolCo', categoryId: 'b2b-saas', mode: 'career' });
poolState.flags.seedRoundClosed = true;
applySeedCapTableSnapshot(poolState);
const before = poolState.capTable.find((r) => r.id === 'esop')?.shares ?? 0;
const expand = expandEmployeeOptionPool(poolState, 5);
const expectedTopUp = Math.max(1, Math.round(before * 0.05));
if (
  !expand.ok ||
  (poolState.capTable.find((r) => r.id === 'esop')?.shares ?? 0) !== before + expectedTopUp ||
  expand.sharesAdded !== expectedTopUp
) {
  console.error(
    `FAIL: option pool expand: ${expand.reason ?? `expected +${expectedTopUp}, got ${expand.sharesAdded ?? 0}`}`
  );
  failed = true;
} else {
  console.log(`OK: option pool expand +5% of pool (${expand.sharesAdded} shares)`);
}

const calState = createInitialState({ companyName: 'Cal Co', categoryId: 'b2b-saas', mode: 'career' });
if (!isRealCalendarYear(calState.calendar.year)) {
  console.error('FAIL: career should start on real calendar year');
  failed = true;
} else if (!formatStateMonth(calState).match(/\d{4}/)) {
  console.error('FAIL: calendar label format');
  failed = true;
}
if (!failed) {
  console.log('OK: finance stack + CEO salary, draws, career comp, real calendar');
}

const {
  closeFiscalYearOnDecember,
  computeTaxLiability,
  completeTaxFilingTask,
  donateToCharity,
  isTaxFilingRequired,
  TAX_FILING_TASK_ID,
  ensureFiscal,
  taxBaseRevenue
} = await import(`file://${join(sim, 'modules/CorporateTax.js')}`);

const arrBonusState = createInitialState({
  companyName: 'ArrBonusCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 5_000_000
});
arrBonusState.meta.calendarStartYear = 2024;
arrBonusState.calendar = { year: 2026, monthIndex: 3, monthSpend: 0, monthTasks: [] };
ensureFiscal(arrBonusState);
arrBonusState.finance.fiscal.prior = { year: 2025, revenue: 2_000_000, expenses: 800_000, profit: 1_200_000 };
if (priorYearArrRevenue(arrBonusState) !== 2_000_000) {
  console.error('FAIL: prior year ARR base for CEO bonus');
  failed = true;
} else {
  const arrPay = payCeoArrBonus(arrBonusState, 10);
  if (!arrPay.ok || arrPay.amount !== 200_000 || (arrBonusState.ceo.careerCeoArrBonuses ?? 0) !== 200_000) {
    console.error(`FAIL: CEO ARR bonus: ${arrPay.reason ?? arrPay.amount}`);
    failed = true;
  } else {
    const repeat = payCeoArrBonus(arrBonusState, 10);
    if (repeat.ok) {
      console.error('FAIL: CEO ARR bonus should block repeat within 12 months');
      failed = true;
    } else {
      bumpCalendarMonths(arrBonusState, 12);
      if (!canPayCeoArrBonus(arrBonusState).ok) {
        console.error('FAIL: CEO ARR bonus should unlock after 12 months');
        failed = true;
      } else {
        arrBonusState.finance.cash = 5_000_000;
        const arrPay2 = payCeoArrBonus(arrBonusState, 5);
        if (!arrPay2.ok || arrPay2.amount !== 100_000) {
          console.error(`FAIL: CEO ARR bonus second payout: ${arrPay2.reason ?? arrPay2.amount}`);
          failed = true;
        } else {
          console.log('OK: CEO ARR bonus (prior-year revenue, 12-month cooldown)');
        }
      }
    }
  }
}

const fyRoll = createInitialState({ companyName: 'FY Co', categoryId: 'b2b-saas', mode: 'career' });
ensureFiscal(fyRoll);
fyRoll.finance.fiscal.current.revenue = 50_000;
fyRoll.finance.fiscal.current.expenses = 12_000;
const rolled = closeFiscalYearOnDecember(fyRoll, 2025, 12);
if (!rolled || rolled.revenue !== 50_000 || rolled.profit !== 38_000) {
  console.error('FAIL: fiscal year rollover on December close');
  failed = true;
} else if (fyRoll.finance.fiscal.current.year !== 2026 || fyRoll.finance.fiscal.current.revenue !== 0) {
  console.error('FAIL: fiscal current year should reset after December close');
  failed = true;
} else {
  console.log('OK: fiscal year rollover (Jan–Dec)');
}

const taxState = createInitialState({ companyName: 'Tax Co', categoryId: 'b2b-saas', mode: 'career' });
taxState.meta.calendarStartYear = 2024;
taxState.calendar.year = 2026;
taxState.calendar.monthIndex = 4;
taxState.finance.cash = 100_000;
ensureFiscal(taxState);
taxState.finance.fiscal.prior = { year: 2025, revenue: 100_000, expenses: 40_000, profit: 60_000 };
if (!isTaxFilingRequired(taxState)) {
  console.error('FAIL: April tax filing should be required with prior FY revenue');
  failed = true;
} else {
  const owed = computeTaxLiability(taxState);
  if (owed !== Math.max(500, Math.round(100_000 * 0.21))) {
    console.error(`FAIL: tax liability on revenue base (got ${owed})`);
    failed = true;
  } else {
    const filed = completeTaxFilingTask(taxState);
    if (!filed.ok || taxState.finance.fiscal.taxPaidYear !== 2026) {
      console.error(`FAIL: complete tax filing: ${filed.reason ?? 'bad state'}`);
      failed = true;
    } else if (taxBaseRevenue(taxState) !== 100_000) {
      console.error('FAIL: tax base should use prior FY revenue after year one');
      failed = true;
    } else {
      console.log(`OK: April corporate tax filing (${formatMoney(filed.owed)})`);
    }
  }
}

const {
  isCeoPersonalTaxFilingRequired,
  CEO_PERSONAL_TAX_FILING_TASK_ID,
  completeCeoPersonalTaxFilingTask,
  ceoPersonalTaxBaseIncome,
  accrueCeoTaxableIncome,
  ensureCeoPersonalTax
} = await import(`file://${join(sim, 'modules/CeoPersonalTax.js')}`);
const { payCeoPersonalTaxFromBank } = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);

const ceoTaxState = createInitialState({ companyName: 'CEO Tax Co', categoryId: 'b2b-saas', mode: 'career' });
ceoTaxState.meta.calendarStartYear = 2024;
ceoTaxState.calendar.year = 2026;
ceoTaxState.calendar.monthIndex = 4;
ensureCeoPersonalTax(ceoTaxState);
ceoTaxState.ceo.personalTax.prior = { year: 2025, income: 200_000 };
ceoTaxState.ceo.bankBalance = 100_000;
if (!isCeoPersonalTaxFilingRequired(ceoTaxState)) {
  console.error('FAIL: April CEO personal tax filing should be required with prior-year income');
  failed = true;
} else {
  const ceoOwed = Math.max(250, Math.round(200_000 * 0.28));
  const ceoFiled = completeCeoPersonalTaxFilingTask(ceoTaxState, payCeoPersonalTaxFromBank);
  if (!ceoFiled.ok || ceoTaxState.ceo.personalTax.taxPaidYear !== 2026) {
    console.error(`FAIL: complete CEO personal tax filing: ${ceoFiled.reason ?? 'bad state'}`);
    failed = true;
  } else if (ceoFiled.owed !== ceoOwed) {
    console.error(`FAIL: CEO personal tax liability (got ${ceoFiled.owed}, expected ${ceoOwed})`);
    failed = true;
  } else if (ceoPersonalTaxBaseIncome(ceoTaxState) !== 200_000) {
    console.error('FAIL: CEO personal tax base should use prior year after year one');
    failed = true;
  } else {
    console.log(`OK: April CEO personal tax filing (${formatMoney(ceoFiled.owed)})`);
  }
}

const accrualState = createInitialState({ companyName: 'Accrual Co', categoryId: 'b2b-saas', mode: 'career' });
accrualState.ceo.salaryAnnual = 120_000;
accrueCeoTaxableIncome(accrualState, ceoSalaryMonthly(accrualState));
if ((ensureCeoPersonalTax(accrualState).current.income ?? 0) !== ceoSalaryMonthly(accrualState)) {
  console.error('FAIL: CEO taxable income accrual');
  failed = true;
} else {
  console.log('OK: CEO taxable income accrual');
}

const { ceoAgeOnCalendar, ceoAgeInGame } = await import(`file://${join(sim, 'modules/CeoProfile.js')}`);
if (ceoAgeOnCalendar(1998, 6, 2026, 6) !== 28 || ceoAgeOnCalendar(1998, 6, 2026, 5) !== 27) {
  console.error('FAIL: CEO birthday age should respect in-game month');
  failed = true;
} else {
  const ageState = createInitialState({
    companyName: 'Age Co',
    categoryId: 'b2b-saas',
    mode: 'career',
    ceoBirthMonth: 6,
    ceoBirthYear: 1998
  });
  ageState.calendar.year = 2026;
  ageState.calendar.monthIndex = 5;
  if (ceoAgeInGame(ageState) !== 27) {
    console.error('FAIL: ceoAgeInGame from state calendar');
    failed = true;
  } else {
    console.log('OK: CEO age from birthday + in-game calendar');
  }
}

const charityState = createInitialState({ companyName: 'Give Co', categoryId: 'b2b-saas', mode: 'career' });
charityState.finance.cash = 50_000;
const beforeCash = charityState.finance.cash;
const gift = donateToCharity(charityState, 5_000);
if (!gift.ok || charityState.finance.cash !== beforeCash - 5_000) {
  console.error(`FAIL: charity donate: ${gift.reason ?? 'cash mismatch'}`);
  failed = true;
} else if ((charityState.finance.fiscal?.charityDonatedLifetime ?? 0) !== 5_000) {
  console.error('FAIL: charity lifetime tracker');
  failed = true;
} else {
  console.log('OK: charity donation from company cash');
}

const { autoSelectRecommendedLineup, deskMonthCloseChecklist } = await import(
  `file://${join(sim, 'modules/Desk.js')}`
);
const deskState = createInitialState({ companyName: 'DeskCo', categoryId: 'b2b-saas', mode: 'sandbox' });
deskState.workspace.tier = 'small';
dealMonthlyTasks(deskState);
if (!needsTaskLineup(deskState) || !(deskState.calendar.monthTaskOffers?.length > 0)) {
  console.error('FAIL: desk should open monthly lineup with offers');
  failed = true;
} else {
  const auto = autoSelectRecommendedLineup(deskState);
  const slots = deskState.calendar.monthTaskSlotTarget ?? 4;
  if (!auto.ok || selectedOfferCount(deskState) !== slots) {
    console.error(`FAIL: desk auto-lineup: ${auto.reason ?? `picked ${selectedOfferCount(deskState)}/${slots}`}`);
    failed = true;
  } else {
    const checklist = deskMonthCloseChecklist(deskState);
    if (!checklist.some((c) => c.id === 'lineup') || checklist.find((c) => c.id === 'tasks')?.done) {
      console.error('FAIL: desk month-close checklist shape');
      failed = true;
    } else {
      console.log(`OK: desk tab (auto-lineup ${auto.picked}/${slots}, checklist ${checklist.length} items)`);
    }
  }
}

if (getTaskDefinitions().some((t) => t.id === TAX_FILING_TASK_ID)) {
  console.log('OK: tax filing desk task in catalog');
} else {
  console.error('FAIL: tax filing task missing from merged catalog');
  failed = true;
}

if (getTaskDefinitions().some((t) => t.id === CEO_PERSONAL_TAX_FILING_TASK_ID)) {
  console.log('OK: CEO personal tax filing desk task in catalog');
} else {
  console.error('FAIL: CEO personal tax filing task missing from merged catalog');
  failed = true;
}

const {
  DEPARTMENTS,
  emptyHeadcount,
  visibleDepartments,
  isDepartmentUnlocked,
  migrateStaffHeadcount,
  totalHeadcount
} = await import(`file://${join(sim, 'modules/Staff.js')}`);
const {
  sellCeoHome,
  purchaseCeoHomeCash,
  purchaseCeoHomeMortgage,
  prepayCeoMortgage,
  purchaseCeoLifestyle,
  sellCeoLifestyle,
  preloadCeoLifestyleCatalog,
  getCeoHomeTier,
  ceoLifestyleMonthlyDebit,
  ceoLifestyleLifetimeSpend
} = await import(`file://${join(sim, 'modules/CeoLifestyle.js')}`);
await preloadCeoLifestyleCatalog();
const {
  donateFromPersonalBank,
  recordCeoNetWorthSnapshot,
  depositPersonalInvestment
} = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);
const homeState = createInitialState({
  companyName: 'HomeSellCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 500_000
});
if (!getCeoHomeTier('tech-loft')?.cashPrice) {
  console.error('FAIL: CEO tech-loft home tier missing');
  failed = true;
}
homeState.ceo.bankBalance = 2_000_000;
const bought = purchaseCeoHomeCash(homeState, 'starter-condo');
if (!bought.ok) {
  console.error(`FAIL: CEO home purchase: ${bought.reason}`);
  failed = true;
} else {
  const sold = sellCeoHome(homeState);
  if (!sold.ok || homeState.ceo.housing.mode !== 'rent') {
    console.error(`FAIL: CEO sell home: ${sold.reason ?? 'housing not reset'}`);
    failed = true;
  } else {
    const giveState = createInitialState({
      companyName: 'GivePersonal',
      categoryId: 'b2b-saas',
      mode: 'sandbox'
    });
    giveState.ceo.bankBalance = 20_000;
    const gift = donateFromPersonalBank(giveState, 5_000);
    if (!gift.ok || giveState.ceo.personalGivingLifetime !== 5_000) {
      console.error(`FAIL: personal philanthropy: ${gift.reason ?? 'lifetime mismatch'}`);
      failed = true;
    } else {
      recordCeoNetWorthSnapshot(giveState);
      if (!(giveState.ceo.netWorthHistory?.[0]?.netWorth > 0)) {
        console.error('FAIL: CEO net worth snapshot');
        failed = true;
      } else {
        const investState = createInitialState({
          companyName: 'InvestCo',
          categoryId: 'b2b-saas',
          mode: 'sandbox'
        });
        investState.ceo.bankBalance = 50_000;
        const dep = depositPersonalInvestment(investState, 10_000);
        const mortgageState = createInitialState({
          companyName: 'MortgageCo',
          categoryId: 'b2b-saas',
          mode: 'sandbox'
        });
        mortgageState.ceo.bankBalance = 500_000;
        purchaseCeoHomeMortgage(mortgageState, 'starter-condo');
        const prepay = prepayCeoMortgage(mortgageState, 25_000);
        if (!dep.ok || investState.ceo.investmentBalance !== 10_000 || !prepay.ok) {
          console.error('FAIL: CEO portfolio deposit or mortgage prepay');
          failed = true;
        } else {
          const lifestyleState = createInitialState({
            companyName: 'LifestyleCo',
            categoryId: 'b2b-saas',
            mode: 'sandbox'
          });
          lifestyleState.ceo.bankBalance = 300_000;
          const gym = purchaseCeoLifestyle(lifestyleState, 'premium-gym');
          const car = purchaseCeoLifestyle(lifestyleState, 'electric-sedan');
          const carClash = purchaseCeoLifestyle(lifestyleState, 'sports-car');
          const resale = sellCeoLifestyle(lifestyleState, 'electric-sedan');
          if (!gym.ok || ceoLifestyleMonthlyDebit(lifestyleState) !== 380) {
            console.error(`FAIL: CEO lifestyle purchase: ${gym.reason ?? 'debit bump'}`);
            failed = true;
          } else if (!car.ok || carClash.ok) {
            console.error('FAIL: CEO lifestyle exclusive vehicle group');
            failed = true;
          } else if (!resale.ok || resale.proceeds <= 0) {
            console.error(`FAIL: CEO lifestyle resale: ${resale.reason ?? 'proceeds'}`);
            failed = true;
          } else if (ceoLifestyleLifetimeSpend(lifestyleState) !== 4200 + 78000) {
            console.error('FAIL: CEO lifestyle lifetime spend');
            failed = true;
          } else {
            console.log(
              `OK: CEO tab (sell home ${formatMoney(sold.proceeds)}, portfolio ${formatMoney(investState.ceo.investmentBalance)}, mortgage prepay, lifestyle debits ${formatMoney(ceoLifestyleMonthlyDebit(lifestyleState))}/mo)`
            );
          }
        }
      }
    }
  }
}

const { heuristicStaffingPlan, applyStaffingDraftPlan } = await import(
  `file://${join(sim, 'modules/StaffingPlanner.js')}`
);
const staffPlanState = createInitialState({ companyName: 'StaffPlan Co', categoryId: 'b2b-saas', mode: 'sandbox' });
staffPlanState.workspace.tier = WORKSPACE_TIER.MEDIUM;
staffPlanState.workspace.mediumOfficeOwned = true;
staffPlanState.stage = STAGES.OFFICE;
staffPlanState.finance.cash = 500_000;
staffPlanState.calendar.monthRevenue = 80_000;
staffPlanState.staff.draftHeadcountByDept = { ...emptyHeadcount(), engineering: 2, sales: 1, product: 1 };
staffPlanState.staff.headcountByDept = { ...staffPlanState.staff.draftHeadcountByDept };
const growPlan = heuristicStaffingPlan(staffPlanState, 'increase');
if (!growPlan.ok || totalHeadcount(growPlan.headcountByDept) <= totalHeadcount(staffPlanState.staff.draftHeadcountByDept)) {
  console.error(`FAIL: staffing increase heuristic: ${growPlan.reason ?? 'no growth'}`);
  failed = true;
} else {
  applyStaffingDraftPlan(staffPlanState, growPlan.headcountByDept);
  console.log(`OK: staffing auto-increase (${totalHeadcount(staffPlanState.staff.draftHeadcountByDept)} draft HC)`);
}

const shrinkState = createInitialState({ companyName: 'StaffCut Co', categoryId: 'b2b-saas', mode: 'sandbox' });
shrinkState.workspace.tier = WORKSPACE_TIER.SMALL;
shrinkState.stage = STAGES.OFFICE;
shrinkState.calendar.monthRevenue = 5_000;
shrinkState.staff.draftHeadcountByDept = { ...emptyHeadcount(), engineering: 8, sales: 6, marketing: 4, support: 3 };
const shrinkPlan = heuristicStaffingPlan(shrinkState, 'decrease');
const priorShrink = totalHeadcount(shrinkState.staff.draftHeadcountByDept);
if (!shrinkPlan.ok || totalHeadcount(shrinkPlan.headcountByDept) >= priorShrink) {
  console.error(`FAIL: staffing decrease heuristic: ${shrinkPlan.reason ?? 'no cuts'}`);
  failed = true;
} else {
  console.log(`OK: staffing auto-decrease (${priorShrink} → ${totalHeadcount(shrinkPlan.headcountByDept)} suggested)`);
}

if (DEPARTMENTS.length < 15) {
  console.error(`FAIL: expected 15 departments, got ${DEPARTMENTS.length}`);
  failed = true;
} else {
  const keys = Object.keys(emptyHeadcount());
  if (keys.length !== DEPARTMENTS.length || DEPARTMENTS.some((d) => !keys.includes(d.id))) {
    console.error('FAIL: emptyHeadcount keys must match DEPARTMENTS ids');
    failed = true;
  } else {
    const officeState = createInitialState({ companyName: 'DeptUnlock', categoryId: 'b2b-saas', mode: 'sandbox' });
    officeState.workspace.tier = WORKSPACE_TIER.SMALL;
    officeState.stage = STAGES.OFFICE;
    const open = visibleDepartments(officeState.stage, officeState).length;
    if (open < 7) {
      console.error(`FAIL: office-tier should unlock core departments (got ${open} open)`);
      failed = true;
    } else {
      const legacyState = createInitialState({ companyName: 'LegacyHC', categoryId: 'b2b-saas', mode: 'sandbox' });
      legacyState.staff.headcountByDept = { engineering: 2, sales: 1 };
      legacyState.staff.draftHeadcountByDept = { engineering: 2, sales: 1 };
      migrateStaffHeadcount(legacyState);
      if (Object.keys(legacyState.staff.headcountByDept).length !== DEPARTMENTS.length) {
        console.error('FAIL: migrateStaffHeadcount should backfill all department keys');
        failed = true;
      } else {
        const research = DEPARTMENTS.find((d) => d.id === 'research');
        officeState.flags.seriesAClosed = false;
        if (isDepartmentUnlocked(research, officeState)) {
          console.error('FAIL: R&D should require Series A');
          failed = true;
        } else {
          console.log(`OK: departments (${DEPARTMENTS.length}, ${open} open at office tier)`);
        }
      }
    }
  }
}

const { workspaceRentMonthly } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
const { tickAnnualFacilitiesAtMonthStart } = await import(
  `file://${join(sim, 'modules/FacilitiesEconomics.js')}`
);
const { HOUSING_MODE } = await import(`file://${join(sim, 'modules/CeoLifestyle.js')}`);
const { setFinanceSection, activeFinanceSection } = await import(
  `file://${join(sim, 'modules/PublicMarkets.js')}`
);

const rentEscState = createInitialState({ companyName: 'Rent Esc', categoryId: 'b2b-saas', mode: 'sandbox' });
rentEscState.workspace.tier = WORKSPACE_TIER.SMALL;
rentEscState.workspace.smallOfficeOwned = true;
rentEscState.meta.calendarStartYear = 1;
rentEscState.meta.calendarStartMonth = 1;
rentEscState.calendar.year = 2;
rentEscState.calendar.monthIndex = 1;
if (calendarTurn(rentEscState) <= 1) {
  console.error('FAIL: rent escalation fixture should be past founding month');
  failed = true;
} else {
  const rentBefore = workspaceRentMonthly(rentEscState);
  const escLines = tickAnnualFacilitiesAtMonthStart(rentEscState);
  const rentAfter = workspaceRentMonthly(rentEscState);
  if (escLines.length === 0 || rentAfter <= rentBefore) {
    console.error(`FAIL: annual rent escalation (${rentBefore} → ${rentAfter})`);
    failed = true;
  } else {
    rentEscState.finance.hubRentMonthly = 100_000;
    rentEscState.offices.hubId = 'sf';
    rentEscState.workspace.tier = WORKSPACE_TIER.HUB;
    const hubBefore = workspaceRentMonthly(rentEscState);
    rentEscState.calendar.year = 3;
    rentEscState.finance.lastRentEscalationYear = 2;
    tickAnnualFacilitiesAtMonthStart(rentEscState);
    const hubAfter = workspaceRentMonthly(rentEscState);
    if (hubAfter <= hubBefore) {
      console.error(`FAIL: hub rent escalation (${hubBefore} → ${hubAfter})`);
      failed = true;
    } else {
      console.log('OK: annual rent escalation (HQ + hub)');
    }
  }
}

const homeEscState = createInitialState({ companyName: 'Home Esc', categoryId: 'b2b-saas', mode: 'sandbox' });
homeEscState.meta.calendarStartYear = 1;
homeEscState.meta.calendarStartMonth = 1;
homeEscState.calendar.year = 2;
homeEscState.calendar.monthIndex = 1;
homeEscState.ceo.housing = {
  mode: HOUSING_MODE.OWNED,
  tierId: 'penthouse',
  purchasePrice: 1_000_000,
  costBasis: 1_000_000,
  mortgageBalance: 0
};
tickAnnualFacilitiesAtMonthStart(homeEscState);
if ((homeEscState.ceo.housing.purchasePrice ?? 0) <= 1_000_000) {
  console.error('FAIL: CEO home annual appreciation');
  failed = true;
} else {
  console.log('OK: CEO home annual appreciation');
}

setFinanceSection({ finance: {} }, 'treasury');
if (activeFinanceSection({ finance: { section: 'treasury' } }) !== 'treasury') {
  console.error('FAIL: finance treasury section');
  failed = true;
} else {
  const { renderFinanceTreasuryPanel, treasuryObligationsSummary } = await import(
    `file://${join(sim, 'modules/FacilitiesEconomics.js')}`
  );
  const { renderFinanceSummary } = await import(`file://${join(sim, 'modules/Finance.js')}`);
  const treasuryState = createInitialState({ companyName: 'Treasury UI', categoryId: 'b2b-saas', mode: 'sandbox' });
  treasuryState.workspace.tier = WORKSPACE_TIER.SMALL;
  treasuryState.workspace.smallOfficeOwned = true;
  treasuryState.finance.arr = 500_000;
  treasuryState.finance.mrr = 40_000;
  const html = renderFinanceTreasuryPanel(treasuryState, {
    sum: renderFinanceSummary(treasuryState),
    creditBlocksHtml: ''
  });
  const ob = treasuryObligationsSummary(treasuryState);
  if (
    !html.includes('Recurring obligations') ||
    !html.includes('Corporate liquidity') ||
    ob.rent.hqEffective <= 0
  ) {
    console.error('FAIL: treasury panel content');
    failed = true;
  } else {
    console.log('OK: finance treasury section');
  }
}

const {
  preloadTreasurySponsorshipDeals,
  signTreasurySponsorship,
  settleTreasurySponsorshipsAtMonthEnd,
  sponsoredMrrMonthly,
  renewTreasurySponsorship,
  sponsorshipBookSummary,
  tickSponsorshipEscalationAtMonthStart
} = await import(`file://${join(sim, 'modules/TreasurySponsorships.js')}`);
await preloadTreasurySponsorshipDeals();
const sponsorState = createInitialState({
  companyName: 'Sponsor Co',
  categoryId: 'b2b-saas',
  mode: 'sandbox'
});
sponsorState.flags.seedRoundClosed = true;
sponsorState.finance.cash = 500_000_000;
sponsorState.finance.mrr = 5_000_000;
sponsorState.finance.arr = 60_000_000;
const signConf = signTreasurySponsorship(sponsorState, 'nra-stadium-flagship');
const active = sponsorState.treasurySponsorships?.active?.[0];
const grantPace = active?.monthlyGrant ?? 0;
const totalRev = active?.totalRevenueCommit ?? 0;
if (!signConf.ok) {
  console.error(`FAIL: sign sponsorship: ${signConf.reason}`);
  failed = true;
} else if (totalRev < 50_000_000 || totalRev > 101_000_000) {
  console.error(`FAIL: sponsorship total revenue expected ~50-100M on 48M upfront, got ${totalRev}`);
  failed = true;
} else if (grantPace <= 0 || Math.abs(grantPace * 60 - totalRev) > 60_000) {
  console.error('FAIL: sponsorship grant pace vs total revenue');
  failed = true;
} else if (sponsorState.finance.cash > 500_000_000 - 48_000_000 - 2_500_000 + 1_000_000) {
  console.error('FAIL: sponsorship upfront fee not debited from cash');
  failed = true;
} else {
  sponsorState.calendar.monthRevenue = 100_000;
  const revBefore = sponsorState.calendar.monthRevenue;
  const lines = settleTreasurySponsorshipsAtMonthEnd(sponsorState);
  if (lines.length === 0 || sponsorState.calendar.monthRevenue !== revBefore + grantPace) {
    console.error('FAIL: sponsorship month-end revenue recognition');
    failed = true;
  } else {
    const book = sponsorshipBookSummary(sponsorState);
    if (book.remainingMrrMonths <= 0) {
      console.error('FAIL: sponsorship book remaining revenue');
      failed = true;
    } else {
      sponsorState.treasurySponsorships.active[0].monthsRemaining = 2;
      const renew = renewTreasurySponsorship(sponsorState, 'nra-stadium-flagship');
      if (!renew.ok || sponsorState.treasurySponsorships.active[0].monthsRemaining !== 14) {
        console.error(`FAIL: sponsorship renewal: ${renew.reason ?? 'months'}`);
        failed = true;
      } else {
        const { advanceRealCalendarMonth } = await import(
          `file://${join(sim, 'modules/GameCalendar.js')}`
        );
        for (let i = 0; i < 14; i++) advanceRealCalendarMonth(sponsorState);
        while (sponsorState.calendar.monthIndex !== 1) advanceRealCalendarMonth(sponsorState);
        if (calendarTurn(sponsorState) <= 1) {
          console.error('FAIL: sponsorship escalation calendar turn');
          failed = true;
        } else {
          sponsorState.treasurySponsorships.lastEscalationYear = null;
          const before = sponsorState.treasurySponsorships.active[0].monthlyGrant;
          tickSponsorshipEscalationAtMonthStart(sponsorState);
          if (sponsorState.treasurySponsorships.active[0].monthlyGrant <= before) {
            console.error('FAIL: sponsorship January revenue index');
            failed = true;
          } else {
            console.log('OK: treasury sponsorship (upfront fee, contracted revenue, renew, index)');
          }
        }
      }
    }
  }
}

{
  const {
    preloadCeoAlmaMaterCatalog,
    donateToAlmaMater,
    donateToAlmaMaterAthletics,
    alumniRecognitionLabel,
    athleticsBoosterLabel,
    getAlmaMaterCatalogCount,
    getAlmaMaterById
  } = await import(`file://${join(sim, 'modules/CeoAlumniGiving.js')}`);
  await preloadCeoAlmaMaterCatalog();
  if (getAlmaMaterCatalogCount() < 120 || !getAlmaMaterById('maryville-college')) {
    console.error('FAIL: alma mater catalog (expected 120+ schools incl. Maryville College)');
    failed = true;
  }
  const alumniState = createInitialState({
    companyName: 'Alumni Co',
    categoryId: 'b2b-saas',
    mode: 'sandbox',
    almaMaterId: 'maryville-college'
  });
  alumniState.ceo.bankBalance = 200_000;
  const gift = donateToAlmaMater(alumniState, 25_000, 'annual-fund');
  if (alumniState.company.almaMaterId !== 'maryville-college') {
    console.error('FAIL: alma mater not stored on company');
    failed = true;
  } else if (!gift.ok || alumniState.ceo.alumniGivingLifetime !== 25_000) {
    console.error(`FAIL: CEO alumni donation: ${gift.reason ?? 'amount'}`);
    failed = true;
  } else if (alumniRecognitionLabel(alumniState.ceo.alumniGivingLifetime) !== 'Annual fund donor') {
    console.error('FAIL: CEO alumni recognition tier');
    failed = true;
  } else {
    const athleticsGift = donateToAlmaMaterAthletics(alumniState, 50_000, 'boosters');
    if (
      !athleticsGift.ok ||
      alumniState.ceo.alumniAthleticsLifetime !== 50_000 ||
      alumniState.ceo.alumniGivingLifetime !== 75_000 ||
      athleticsBoosterLabel(alumniState.ceo.alumniAthleticsLifetime) !== 'Varsity booster club'
    ) {
      console.error(`FAIL: CEO athletics alumni donation: ${athleticsGift.reason ?? 'amount/tiers'}`);
      failed = true;
    } else {
      console.log('OK: CEO alma mater alumni giving (incl. athletics funding)');
    }
  }
}

{
  const {
    preloadCeoWlbCatalog,
    dealCeoWlbOffers,
    completeCeoWlbTask,
    personalHappinessScore,
    getCeoWlbCatalogCount,
    getCeoWlbTaskById
  } = await import(`file://${join(sim, 'modules/CeoHappiness.js')}`);
  await preloadCeoWlbCatalog();
  if (getCeoWlbCatalogCount() < 75) {
    console.error('FAIL: CEO WLB task catalog (expected 75+ handcrafted tasks)');
    failed = true;
  } else {
    const wlbState = createInitialState({
      companyName: 'Balance Co',
      categoryId: 'b2b-saas',
      mode: 'sandbox'
    });
    wlbState.ceo.bankBalance = 50_000;
    const before = personalHappinessScore(wlbState);
    dealCeoWlbOffers(wlbState);
    const offers = wlbState.ceo.wlbOffers ?? [];
    if (offers.length !== 4) {
      console.error(`FAIL: CEO WLB monthly offers (expected 4, got ${offers.length})`);
      failed = true;
    } else {
      const tags = new Set(
        offers.map((o) => getCeoWlbTaskById(o.taskId)?.tag ?? 'Balance')
      );
      if (tags.size < 3) {
        console.error('FAIL: CEO WLB offers should span diverse tags');
        failed = true;
      }
    }
    const offerId = wlbState.ceo.wlbOffers?.[0]?.taskId;
    if (!offerId) {
      console.error('FAIL: CEO WLB monthly offers');
      failed = true;
    } else {
      const done = completeCeoWlbTask(wlbState, offerId);
      if (!done.ok || personalHappinessScore(wlbState) <= before) {
        console.error(`FAIL: CEO WLB task completion: ${done.reason ?? 'happiness'}`);
        failed = true;
      } else if ((wlbState.ceo.wlbLifetimeCompleted ?? 0) !== 1) {
        console.error('FAIL: CEO WLB lifetime completion counter');
        failed = true;
      } else {
        wlbState.ceo.wlbStreakMonths = 3;
        dealCeoWlbOffers(wlbState);
        const streakOffer = wlbState.ceo.wlbOffers?.find((o) => !o.completed)?.taskId;
        if (streakOffer) {
          const streakDone = completeCeoWlbTask(wlbState, streakOffer);
          if (!streakDone.ok || !String(streakDone.summary ?? '').includes('streak')) {
            console.error('FAIL: CEO WLB streak bonus on completion');
            failed = true;
          }
        }
        if (!failed) console.log('OK: CEO personal happiness & work-life balance tasks');
      }
    }
  }
}

{
  const {
    saveStartupConferenceConfig,
    tickStartupConferenceAtMonthStart,
    CONFERENCE_KEYNOTE_TASK_ID
  } = await import(`file://${join(sim, 'modules/StartupConference.js')}`);
  const { dealMonthlyTasks, getEligibleDeskTasks, confirmTaskLineup } = await import(
    `file://${join(sim, 'modules/Tasks.js')}`
  );
  const confState = createInitialState({
    companyName: 'Conf Co',
    categoryId: 'b2b-saas',
    mode: 'sandbox'
  });
  confState.flags.seedRoundClosed = true;
  confState.flags.xcResidencyComplete = true;
  confState.stage = 'post_xc';
  confState.finance.cash = 2_000_000;
  confState.finance.arr = 2_000_000;
  confState.finance.mrr = Math.round(2_000_000 / 12);
  const saved = saveStartupConferenceConfig(confState, {
    name: 'Nexus Summit',
    budgetRaw: 350_000,
    monthIndexRaw: 6,
    sponsorTier: 'flagship',
    ticketTier: 'paid'
  });
  if (!saved.ok) {
    console.error(`FAIL: save startup conference: ${saved.reason}`);
    failed = true;
  } else {
    confState.calendar.monthIndex = 6;
    const start = tickStartupConferenceAtMonthStart(confState);
    const expectedCharge = Math.round(350_000 * 1.38);
    if (start.budgetCharge !== expectedCharge || confState.startupConference.budgetPaidYear !== confState.calendar.year) {
      console.error(`FAIL: startup conference budget charge at month start (got ${start.budgetCharge}, want ${expectedCharge})`);
      failed = true;
    } else {
      dealMonthlyTasks(confState);
      const pool = getEligibleDeskTasks(confState);
      if (!pool.length || pool.some((t) => !t.startupConference && !t.taxFiling && !t.ceoPersonalTaxFiling)) {
        console.error('FAIL: conference month desk pool should be conference tasks only');
        failed = true;
      } else if (!pool.some((t) => t.id === CONFERENCE_KEYNOTE_TASK_ID)) {
        console.error('FAIL: conference month desk pool must include mandatory keynote task');
        failed = true;
      } else {
        const offers = confState.calendar.monthTaskOffers ?? [];
        if (!offers.some((o) => o.taskId === CONFERENCE_KEYNOTE_TASK_ID)) {
          console.error('FAIL: conference month offers must include mandatory keynote');
          failed = true;
        } else {
          const slots = confState.calendar.monthTaskSlotTarget ?? 3;
          for (const o of offers) o.selected = false;
          let picked = 0;
          for (const o of offers) {
            if (o.taskId === CONFERENCE_KEYNOTE_TASK_ID) continue;
            if (picked >= slots) break;
            o.selected = true;
            picked += 1;
          }
          const withoutKeynote = confirmTaskLineup(confState);
          if (withoutKeynote.ok || !String(withoutKeynote.reason || '').includes('keynote')) {
            console.error('FAIL: lineup should require main stage keynote');
            failed = true;
          } else {
            for (const o of offers) o.selected = false;
            picked = 0;
            for (const o of offers) {
              if (picked >= slots) break;
              o.selected = true;
              picked += 1;
            }
            if (!confirmTaskLineup(confState).ok) {
              console.error('FAIL: lineup with keynote should lock');
              failed = true;
            } else {
              console.log('OK: startup conference (schedule, budget, conference-only desk, mandatory keynote)');
            }
          }
        }
      }
    }
  }
}

{
  const {
    preloadFinancePropertyPrograms,
    acquireFinanceProperty,
    propertyHoldingsSummary,
    propertyRevenueMultBonus,
    tickFinancePropertyAtMonthStart
  } = await import(`file://${join(sim, 'modules/FinanceProperty.js')}`);
  await preloadFinancePropertyPrograms();
  const aiState = createInitialState({
    companyName: 'GPU Co',
    categoryId: 'ai-tools',
    mode: 'sandbox'
  });
  aiState.flags.seedRoundClosed = true;
  aiState.finance.cash = 50_000_000;
  aiState.finance.mrr = 50_000;
  aiState.finance.arr = 600_000;
  const bought = acquireFinanceProperty(aiState, { tierId: 'ai-tools-edge-pod', quantityRaw: 2 });
  if (!bought.ok) {
    console.error(`FAIL: finance property acquire (ai): ${bought.reason}`);
    failed = true;
  } else if (propertyHoldingsSummary(aiState).totalUnits !== 2) {
    console.error('FAIL: finance property holdings count');
    failed = true;
  } else if (propertyRevenueMultBonus(aiState) <= 0) {
    console.error('FAIL: finance property revenue mult bonus');
    failed = true;
  } else {
    const edState = createInitialState({
      companyName: 'Learn Co',
      categoryId: 'edtech',
      mode: 'sandbox'
    });
    edState.flags.seedRoundClosed = true;
    edState.finance.cash = 5_000_000;
    edState.finance.mrr = 30_000;
    edState.finance.arr = 360_000;
    const emo = acquireFinanceProperty(edState, { tierId: 'edtech-virtual-charter', quantityRaw: 1 });
    if (!emo.ok) {
      console.error(`FAIL: finance property acquire (edtech): ${emo.reason}`);
      failed = true;
    } else {
      const mrrAfterBuy = edState.finance.mrr;
      tickFinancePropertyAtMonthStart(edState);
      tickFinancePropertyAtMonthStart(edState);
      if (edState.finance.mrr !== mrrAfterBuy) {
        console.error('FAIL: property contracted MRR should not stack each month');
        failed = true;
      } else if ((edState.financeProperty?.lifetimeContractedCash ?? 0) < 18500) {
        console.error('FAIL: property contracted cash yield at month start');
        failed = true;
      } else {
        const gated = acquireFinanceProperty(edState, { tierId: 'edtech-regional-emo', quantityRaw: 1 });
        if (gated.ok) {
          console.error('FAIL: edtech regional EMO should require virtual charters');
          failed = true;
        } else {
          console.log('OK: finance property (category tiers, capex, rev× / EMO MRR)');
        }
      }
    }
  }
}

process.exit(failed ? 1 : 0);
