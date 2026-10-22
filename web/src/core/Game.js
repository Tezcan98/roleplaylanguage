/** Frame loop. Only decides the order systems run in; each system owns its own logic. */
export class Game {
  #last = null;
  t = 0;

  constructor(parts) { Object.assign(this, parts); }

  start() { const tick = (now) => { this.tick(now); requestAnimationFrame(tick); }; tick(performance.now()); }

  tick(now = performance.now()) {
    // the real time since the last frame, from the frame's own timestamp (when it is shown), not smoothed: an averaged frame time
    // moved a steady thing by 30 ms in a 17 ms frame and 30 in the 33 ms ones after it (9 m/s, then 4.5) — a galloping horse shook
    const dt = this.#last == null ? 0.016 : Math.min(Math.max(0, (now - this.#last) / 1000), 0.05);
    this.#last = now;
    const t = (this.t += dt);
    const { ambient = [], shotButton, help, prayer, village, toys, foliage, modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, camera, labels, dialogue, story, player, ctx } = this;
    const playing = modes.base === 'play';

    time.update(dt);
    lighting.update(dt, t);
    foliage.tick(t);
    controller.update(dt, t);
    cast.update(dt, t);
    items.update(dt, t);
    toys.update(dt, t);
    village.update(dt, t);
    prayer.update(dt, t);
    ambient.forEach((a) => a.update(dt, t)); // villagers chatting among themselves
    world.current.update(dt, t);

    actionButton.show(interactions.update(player.position), interactions.others);
    actionButton.showLeft(interactions.left);
    shotButton?.show(modes.is('play') && !player.seated && !player.mount && (!!toys.shotBall() || !!village.onPitch?.(player.position))); // on a pitch: always there
    joystick.visible = modes.is('play');
    help.visible = modes.is('play');
    marker.update(dt, t, playing && !dialogue.talking);

    const partner = dialogue.talking ? cast.get(dialogue.talking) : null;
    camera.update(t, { menu: !playing, player, partner, location: world.current });
    labels.update({ npcs: [...cast.present(), ...(world.current.id === village.locationId ? village.remotes.visible() : [])], target: story.target()?.npc ?? null, show: modes.is('play'), player, now: t });
    ctx.render();
  }
}
