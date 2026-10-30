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
  const base = `You are the unseen narrator of "House of Strategy", a Big Brother-style social strategy game.
Write ONE short feed line (1-3 sentences, under 280 characters). No markdown. No spoilers beyond the context.
Do not invent evictions or wins that are not in context. Stay dramatic but plausible.`;

  const ctx = JSON.stringify(context, null, 0);

  if (kind === 'host_line') {
    return `${base}\nKind: Julie Chen-style host line before a live event.\nContext: ${ctx}`;
  }
  if (kind === 'week_recap') {
    return `${base}\nKind: End-of-week recap voiceover.\nContext: ${ctx}`;
  }
  return `${base}\nKind: Daily house drama or strategy beat during social time.\nContext: ${ctx}`;
}

async function callOpenAI(apiKey, kind, context) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = buildPrompt(kind, context);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      max_tokens: 120,
      messages: [
        { role: 'system', content: 'You write punchy reality-TV narration.' },
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
    const text = await callOpenAI(apiKey, kind, context);
    return json(200, { text, type: 'narrative' }, event);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Narrative generation failed';
    return json(503, { error: message }, event);
  }
}
