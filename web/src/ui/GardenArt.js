/** Original vector artwork; shared by the interactive beds and the seed catalogue. */
const svg = (body, view = '0 0 160 150') => `<svg viewBox="${view}" aria-hidden="true" focusable="false">${body}</svg>`;
export function plantArt(crop = 'bean', stage = 'ready') {
  const small = stage === 'sprout', mature = stage === 'ready';
  const stem = small ? 'M80 100Q74 83 80 73' : 'M80 103Q74 76 82 39';
  let body = `<ellipse cx="80" cy="104" rx="24" ry="7" fill="#342915" opacity=".16"/><path d="${stem}" fill="none" stroke="#467538" stroke-width="5" stroke-linecap="round"/>`;
  const leaves = small ? [[78,85,-1],[79,76,1]] : [[78,88,-1],[79,76,1],[80,61,-1],[82,47,1]];
  for (const [x,y,s] of leaves) body += `<path d="M${x} ${y}q${s*28} -27 ${s*31} -9q-9 20 ${-s*31} 9" fill="${s < 0 ? '#5c9e45' : '#82ba54'}" stroke="#477b38" stroke-width="1.5"/><path d="M${x} ${y}l${s*23} -12" stroke="#b3d47b" fill="none"/>`;
  if (!small) body += '<path d="M79 72Q96 58 104 68M79 85Q58 66 51 76" fill="none" stroke="#4c8239" stroke-width="3"/>';
  if (mature) {
    if (crop === 'tomato') {
      for (const [x,y] of [[53,79],[104,70],[86,91]]) body += `<circle cx="${x}" cy="${y}" r="12" fill="#dd543d" stroke="#ab422e" stroke-width="1.5"/><path d="M${x-5} ${y-9}l5 4 5-4-5 1z" fill="#427a36"/><ellipse cx="${x-4}" cy="${y-3}" rx="3" ry="4" fill="#ffb087" opacity=".8"/>`;
    } else if (crop === 'pepper') {
      for (const [x,y] of [[51,76],[101,66],[85,90]]) body += `<path d="M${x} ${y-9}q-13-1-10 14q2 11 12 12q-5-9 4-15q6-9-6-11" fill="#edbe4c" stroke="#b4832f" stroke-width="1.5"/><path d="M${x} ${y-8}q-4-6 1-10" fill="none" stroke="#4c7b38" stroke-width="3"/>`;
    } else {
      for (const [x,y] of [[50,75],[104,67],[86,87]]) body += `<path d="M${x} ${y}q-13 16-1 32q16-11 6-30" fill="#a4c959" stroke="#618b37" stroke-width="2"/><path d="M${x+2} ${y+6}q-5 9-1 18" fill="none" stroke="#d9e99b" stroke-width="2"/>`;
    }
  }
  return body;
}
export function bedArt(plot, status, index) {
  const wet = plot.wateredAt != null && plot.crop;
  const color = wet ? '#66452f' : plot.hoed ? '#94613d' : '#b18b59';
  let body = `<ellipse cx="80" cy="122" rx="68" ry="18" fill="#2b4724" opacity=".13"/><path d="M9 83L80 49l71 34v16l-71 35L9 99z" fill="#67442e"/><path d="M9 83l71 35 71-35-71-35z" fill="${color}" stroke="#d6b17a" stroke-width="3"/><path d="M9 99l71 35v-16" fill="#785035"/>`;
  if (plot.hoed) for (let n=0;n<4;n++) body += `<path d="M${32+n*13} ${77-n*6}l65 32" stroke="${wet?'#4b3427':'#71492f'}" stroke-width="4" stroke-linecap="round" opacity=".65"/>`;
  else body += '<path d="M38 83l9 3m46-18 7 3m13 22 8 2m-48 14 6 1" stroke="#d4b27b" stroke-width="3" stroke-linecap="round"/>';
  if (status.stage === 'dry') body += '<ellipse cx="80" cy="91" rx="12" ry="5" fill="#553a29"/><path d="M77 87l8 2-5 5z" fill="#ead698"/>';
  if (['sprout','leaf','ready'].includes(status.stage)) body += `<g class="garden-plant">${plantArt(plot.crop,status.stage)}</g>`;
  if (status.stage === 'ready') body += '<g fill="#fff0a6" class="garden-spark"><path d="M123 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M34 56l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>';
  body += `<text x="80" y="128" text-anchor="middle" fill="#f6e5bb" font-size="10" font-family="sans-serif" font-weight="700">${index+1}</text>`;
  return svg(body);
}
export const cropArt = crop => svg(plantArt(crop));
const toolPaths = {
  hoe: '<path d="M14 34L32 9" stroke="#ba8550" stroke-width="5"/><path d="M25 9l13 8-4 7-14-10z" fill="#9aaeb0" stroke="#526f72" stroke-width="2"/>',
  sow: '<path d="M13 18q11-8 22 0l4 23H9z" fill="#d7ae68" stroke="#9b7545" stroke-width="2"/><path d="M15 14l-2-6h22l-3 6" fill="#ead0a0"/><path d="M24 33v-9m0 5q-11-1-8-9 9 1 8 9m0-2q0-9 8-8 1 7-8 8" stroke="#5b883b" fill="#7ea64a" stroke-width="2"/>',
  water: '<path d="M11 20h22v19H11zM11 24L3 17l1 15 7 2" fill="#69a9b0" stroke="#38777e" stroke-width="2"/><path d="M29 19q13-18 14 0l-9 11" fill="none" stroke="#38777e" stroke-width="3"/><path d="M2 34l-1 5m5-3-1 6" stroke="#a3dfec" stroke-width="2"/>',
  harvest: '<path d="M10 21h29l-5 20H15z" fill="#b77b43" stroke="#81502f" stroke-width="2"/><path d="M17 22q5-28 16 0" fill="none" stroke="#936139" stroke-width="3"/><path d="M13 27h23m-22 6h20M21 22v17m8-17v17" stroke="#e3b378" stroke-width="2"/>',
};
export const toolArt = tool => svg(toolPaths[tool], '0 0 48 48');
