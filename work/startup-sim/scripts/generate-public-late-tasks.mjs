/**
 * 100 tier-7 public desk tasks — unique copy, original-scale economics (not billions).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outPath = join(dirname(fileURLToPath(import.meta.url)), '../data/tasks-public-late-game.json');

const entries = [
  ['Renew Fortune 100 platform deal', 'Legal redlines the size of a phone book; procurement still wants 3% off.'],
  ['Close federal RFP tranche', 'Compliance docs, pen tests, and a demo that cannot drop Wi‑Fi.'],
  ['Upsell enterprise AI add-on', 'Customer already pays for seats; now they want “copilot everywhere.”'],
  ['Defend renewal against rival bake-off', 'Incumbent discount vs. your new roadmap slide deck.'],
  ['Launch analyst day dry run', 'IR coaches the CEO on saying “confident” without promising numbers.'],
  ['Ship public-sector reference win', 'Case study with enough redactions to look mysterious.'],
  ['Negotiate multi-year ELA', 'Legal wants five years; customer wants a one-year escape hatch.'],
  ['Run global pricing harmonization', 'Same SKU, twelve currencies, one angry CFO in France.'],
  ['Land healthcare system expansion', 'HIPAA packet, BAA signatures, and a go-live date that moved twice.'],
  ['Close media conglomerate pilot', 'POC success metric is “executives stopped emailing.”'],
  ['Expand telco edge deployment', 'Field engineers, SLAs, and a rival claiming they were “almost done.”'],
  ['Win retailer peak-season prep', 'Black Friday load test or bust; marketing wants logos early.'],
  ['Secure university system contract', 'Procurement via committee; students want SSO yesterday.'],
  ['Close automotive OEM tier-2 deal', 'Long cycle, longer security questionnaire.'],
  ['Renew insurance carrier book', 'Actuarial models meet your uptime chart.'],
  ['Land energy sector analytics pack', 'OT network approval took longer than the sale.'],
  ['Expand logistics partner network', 'API keys for partners who still email CSVs.'],
  ['Close hospitality chain rollout', 'Property managers care about tablets, not your architecture diagram.'],
  ['Win gaming publisher live-ops', 'Launch week traffic spikes are the only sermon they hear.'],
  ['Defend public-sector renewal', 'New commissioner, same budget, fresh RFP anyway.'],
  ['Upsell manufacturing MES bridge', 'Shop floor tablets finally talk to finance.'],
  ['Land pharma validation package', 'CSV docs and auditors who love checklists.'],
  ['Close airline loyalty integration', 'Miles, points, and a middleware team on both sides.'],
  ['Expand neobank feature bundle', 'Regulators peek over the fence; ship anyway.'],
  ['Renew SaaS reseller agreement', 'Channel margin fight with a partner who also resells your rival.'],
  ['Win municipal open-data portal', 'Press release drafted before procurement finishes.'],
  ['Land defense subcontract scope', 'Clearance paperwork slower than the product roadmap.'],
  ['Close sports league stats deal', 'Real-time feeds; fans complain on Twitter if you lag.'],
  ['Expand payment processor rails', 'Chargebacks, disputes, and a fraud model update.'],
  ['Renew HR platform global seats', 'Payroll cutover weekend — nobody sleeps.'],
  ['Win edtech district-wide SSO', 'Parent emails, teacher training, and one broken Chromebook cart.'],
  ['Land CRE portfolio analytics', 'Owners want occupancy dashboards, not jargon.'],
  ['Close cybersecurity MSSP bundle', 'SOC handoff runbook thicker than the contract.'],
  ['Expand IoT fleet telemetry', 'Devices in the field that never get firmware updates.'],
  ['Defend media streaming renewal', 'Churn cohort slide saves the quarter.'],
  ['Upsell ad-tech clean room', 'Privacy lawyers finally nod in the same meeting.'],
  ['Win semiconductor yield module', 'Fab managers speak in acronyms; you learn fast.'],
  ['Close agricultural co-op order', 'Harvest season deadline beats your sprint planning.'],
  ['Renew legal tech matter sync', 'Partners trust redlines, not roadmaps.'],
  ['Land nonprofit grant reporting', 'Donors want impact metrics in plain English.'],
  ['Expand marketplace take-rate test', 'GMV up; sellers complain about fees on Discord.'],
  ['Close real-estate brokerage CRM', 'Agents want mobile; IT wants MDM.'],
  ['Win public transit mobile tickets', 'Riders want offline mode; ops wants fraud controls.'],
  ['Defend healthcare payer renewal', 'Claims volume spike after flu season.'],
  ['Land warehouse robotics API', 'Pick rates up when the robots stop arguing with WMS.'],
  ['Renew cybersecurity insurance attestation', 'Questionnaire answers become product requirements.'],
  ['Close consortium data share', 'Competitors share threat intel without sharing customers.'],
  ['Expand LATAM reseller mesh', 'Currency swings; contracts in USD anyway.'],
  ['Win APAC data residency pack', 'Local entity, local keys, local counsel bills.'],
  ['Land EU public tender slice', 'GDPR DPIA attached to every signature.'],
  ['Renew UK government G-Cloud', 'Framework paperwork is the real product.'],
  ['Close Middle East smart-city pilot', 'Heat, dust, and uptime SLAs in the same sentence.'],
  ['Expand Africa mobile-money bridge', 'SMS fallbacks save the demo.'],
  ['Win Canada privacy refactor', 'Bill C-something changed again; legal is calm (lying).'],
  ['Defend Japan keiretsu renewal', 'Relationship dinner > feature matrix.'],
  ['Land Korea chaebol PoC', 'Speed matters; translation matters more.'],
  ['Close Australia super-fund module', 'Retirement money moves slowly until it doesn’t.'],
  ['Renew Brazil tax compliance add-on', 'NF-e rules changed mid-quarter.'],
  ['Win India UPI volume tier', 'Spikes during festivals; infra team sweats.'],
  ['Expand Mexico nearshore support', 'Same time zone; better NPS scores.'],
  ['Close sovereign wealth LP meeting', 'They ask about capital efficiency, not buzzwords.'],
  ['Land pension fund risk dashboard', 'Board wants downside scenarios in charts.'],
  ['Renew endowment reporting suite', 'Quarterly letters quote your uptime footnote.'],
  ['Win family office portfolio view', 'They still print PDFs; you accommodate.'],
  ['Defend activist-adjacent renewal', 'Customer’s board drama becomes your QBR theme.'],
  ['Close spin-out carve-out deal', 'Parent company TSA ends; data migration begins.'],
  ['Expand PE portfolio roll-up', 'Same playbook, fifth acquisition this year.'],
  ['Land SPAC leftover cleanup', 'Reverse merger survivors need stable ARR stories.'],
  ['Renew post-merger integration kit', 'Two ERPs enter; one ERP leaves.'],
  ['Win divestiture day-one bundle', 'Stand up a mini-company over a weekend.'],
  ['Close joint venture revenue share', 'Lawyers pick the definition of “net.”'],
  ['Expand OEM white-label pack', 'Their brand on your uptime commitments.'],
  ['Land franchise analytics rollout', 'Store #1,247 still uses spreadsheets.'],
  ['Renew co-brand credit card perks', 'Points liability on someone else’s balance sheet.'],
  ['Win embedded finance SDK deal', 'Developers want copy-paste; compliance wants controls.'],
  ['Defend API platform renewal', 'Rate limits become a pricing lever.'],
  ['Close usage-based enterprise commit', 'True-up math gives finance nightmares.'],
  ['Expand consumption tier bridge', 'Credits expire; customer wants rollover anyway.'],
  ['Land mainframe connector maintenance', 'COBOL team retired; you are the bridge.'],
  ['Renew legacy ERP plugin', 'Still on-prem; still pays like clockwork.'],
  ['Win main vendor consolidation RFP', 'You replace three tools; inherit three grudges.'],
  ['Close board-requested cost takeout', 'Customer cuts vendors; you survive the cull.'],
  ['Expand customer success premium tier', 'White-glove team for accounts that email the CEO.'],
  ['Land professional services retainer', 'Statement of work vague; relationship strong.'],
  ['Renew training academy license', 'Certified admins renew more often.'],
  ['Win partner certification blitz', 'Badges on LinkedIn; pipeline in Slack.'],
  ['Defend low-code integrator renewal', 'Citizen developers built a monster; you tame it.'],
  ['Close SI global frame agreement', 'Big four partner puts you in every deck.'],
  ['Expand GSIs managed offering', 'They resell; you stay up at night anyway.'],
  ['Land boutique consultancy package', 'Niche industry slides that actually resonate.'],
  ['Renew VAR annual summit sponsorship', 'T-shirts, leads, and one awkward keynote photo.'],
  ['Win technology alliance press cycle', 'Joint blog post timed to earnings silence.'],
  ['Close patent cross-license fee', 'Legal settles; product ships.'],
  ['Expand open-source enterprise support', 'Community edition free; on-call is not.'],
  ['Land compliance automation audit', 'Controls mapped; auditors less grumpy.'],
  ['Renew ESG reporting connector', 'Scope 3 arguments converted to charts.'],
  ['Win supply-chain traceability pilot', 'Barcode scans become board slides.'],
  ['Defend quality recall readiness module', 'Hope you never need it; pay anyway.'],
  ['Close disaster recovery test week', 'Failover works; pizza for the war room.'],
  ['Expand zero-trust rollout tranche', 'Identity team finally owns the project.'],
  ['Land secrets rotation automation', 'Keys roll; nobody pages at 3 a.m. this time.'],
  ['Renew observability unified bill', 'Logs, metrics, traces — one invoice, one throat to choke.'],
  ['Win FinOps chargeback rollout', 'Engineers see cost tags; behavior shifts slowly.'],
  ['Close internal developer portal phase', 'Golden paths reduce Slack “how do I deploy?”'],
  ['Expand platform engineering guild', 'Paved roads; teams still off-road sometimes.'],
  ['Land AI governance committee win', 'Model cards attached to every release note.'],
  ['Renew responsible-AI attestation', 'Bias tests documented; PR calm for a week.'],
  ['Win public earnings demo prep', 'Feature flagged for the call; nothing unrehearsed.'],
  ['Defend shareholder question dry run', 'IR scripts answers for “why this metric?”'],
  ['Close index inclusion readiness', 'Liquidity story matches the product story.'],
  ['Expand institutional roadshow week', 'Same deck, twelve cities, zero sleep.']
];

const typeSets = [
  ['sales'],
  ['sales', 'marketing'],
  ['product', 'sales'],
  ['marketing'],
  ['research', 'sales']
];

const tasks = entries.map(([title, description], i) => {
  const n = String(i + 1).padStart(3, '0');
  const tier = 7;
  const revMin = 90_000 + (i % 17) * 35_000;
  const revMax = Math.min(2_800_000, revMin + 180_000 + (i % 9) * 95_000);
  return {
    id: `public-late-${n}`,
    title,
    description,
    types: typeSets[i % typeSets.length],
    stages: ['public'],
    tierMin: tier,
    tierMax: tier,
    cost: 8_000 + (i % 14) * 6_500,
    revenue: [revMin, revMax],
    product: i % 4 === 0 ? 1 : 0,
    buzz: 1 + (i % 4),
    stockPct: i % 5 === 0 ? Number((0.008 + (i % 3) * 0.006).toFixed(3)) : undefined
  };
}).map((t) => {
  if (t.stockPct == null) delete t.stockPct;
  return t;
});

writeFileSync(outPath, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf8');
console.log(`Wrote ${tasks.length} tasks to ${outPath}`);
