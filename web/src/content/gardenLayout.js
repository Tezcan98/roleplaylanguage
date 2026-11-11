/** Shared coordinates for visible props and their world interactions. */
export const GARDEN_PLOTS = Array.from({ length: 9 }, (_, i) => ({ x: 7.15 + i % 3 * 1.85, z: 2.35 + Math.floor(i / 3) * 1.65 }));
export const GARDEN_TOOLS = [
  { tool: 'hoe', x: 12.35, z: .6, label: 'Çapayı al' },
  { tool: 'water', x: 13, z: 2.5, label: 'Sulama kabını al' },
];

// Tools are put away three metres beyond the garden work area, not while crossing its plots.
export const GARDEN_RELEASE_DISTANCE = 3;
export const gardenDistance = p => Math.hypot(Math.max(6-p.x,0,p.x-13.6),Math.max(-p.z,0,p.z-6.8));

/** The garden tools' colours, held and lying in the yard: bright, so you see at once what you hold. */
export const GARDEN_TOOL_COLORS = { handle: 0xF2A93B, hoe: 0xE8452C, edge: 0xFFF1C4, can: 0x27AE60, band: 0xF4D35E, spout: 0xF4C542, bag: 0xC98B4B, sprout: 0x6CCB3C };
