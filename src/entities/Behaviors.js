/**
 * Idle animations for NPCs (Strategy pattern). A behaviour poses the rig every frame and
 * declares which props it needs. Add a new one here without touching Npc.
 */
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
};
