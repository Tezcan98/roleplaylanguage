/** Shared coordinates for visible props and their world interactions. */
export const GARDEN_PLOTS = Array.from({ length: 9 }, (_, i) => ({ x: 7.15 + i % 3 * 1.85, z: 2.35 + Math.floor(i / 3) * 1.65 }));
export const GARDEN_TOOLS = [
  { tool: 'hoe', x: 12.35, z: .6, label: 'Çapayı al' },
  { tool: 'water', x: 13, z: 2.5, label: 'Sulama kabını al' },
  { tool: 'harvest', x: 13, z: 5.8, label: 'Hasat sepetini al' },
];
