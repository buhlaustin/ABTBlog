import { STATES, PARTY_COLORS } from './Data.js';

export function renderMapSvg(state, stateResults, playerParty, width = 960, height = 520) {
  const colors = PARTY_COLORS;
  const playerColor = colors[playerParty] ?? colors.D;
  const oppColor = colors[state.opponentParty ?? (playerParty === 'R' ? 'D' : 'R')] ?? colors.R;
  const indColor = colors.I;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" id="electoral-map-svg">`,
    '<rect width="100%" height="100%" fill="#0e1419"/>',
    `<text x="24" y="36" fill="#e8edf4" font-family="system-ui,sans-serif" font-size="20" font-weight="700">2028 Electoral Map</text>`
  ];

  for (const st of STATES) {
    const res = stateResults?.[st.id];
    const winner = res?.winner ?? 'uncalled';
    let fill = '#2a3544';
    if (winner === 'player') fill = playerColor;
    else if (winner === 'opponent') fill = oppColor;
    else if (winner === 'independent') fill = indColor;
  const r = 6 + Math.sqrt(st.ev) * 4.2;
    parts.push(
      `<circle cx="${st.cx}" cy="${st.cy}" r="${r}" fill="${fill}" stroke="#1a2330" stroke-width="1.2" data-state="${st.id}"/>`,
      `<text x="${st.cx}" y="${st.cy + 4}" text-anchor="middle" fill="#fff" font-size="11" font-family="system-ui,sans-serif" font-weight="600">${st.id}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

export async function downloadMapPng(svgMarkup, filename = 'electoral-map-2028.png') {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 520;
  const ctx = canvas.getContext('2d');
  await new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = '#0e1419';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
  canvas.toBlob((png) => {
    if (!png) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
