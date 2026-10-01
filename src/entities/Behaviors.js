/**
 * Idle animations for NPCs (Strategy pattern). A behaviour poses the rig every frame,
 * may declare props it needs and whether the character is seated.
 * Add a new one here without touching Npc.
 */
export const sitPose = (height) => (r) => {
  r.body.position.y = -height;
  r.legL.rotation.x = r.legR.rotation.x = -Math.PI / 2;
  r.body.rotation.x = 0;
};

const sitting = (height, extra = () => {}) => ({
  pose(r, t) { sitPose(height)(r); r.armL.rotation.x = -0.35; r.armR.rotation.x = -0.35 + Math.sin(t * 1.3) * 0.08; extra(r, t); },
  talk(r) { sitPose(height)(r); r.armL.rotation.x = r.armR.rotation.x = -0.2; },
});

export const Behaviors = {
  stand: { pose(r) { r.armL.rotation.x = r.armR.rotation.x = 0; r.body.rotation.x = 0; } },
  garden: {
    props: ['hoe'],
    pose(r, t) { const s = (Math.sin(t * 2.4) + 1) / 2; r.armR.rotation.x = r.armL.rotation.x = -0.3 - 1.2 * s; r.body.rotation.x = 0.15 * s; },
    talk(r) { r.armR.rotation.x = r.armL.rotation.x = -0.3; r.body.rotation.x = 0; },
  },
  repair: {
    pose(r, t) { r.body.rotation.x = 0.45; r.armR.rotation.x = -1.1 + Math.sin(t * 6) * 0.3; r.armL.rotation.x = -0.9; },
    talk(r) { r.body.rotation.x *= 0.85; r.armR.rotation.x = r.armL.rotation.x = 0; },
  },
  cook: {
    pose(r, t) { r.armR.rotation.x = -0.8 + Math.sin(t * 3) * 0.25; r.armL.rotation.x = -0.6 + Math.sin(t * 3 + 1) * 0.2; r.body.rotation.x = 0; },
    talk(r) { r.armL.rotation.x = r.armR.rotation.x = 0; },
    turnToPlayerWithin: 2.4,
  },
  laundry: {
    pose(r, t) { const s = (Math.sin(t * 1.6) + 1) / 2; r.armL.rotation.x = r.armR.rotation.x = -2.4 + s * 0.4; r.body.rotation.x = 0; },
    talk(r) { r.armL.rotation.x = r.armR.rotation.x = 0; },
    turnToPlayerWithin: 2.4,
  },
  teach: {
    pose(r, t) { const s = Math.max(0, Math.sin(t * 0.8)); r.armR.rotation.x = -1.4 * s; r.armL.rotation.x = -0.2; r.body.rotation.x = 0; },
    talk(r) { r.armR.rotation.x = -0.6; r.armL.rotation.x = -0.2; },
  },
  /** On a floor cushion at the sofra: lower, and talks with the people around. */
  sitFloor: { ...sitting(0.62), turnToPlayerWithin: 0, seated: true },
  /** On a bench or sedir. */
  sitBench: { ...sitting(0.38), seated: true },
  watchTv: { ...sitting(0.38, (r) => { r.armL.rotation.x = r.armR.rotation.x = -0.1; }), seated: true },
};
