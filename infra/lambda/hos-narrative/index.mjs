import {
  GetSecretValueCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';

const secrets = new SecretsManagerClient({});
let cachedApiKey = null;
const rateByIp = new Map();

const MAX_BODY_BYTES = 12_000;
const MAX_REQUESTS_PER_MINUTE = 20;

function allowedOriginsList() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '';
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

function corsOrigin(event) {
  const allowed = allowedOriginsList();
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (allowed.includes(origin)) return origin;
  return allowed[0] || '*';
}

function json(statusCode, body, event, extraHeaders = {}) {
  // CORS is handled by Lambda Function URL Cors config — do not duplicate ACAO here.
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function isAllowedOrigin(event) {
  const allowed = allowedOriginsList();
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

  if (kind === 'startup_xc_interview_score') {
    return `You are a fictional X Combinator partner in the game "Startup Simulator". Score the founder's batch application.
Return ONLY valid JSON (no markdown): {"accepted":true|false,"score":0-100,"feedback":"one short encouraging sentence"}
Rules: Be LENIENT — this is a game, not real YC. Accept if answers show any real effort (≥2 substantive answers). Reject only if answers are empty or nonsense. score 65-95 on accept, 40-55 on reject.
Context: ${ctx}`;
  }

  if (kind === 'startup_news_month') {
    return `You write in-world news for the game "Startup Simulator". Return ONLY valid JSON:
{"articles":[{"headline":"...","dek":"...","body":"2-4 sentences","source":"parody outlet name","date":"Y# M#"}]}
Rules: exactly 3 or 4 articles. Use fictional/parody names (Macrohard, Financier Times, Chirp Business). NO real companies or living public figures. Mix world events from context.timelineEvents with reactions to the player's company snapshot. If layoffsPending>0 include one layoff story.
Context: ${ctx}`;
  }

  if (kind === 'startup_social_reactions') {
    return `You generate social reactions for Startup Simulator (ProNet/LinkedIn-like or Chirp/Twitter-like).
Return ONLY valid JSON: {"likes":number,"reposts":number,"comments":[{"author":"name","text":"under 200 chars"}]}
Rules: 1-3 comments, playful professional tone for pronet, punchy for chirp. Use persona names from context when fitting.
Context: ${ctx}`;
  }

  if (kind === 'startup_advisor_chat') {
    return `You are the founder's chief of staff in "Startup Simulator". Return ONLY valid JSON: {"reply":"under 120 words"}
Rules: Suggest in-game actions (Desk tasks, staffing, fundraising, runway). NOT real financial/legal advice. Use context.snapshot and recent messages.
Context: ${ctx}`;
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
  const isStartupJson = kind.startsWith('startup_');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: isEerInbox ? 0.9 : 0.85,
      max_tokens: isEerInbox
        ? 2200
        : kind === 'startup_news_month'
          ? 1800
          : isStartupJson
            ? 400
            : 120,
      messages: [
        {
          role: 'system',
          content: isEerInbox || isStartupJson
            ? 'You output strict JSON only for Startup Simulator and EER.'
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
  if (kind === 'startup_xc_interview_score') {
    return parseStartupXcScore(text);
  }
  if (kind === 'startup_news_month') {
    return parseStartupNews(text);
  }
  if (kind === 'startup_social_reactions') {
    return parseStartupSocial(text);
  }
  if (kind === 'startup_advisor_chat') {
    return parseStartupAdvisor(text);
  }
  return text.replace(/^["']|["']$/g, '');
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in response');
  return JSON.parse(trimmed.slice(start, end + 1));
}

function parseStartupNews(text) {
  const parsed = parseJsonObject(text);
  const articles = Array.isArray(parsed.articles) ? parsed.articles : [];
  return {
    articles: articles.slice(0, 4).map((a) => ({
      headline: String(a.headline ?? '').slice(0, 120),
      dek: String(a.dek ?? '').slice(0, 200),
      body: String(a.body ?? '').slice(0, 1200),
      source: String(a.source ?? 'Parody Wire').slice(0, 80),
      date: String(a.date ?? '').slice(0, 40)
    }))
  };
}

function parseStartupSocial(text) {
  const parsed = parseJsonObject(text);
  return {
    likes: Math.max(0, Math.min(999, Math.round(Number(parsed.likes) || 0))),
    reposts: Math.max(0, Math.min(999, Math.round(Number(parsed.reposts) || 0))),
    comments: (parsed.comments ?? []).slice(0, 5).map((c) => ({
      author: String(c.author ?? 'Anon').slice(0, 60),
      text: String(c.text ?? '').slice(0, 280)
    }))
  };
}

function parseStartupAdvisor(text) {
  const parsed = parseJsonObject(text);
  return { reply: String(parsed.reply ?? parsed.text ?? 'Focus on runway and counted tasks.').slice(0, 600) };
}

function parseStartupXcScore(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON in XC score response');
  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  return {
    accepted: Boolean(parsed.accepted),
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 70))),
    feedback: String(parsed.feedback || 'Thanks for applying.').slice(0, 280)
  };
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
    if (kind === 'startup_xc_interview_score') {
      return json(200, { ...result, type: 'startup_xc_score' }, event);
    }
    if (kind === 'startup_news_month') {
      return json(200, { ...result, type: 'startup_news' }, event);
    }
    if (kind === 'startup_social_reactions') {
      return json(200, { ...result, type: 'startup_social' }, event);
    }
    if (kind === 'startup_advisor_chat') {
      return json(200, { ...result, type: 'startup_advisor' }, event);
    }
    return json(200, { text: result, type: 'narrative' }, event);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Narrative generation failed';
    return json(503, { error: message }, event);
  }
}
