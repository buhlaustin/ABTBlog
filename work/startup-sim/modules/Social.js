import { assetBaseUrl } from './utils.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildGameSnapshot } from './GameContext.js';
import { setGameFeedback } from './GameFeedback.js';
import bundledPersonas from '../data/personas.json' with { type: 'json' };

let personasCache = bundledPersonas.personas ?? [];
export const CHIRP_LIMIT = 240;

export function createInitialSocial() {
  return {
    pronet: { posts: [] },
    chirp: { posts: [] },
    activeNetwork: 'pronet',
    archive: []
  };
}

async function loadPersonas() {
  try {
    const res = await fetch(`${assetBaseUrl()}data/personas.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas) && data.personas.length > 0) {
        personasCache = data.personas;
      }
    }
  } catch {
    /* keep bundled personas */
  }
  return personasCache;
}

function postList(state, network) {
  return network === 'chirp' ? state.social.chirp.posts : state.social.pronet.posts;
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
    snapshot: buildGameSnapshot(state),
    post: { network: post.network, text: post.text, author: post.authorName },
    personas: personas.slice(0, 6),
    recentHeadlines: headlines,
    playerRecentPosts: recentPlayerPosts(state, post.id)
  };

  let reactions = offlineReactions(post, personas);

  if (shouldUseNarrativeAi()) {
    try {
      const res = await requestNarrative('startup_social_reactions', context);
      if (res?.comments || res?.likes !== undefined) {
        reactions = {
          likes: Number(res.likes) || reactions.likes,
          reposts: Number(res.reposts) || reactions.reposts,
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

function offlineReactions(post, personas) {
  const p = personas[Math.floor(Math.random() * personas.length)] ?? {
    name: 'Random Founder',
    handle: '@founder'
  };
  return {
    likes: 3 + Math.floor(Math.random() * 20),
    reposts: Math.floor(Math.random() * 5),
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
