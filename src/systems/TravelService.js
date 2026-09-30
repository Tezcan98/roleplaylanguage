/** Moves the player between locations (behind a fade) and repositions them inside one. */
export class TravelService {
  constructor({ world, player, cast, camera, fader, state }) { Object.assign(this, { world, player, cast, camera, fader, state }); }

  place(locId, anchor, opts) {
    const loc = this.world.current?.id === locId && !opts?.force ? this.world.current : this.world.enter(locId, opts);
    const a = loc.anchors.get(anchor);
    this.player.place(a);
    this.player.group.visible = true;
    this.state.location = locId;
    this.cast.refreshVisibility();
    this.camera.snap(this.player.position, loc.indoor);
    return loc;
  }

  go(locId, anchor, after) {
    this.fader.run(() => { this.place(locId, anchor, { force: true }); after?.(); });
  }
}
