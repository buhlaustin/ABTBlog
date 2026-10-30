import {
  GetSecretValueCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';

const secrets = new SecretsManagerClient({});
let cachedApiKey = null;
const rateByIp = new Map();

const MAX_BODY_BYTES = 12_000;
const MAX_REQUESTS_PER_MINUTE = 20;

function corsOrigin(event) {
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (allowed.includes(origin)) return origin;
  return allowed[0] || '*';
}

function json(statusCode, body, event, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': corsOrigin(event),
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function isAllowedOrigin(event) {
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;

  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (allowed.includes(origin)) return true;

  const referer = event.headers?.referer || event.headers?.Referer || '';
  return allowed.some((base) => referer.startsWith(base));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = rateByIp.get(ip) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  rateByIp.set(ip, bucket);
  return bucket.count <= MAX_REQUESTS_PER_MINUTE;
}

async function loadOpenAiKey() {
  if (cachedApiKey) return cachedApiKey;
  const secretId = process.env.OPENAI_SECRET_ARN || process.env.OPENAI_SECRET_NAME;
  if (!secretId) {
    throw new Error('OPENAI_SECRET_ARN not configured');
  }
  const res = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
  const raw = res.SecretString || '';
  try {
    const parsed = JSON.parse(raw);
    cachedApiKey = parsed.OPENAI_API_KEY || parsed.openai_api_key || parsed.apiKey || raw;
  } catch {
    cachedApiKey = raw;
  }
  if (!cachedApiKey || cachedApiKey.includes('REPLACE_ME')) {
    throw new Error('OpenAI API key not set in Secrets Manager');
  }
  return cachedApiKey;
}

function buildPrompt(kind, context) {
  const ctx = JSON.stringify(context, null, 0);

  if (kind === 'eer_daily_inbox') {
    return `You write satirical corporate crisis emails for "Executive Email Roulette".
The player is interim CEO. Return ONLY valid JSON (no markdown fences) with this shape:
{"emails":[{"subject":"...","from":"Name · Title","body":"2-4 sentences","choices":[{"label":"short button text","effects":{"stock":0,"board":0,"morale":0,"cash":0}},{"label":"...","effects":{...}}]}]}
Rules: exactly 5 emails, exactly 2 choices each. effects are integers from -18 to +18 (at least one non-zero per choice).
Themes: HR disasters, activist investors, leaks, eccentric founder, regulators, viral tweets, AI hype, layoffs.
Match difficulty to day number in context. Do not repeat subjects from recentSubjects in context.
Context: ${ctx}`;
  }

  if (kind === 'eer_ouster_line') {
    return `Write ONE darkly funny boardroom ouster headline (under 200 chars) for "Executive Email Roulette".
No markdown. Context: ${ctx}`;
  }

  const base = `You are the unseen narrator of "House of Strategy", a Big Brother-style social strategy game.
Write ONE short feed line (1-3 sentences, under 280 characters). No markdown. No spoilers beyond the context.
Do not invent evictions or wins that are not in context. Stay dramatic but plausible.`;

  if (kind === 'host_line') {
    return `${base}\nKind: Julie Chen-style host line before a live event.\nContext: ${ctx}`;
  }
  if (kind === 'week_recap') {
    return `${base}\nKind: End-of-week recap voiceover.\nContext: ${ctx}`;
  }
  return `${base}\nKind: Daily house drama or strategy beat during social time.\nContext: ${ctx}`;
}

function parseEerInbox(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in EER response');
  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  if (!Array.isArray(parsed.emails) || parsed.emails.length < 1) {
    throw new Error('Invalid EER inbox shape');
  }
  return parsed.emails.slice(0, 5).map(normalizeEerEmail);
}

function normalizeEerEmail(raw) {
  const choices = (raw.choices || []).slice(0, 2).map((c) => ({
    label: String(c.label || 'Reply').slice(0, 80),
    effects: normalizeEffects(c.effects)
  }));
  while (choices.length < 2) {
    choices.push({
      label: choices.length === 0 ? 'Ignore' : 'Forward to legal',
      effects: { stock: 0, board: -2, morale: 0, cash: 0 }
    });
  }
  return {
    subject: String(raw.subject || 'Urgent: Need your call').slice(0, 120),
    from: String(raw.from || 'Unknown Sender').slice(0, 80),
    body: String(raw.body || 'We need a decision before the market opens.').slice(0, 600),
    choices
  };
}

function normalizeEffects(effects) {
  const keys = ['stock', 'board', 'morale', 'cash'];
  const out = {};
  for (const k of keys) {
    const n = Number(effects?.[k] ?? 0);
    out[k] = Number.isFinite(n) ? Math.max(-18, Math.min(18, Math.round(n))) : 0;
  }
  return out;
}

async function callOpenAI(apiKey, kind, context) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = buildPrompt(kind, context);
  const isEerInbox = kind === 'eer_daily_inbox';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: isEerInbox ? 0.9 : 0.85,
      max_tokens: isEerInbox ? 2200 : 120,
      messages: [
        {
          role: 'system',
          content: isEerInbox
            ? 'You write sharp corporate satire as strict JSON only.'
            : kind.startsWith('eer_')
              ? 'You write sharp corporate satire.'
              : 'You write punchy reality-TV narration.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty OpenAI response');
  if (kind === 'eer_daily_inbox') {
    return parseEerInbox(text);
  }
  return text.replace(/^["']|["']$/g, '');
}

export async function handler(event) {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return json(204, {}, event);
  }

  if (!isAllowedOrigin(event)) {
    return json(403, { error: 'Origin not allowed' }, event);
  }

  const ip = event.requestContext?.http?.sourceIp || 'unknown';
  if (!checkRateLimit(ip)) {
    return json(429, { error: 'Rate limit exceeded' }, event);
  }

  const bodyRaw = event.body || '';
  if (Buffer.byteLength(bodyRaw, 'utf8') > MAX_BODY_BYTES) {
    return json(413, { error: 'Payload too large' }, event);
  }

  let payload;
  try {
    payload = JSON.parse(event.isBase64Encoded ? Buffer.from(bodyRaw, 'base64').toString('utf8') : bodyRaw);
  } catch {
    return json(400, { error: 'Invalid JSON body' }, event);
  }

  const kind = payload.kind || 'daily_beat';
  const context = payload.context;
  if (!context || typeof context !== 'object') {
    return json(400, { error: 'Missing context object' }, event);
  }

  try {
    const apiKey = await loadOpenAiKey();
    const result = await callOpenAI(apiKey, kind, context);
    if (kind === 'eer_daily_inbox') {
      return json(200, { emails: result, type: 'eer_inbox' }, event);
    }
    return json(200, { text: result, type: 'narrative' }, event);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Narrative generation failed';
    return json(503, { error: message }, event);
  }
}
