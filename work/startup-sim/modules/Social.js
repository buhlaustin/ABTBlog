import { fetchGameJson } from './utils.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildGameSnapshot, buildNarrativeContext } from './GameContext.js';
import { setGameFeedback } from './GameFeedback.js';
import bundledPersonas from '../data/personas.json' with { type: 'json' };

let personasCache = bundledPersonas.personas ?? [];
let personasHydrated = false;
export const CHIRP_LIMIT = 240;

export function createInitialSocial() {
  return {
    pronet: { posts: [] },
    chirp: { posts: [] },
    activeNetwork: 'pronet',
    archive: [],
    unreadFeedCount: 0
  };
}

/** Desk buzz → reach on feeds (likes/reposts and displayed followers). */
export function buzzEngagementMult(state) {
  const buzz = Math.max(0, state.product?.buzz ?? 0);
  return 1 + Math.min(2.5, buzz * 0.12);
}

export function socialFollowers(state, network) {
  const buzz = Math.max(0, state.product?.buzz ?? 0);
  const base = network === 'chirp' ? 140 : 95;
  const perBuzz = network === 'chirp' ? 90 : 58;
  return base + Math.floor(buzz * perBuzz);
}

function formatFollowerCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function scaleEngagement(state, likes, reposts) {
  const m = buzzEngagementMult(state);
  return {
    likes: Math.max(0, Math.round(likes * m)),
    reposts: Math.max(0, Math.round(reposts * m))
  };
}

function postList(state, network) {
  return network === 'chirp' ? state.social.chirp.posts : state.social.pronet.posts;
}

function countNpcPostsThisMonth(state) {
  const m = state.calendar.monthIndex;
  const y = state.calendar.year;
  let n = 0;
  for (const net of ['pronet', 'chirp']) {
    for (const p of postList(state, net)) {
      if (p.authorId === 'npc' && p.month === m && p.year === y) n += 1;
    }
  }
  return n;
}

export function refreshSocialUnread(state) {
  if (!state.social) state.social = createInitialSocial();
  state.social.unreadFeedCount = Math.min(12, countNpcPostsThisMonth(state));
}

export function markSocialAsRead(state) {
  if (!state.social) return;
  state.social.unreadFeedCount = 0;
}

export function unreadSocialCount(state) {
  return state.social?.unreadFeedCount ?? 0;
}

/** Tab badge + aria for new feed posts (mirrors News). */
export function syncSocialTabAlert(state) {
  if (typeof document === 'undefined') return;
  const tab = document.getElementById('tab-social');
  if (!tab) return;
  const n = unreadSocialCount(state);
  let badge = tab.querySelector('.tab-badge');
  if (n > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      badge.setAttribute('aria-hidden', 'true');
      tab.appendChild(badge);
    }
    badge.textContent = n > 9 ? '9+' : String(n);
    tab.setAttribute('aria-label', `Social, ${n} new post${n === 1 ? '' : 's'}`);
  } else {
    badge?.remove();
    tab.setAttribute('aria-label', 'Social');
  }
}

async function loadPersonas() {
  if (personasHydrated) return personasCache;
  try {
    const data = await fetchGameJson('data/personas.json');
    if (Array.isArray(data?.personas) && data.personas.length > 0) {
      personasCache = data.personas;
    }
  } catch {
    /* keep bundled personas */
  }
  personasHydrated = true;
  return personasCache;
}

export function preloadSocialPersonas() {
  return loadPersonas();
}

function clearNpcPostsForMonth(state) {
  const m = state.calendar.monthIndex;
  const y = state.calendar.year;
  for (const net of ['pronet', 'chirp']) {
    const list = state.social?.[net]?.posts;
    if (!list) continue;
    state.social[net].posts = list.filter(
      (p) => !(p.authorId === 'npc' && p.month === m && p.year === y)
    );
  }
}

function trimSocial(state) {
  const maxPosts = 40;
  for (const net of ['pronet', 'chirp']) {
    const list = postList(state, net);
    if (list.length > maxPosts) {
      const removed = list.splice(maxPosts);
      state.social.archive.push(...removed.map((p) => ({ ...p, archived: true })));
    }
  }
  state.social.archive = state.social.archive.slice(-80);
}

export async function publishPlayerPost(state, network, text) {
  const body = String(text ?? '').trim();
  if (!body) return { ok: false, reason: 'Write something first.' };
  if (network === 'chirp' && body.length > CHIRP_LIMIT) {
    return { ok: false, reason: `Chirp limit is ${CHIRP_LIMIT} characters.` };
  }

  const post = {
    id: `post-${Date.now()}`,
    network,
    authorId: 'player',
    authorName: state.company?.name ?? 'You',
    text: body,
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    reactions: { likes: 0, reposts: 0, comments: [] }
  };

  postList(state, network).unshift(post);
  trimSocial(state);

  await attachReactions(state, post);
  return { ok: true, post };
}

function recentPlayerPosts(state, excludeId) {
  const posts = []
    .concat(state.social?.pronet?.posts ?? [])
    .concat(state.social?.chirp?.posts ?? [])
    .filter((p) => p.authorId === 'player' && p.id !== excludeId)
    .sort((a, b) => (b.month ?? 0) - (a.month ?? 0));
  return posts.slice(0, 3).map((p) => ({ network: p.network, text: p.text }));
}

async function attachReactions(state, post) {
  const personas = await loadPersonas();
  const headlines = (state.news?.currentMonthArticles ?? [])
    .concat((state.news?.archive ?? []).flatMap((b) => b.articles ?? []))
    .slice(0, 4)
    .map((a) => a.headline)
    .filter(Boolean);
  const context = {
    narrative: buildNarrativeContext(state),
    snapshot: buildGameSnapshot(state),
    post: { network: post.network, text: post.text, author: post.authorName },
    personas: personas.slice(0, 6),
    recentHeadlines: headlines,
    playerRecentPosts: recentPlayerPosts(state, post.id)
  };

  let reactions = offlineReactions(state, post, personas);

  if (shouldUseNarrativeAi()) {
    try {
      const res = await requestNarrative('startup_social_reactions', context);
      if (res?.comments || res?.likes !== undefined) {
        const scaled = scaleEngagement(
          state,
          Number(res.likes) || reactions.likes,
          Number(res.reposts) || reactions.reposts
        );
        reactions = {
          likes: scaled.likes,
          reposts: scaled.reposts,
          comments: (res.comments ?? []).slice(0, 5).map((c) => ({
            author: String(c.author ?? 'Anon').slice(0, 60),
            text: String(c.text ?? '').slice(0, 280)
          }))
        };
      }
    } catch {
      /* keep offline */
    }
  }

  post.reactions = reactions;
}

function headlineList(state) {
  return (state.news?.currentMonthArticles ?? [])
    .concat((state.news?.archive ?? []).flatMap((b) => b.articles ?? []))
    .slice(0, 6)
    .map((a) => a.headline)
    .filter(Boolean);
}

function pushFeedPost(state, network, authorName, text) {
  const scaled = scaleEngagement(
    state,
    2 + Math.floor(Math.random() * 30),
    Math.floor(Math.random() * 8)
  );
  const post = {
    id: `feed-${network}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
    network,
    authorId: 'npc',
    authorName,
    text: String(text).slice(0, network === 'chirp' ? CHIRP_LIMIT : 600),
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    reactions: { likes: scaled.likes, reposts: scaled.reposts, comments: [] }
  };
  postList(state, network).unshift(post);
}

function offlineMonthlyPosts(state, personas) {
  const company = state.company?.name ?? 'A startup';
  const headlines = headlineList(state);
  const h = headlines[0];
  const pronet = personas.filter((p) => p.network !== 'chirp');
  const chirp = personas.filter((p) => p.network === 'chirp');
  const pick = (list) => list[Math.floor(Math.random() * list.length)] ?? { name: 'Industry watcher' };

  if (h) {
    pushFeedPost(
      state,
      'pronet',
      pick(pronet).name,
      `${company} is all over the trades after "${h}" — curious how the team executes from here.`
    );
    pushFeedPost(
      state,
      'chirp',
      pick(chirp).name,
      h.length > 90 ? `${company} making noise again 👀` : `${h} — huge if true for ${company}.`
    );
  } else {
    pushFeedPost(
      state,
      'pronet',
      pick(pronet).name,
      `Quiet month for ${company}, but the category keeps heating up.`
    );
    pushFeedPost(
      state,
      'chirp',
      pick(chirp).name,
      `${company} still building. Respect the grind.`
    );
  }
  pushFeedPost(
    state,
    'chirp',
    pick(chirp).name,
    `Someone at ${company} definitely refreshing Macrohard Newsdesk right now.`
  );
  trimSocial(state);
}

export function applyOfflineMonthlySocial(state) {
  if (!state.social) state.social = createInitialSocial();
  offlineMonthlyPosts(state, personasCache);
  refreshSocialUnread(state);
}

/** @returns {Promise<boolean>} true when AI posts replaced offline NPC posts for this month */
export async function enrichMonthlySocialWithAi(state) {
  if (!state.social) state.social = createInitialSocial();
  if (!shouldUseNarrativeAi()) return false;

  const personas = await loadPersonas();
  const headlines = headlineList(state);
  const context = {
    narrative: buildNarrativeContext(state),
    headlines,
    personas: personas.slice(0, 8),
    rules: 'Generate in-world posts. No sandbox, levels, or game UI terms.'
  };

  try {
    const res = await requestNarrative('startup_social_month', context);
    const posts = res?.posts ?? res?.result?.posts;
    if (Array.isArray(posts) && posts.length) {
      clearNpcPostsForMonth(state);
      for (const p of posts.slice(0, 6)) {
        const network = p.network === 'chirp' ? 'chirp' : 'pronet';
        pushFeedPost(state, network, String(p.author ?? p.authorName ?? 'Anon').slice(0, 60), p.text);
      }
      trimSocial(state);
      refreshSocialUnread(state);
      return true;
    }
  } catch {
    /* keep offline */
  }
  return false;
}

export async function generateMonthlySocial(state) {
  applyOfflineMonthlySocial(state);
  if (await enrichMonthlySocialWithAi(state)) {
    return { ok: true, source: 'ai' };
  }
  return { ok: true, source: 'offline' };
}

function offlineReactions(state, post, personas) {
  const p = personas[Math.floor(Math.random() * personas.length)] ?? {
    name: 'Random Founder',
    handle: '@founder'
  };
  const scaled = scaleEngagement(
    state,
    3 + Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 5)
  );
  return {
    likes: scaled.likes,
    reposts: scaled.reposts,
    comments: [
      {
        author: p.name,
        text:
          post.network === 'chirp'
            ? 'Huge if true.'
            : 'Impressive momentum — let us sync about a pilot (not investment advice).'
      }
    ]
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderArchivePosts(posts) {
  if (!posts.length) {
    return '<div class="tab-placeholder">Older posts appear here after your feeds roll forward.</div>';
  }
  const sorted = [...posts].sort((a, b) => {
    const ta = (a.year ?? 0) * 12 + (a.month ?? 0);
    const tb = (b.year ?? 0) * 12 + (b.month ?? 0);
    return tb - ta;
  });
  return sorted
    .map((p) => {
      const net = p.network === 'chirp' ? 'Chirp' : 'ProNet';
      return `<article class="social-post archived">
        <header><strong>${escapeHtml(p.authorName)}</strong> <span class="fine-print">${escapeHtml(net)} · Y${p.year} M${p.month}</span></header>
        <p>${escapeHtml(p.text)}</p>
      </article>`;
    })
    .join('');
}

function renderPosts(posts, networkClass) {
  if (!posts.length) {
    return `<div class="tab-placeholder">No ${networkClass} posts yet.</div>`;
  }
  return posts
    .map((p) => {
      const comments = (p.reactions?.comments ?? [])
        .map((c) => `<li><strong>${escapeHtml(c.author)}</strong> ${escapeHtml(c.text)}</li>`)
        .join('');
      return `<article class="social-post ${networkClass}">
        <header><strong>${escapeHtml(p.authorName)}</strong> <span class="fine-print">Y${p.year} M${p.month}</span></header>
        <p>${escapeHtml(p.text)}</p>
        <footer class="social-meta">${p.reactions?.likes ?? 0} likes · ${p.reactions?.reposts ?? 0} reposts</footer>
        ${comments ? `<ul class="social-comments">${comments}</ul>` : ''}
      </article>`;
    })
    .join('');
}

export function renderSocialPanel(container, state) {
  if (!container) return;
  const active = state.social?.activeNetwork ?? 'pronet';
  const pronetPosts = state.social?.pronet?.posts ?? [];
  const chirpPosts = state.social?.chirp?.posts ?? [];
  const archivePosts = state.social?.archive ?? [];
  const onArchive = active === 'archive';
  const unread = unreadSocialCount(state);
  const buzz = state.product?.buzz ?? 0;
  const pronetFollowers = formatFollowerCount(socialFollowers(state, 'pronet'));
  const chirpFollowers = formatFollowerCount(socialFollowers(state, 'chirp'));
  const reachNote = `<p class="fine-print">Desk buzz <strong>${buzz}</strong> scales reach — ProNet ${pronetFollowers} followers · Chirp ${chirpFollowers} followers (${buzzEngagementMult(state).toFixed(2)}× engagement).</p>`;
  const unreadAlert =
    unread > 0
      ? `<p class="news-new-alert social-new-alert" role="status">${unread} new post${unread === 1 ? '' : 's'} this month — you're caught up once you've scrolled below.</p>`
      : '';

  const composer = onArchive
    ? ''
    : `<form id="social-post-form" class="setup-form">
      <textarea id="social-post-text" rows="2" maxlength="${active === 'chirp' ? CHIRP_LIMIT : 600}" placeholder="${active === 'chirp' ? 'What is happening?' : 'Share an update with your network…'}"></textarea>
      ${
        active === 'chirp'
          ? `<p id="chirp-char-count" class="chirp-char-count" aria-live="polite">0 / ${CHIRP_LIMIT}</p>`
          : ''
      }
      <button type="submit" class="btn btn-primary btn-small">Post</button>
    </form>`;

  const feed = onArchive
    ? `<div class="social-feed theme-archive">${renderArchivePosts(archivePosts)}</div>`
    : `<div class="social-feed ${active === 'chirp' ? 'theme-chirp' : 'theme-pronet'}">
      ${active === 'chirp' ? renderPosts(chirpPosts, 'theme-chirp') : renderPosts(pronetPosts, 'theme-pronet')}
    </div>`;

  container.innerHTML = `
    <p class="panel-lede">ProNet for polished updates; Chirp for hot takes. Post and watch the replies roll in.</p>
    ${reachNote}
    ${unreadAlert}
    <nav class="social-subtabs">
      <button type="button" class="${active === 'pronet' ? 'active' : ''}" data-social-tab="pronet">ProNet</button>
      <button type="button" class="${active === 'chirp' ? 'active' : ''}" data-social-tab="chirp">Chirp</button>
      <button type="button" class="${active === 'archive' ? 'active' : ''}" data-social-tab="archive">Archive (${archivePosts.length})</button>
    </nav>
    ${composer}
    ${feed}
    <p id="social-feedback" class="desk-feedback" hidden></p>
  `;
}

export function setSocialNetwork(state, network) {
  if (!state.social) state.social = createInitialSocial();
  if (network === 'archive') state.social.activeNetwork = 'archive';
  else state.social.activeNetwork = network === 'chirp' ? 'chirp' : 'pronet';
}

export function updateChirpCharCount(text) {
  const el = document.getElementById('chirp-char-count');
  if (!el) return;
  const len = String(text ?? '').length;
  el.textContent = `${len} / ${CHIRP_LIMIT}`;
  el.classList.toggle('chirp-char-warn', len > CHIRP_LIMIT - 25);
  el.classList.toggle('chirp-char-over', len >= CHIRP_LIMIT);
}

export function showSocialFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
