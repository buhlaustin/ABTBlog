export function certificateHtml(state) {
  const won = state.outcome?.type === 'win';
  const c = state.candidate;
  const rm = state.runningMate?.name ?? '—';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const title = won ? 'Certificate of Election' : 'Certificate of Concession';
  const headline = won
    ? `${c.name} & ${rm} win the 2028 presidential election.`
    : `${c.name} concedes the 2028 presidential election.`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:Georgia,serif;background:#f4f0e6;color:#1a1a1a;padding:48px;text-align:center;}
.border{border:8px double #2e5aac;padding:36px;max-width:720px;margin:0 auto;}
h1{font-size:1.6rem;margin:0 0 12px;letter-spacing:0.06em;text-transform:uppercase;}
.sub{color:#444;margin-bottom:24px;}
.stats{text-align:left;margin:24px auto;max-width:420px;line-height:1.8;}
.sign{margin-top:40px;font-style:italic;color:#555;}
</style></head><body>
<div class="border">
<h1>${title}</h1>
<p class="sub">2028: Win the White House — fictional simulation</p>
<p><strong>${headline}</strong></p>
<div class="stats">
<p>Candidate: <strong>${escapeHtml(c.name)}</strong> (${escapeHtml(c.party === 'R' ? 'Republican' : c.party === 'D' ? 'Democrat' : 'Independent')})</p>
<p>Running mate: <strong>${escapeHtml(rm)}</strong></p>
<p>Electoral votes: <strong>${state.outcome?.playerEv ?? '—'}</strong> (opponent ${state.outcome?.oppEv ?? '—'})</p>
<p>Popular vote share (sim): <strong>${state.outcome?.popularVotePct ?? '—'}%</strong></p>
<p>Home state: ${escapeHtml(c.homeState)}</p>
</div>
<p class="sign">Issued ${date}</p>
</div>
<script>window.print()</script>
</body></html>`;
}

export function openCertificate(state) {
  const html = certificateHtml(state);
  const w = window.open('', '_blank', 'width=820,height=640');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
