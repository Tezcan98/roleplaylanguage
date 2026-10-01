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

/**
 * Prayer postures. The rig has no waist joint, so bowing rotates the whole body around the
 * hip point and counter-rotates the legs to keep them where they were. Arm angles are
 * relative to the leaning body (negative = towards the front).
 */
const HIP = 0.8;
function lean(r, angle, drop = 0, legs = 0) {
  r.body.rotation.x = angle;
  r.body.position.y = -drop + HIP - HIP * Math.cos(angle);
  r.body.position.z = -HIP * Math.sin(angle);
  r.legL.rotation.x = r.legR.rotation.x = legs - angle;
}
export const PRAYER_POSES = {
  kiyam(r) { lean(r, 0); r.armL.rotation.x = r.armR.rotation.x = -0.55; r.armL.rotation.z = 0.45; r.armR.rotation.z = -0.45; r.head.rotation.y = 0; },
  ruku(r) { lean(r, 1.35); r.armL.rotation.x = r.armR.rotation.x = -1.15; r.armL.rotation.z = r.armR.rotation.z = 0; r.head.rotation.y = 0; }, // hands down to the knees
  // kneeling and bowing deeply forward, palms on the floor (the blocky rig has no knee joint,
  // so a full prostration would look like lying down)
  secde(r) { lean(r, 1.2, 0.62, 1.57); r.armL.rotation.x = r.armR.rotation.x = -1.55; r.armL.rotation.z = r.armR.rotation.z = 0; r.head.rotation.y = 0; },
  oturus(r) { lean(r, 0, 0.62, 1.57); r.armL.rotation.x = r.armR.rotation.x = -0.6; r.armL.rotation.z = r.armR.rotation.z = 0; r.head.rotation.y = 0; },
  selamR(r) { PRAYER_POSES.oturus(r); r.head.rotation.y = -0.8; },
  selamL(r) { PRAYER_POSES.oturus(r); r.head.rotation.y = 0.8; },
};
/** Current posture of the family prayer, set by PrayerScene. */
export const prayerState = { pose: 'kiyam' };

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
  pray: {
    ownsHead: true,
    seated: true, // don't turn towards the player
    pose(r) { PRAYER_POSES[prayerState.pose](r); },
    talk(r) { PRAYER_POSES[prayerState.pose](r); },
  },
  /** On a floor cushion at the sofra: lower, and talks with the people around. */
  sitFloor: { ...sitting(0.62), turnToPlayerWithin: 0, seated: true },
  /** On a bench or sedir. */
  sitBench: { ...sitting(0.38), seated: true },
  watchTv: { ...sitting(0.38, (r) => { r.armL.rotation.x = r.armR.rotation.x = -0.1; }), seated: true },
};
