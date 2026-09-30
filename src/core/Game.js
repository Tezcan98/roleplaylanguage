import * as THREE from 'three';

/** Frame loop. Only decides the order systems run in; each system owns its own logic. */
export class Game {
  #clock = new THREE.Clock();
  t = 0;

  constructor(parts) { Object.assign(this, parts); }

  start() { const tick = () => { this.tick(); requestAnimationFrame(tick); }; tick(); }

  tick() {
    const dt = Math.min(this.#clock.getDelta(), 0.05);
    const t = (this.t += dt);
    const { modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, camera, labels, dialogue, story, player, ctx } = this;
    const playing = modes.base === 'play';

    time.update(dt);
    lighting.update();
    controller.update(dt, t);
    cast.update(dt, t);
    items.update(dt, t);
    world.current.update(dt, t);

    actionButton.show(interactions.update(player.position));
    joystick.visible = modes.is('play');
    marker.update(dt, t, playing && !dialogue.talking);

    const partner = dialogue.talking ? cast.get(dialogue.talking) : null;
    camera.update(t, { menu: !playing, player, partner, location: world.current });
    labels.update({ npcs: cast.present(), target: story.target()?.npc ?? null, show: modes.is('play'), player, now: t });
    ctx.render();
  }
}
