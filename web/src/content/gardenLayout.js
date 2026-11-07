/** Shared coordinates for visible props and their world interactions. */
export const GARDEN_PLOTS = Array.from({ length: 9 }, (_, i) => ({ x: 7.15 + i % 3 * 1.85, z: 2.35 + Math.floor(i / 3) * 1.65 }));
export const GARDEN_TOOLS = [
  { tool: 'hoe', x: 12.35, z: .6, label: 'Çapayı al' },
  { tool: 'water', x: 13, z: 2.5, label: 'Sulama kabını al' },
];

// Tools are put away three metres beyond the garden work area, not while crossing its plots.
export const GARDEN_RELEASE_DISTANCE = 3;
export const gardenDistance = p => Math.hypot(Math.max(6-p.x,0,p.x-13.6),Math.max(-p.z,0,p.z-6.8));
