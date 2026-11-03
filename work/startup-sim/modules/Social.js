/** Phase 4: ProNet + Chirp feeds. */
export function createInitialSocial() {
  return {
    pronet: { posts: [] },
    chirp: { posts: [] }
  };
}

export function renderSocialPlaceholder(container) {
  if (!container) return;
  container.innerHTML = `
    <p class="panel-lede">ProNet and Chirp clones land in Phase 4 with AI reactions.</p>
    <div class="tab-placeholder">Social feeds not wired yet.</div>
  `;
}
