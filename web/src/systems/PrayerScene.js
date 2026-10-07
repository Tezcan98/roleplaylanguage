import * as THREE from 'three';
import { EV } from '../core/events.js';
import { PRAYER_POSES, prayerState } from '../entities/Behaviors.js';

/** Who stands where: grandpa leads (imam); the men's row behind him, the women's row behind them. */
const ROWS = [['dede', 'imam'], ['baba', 'saf1'], ['ismail', 'saf1c'], ['kardes', 'saf1d'], ['anne', 'saf2'], ['nine', 'saf2b']];

/**
 * The family prayer: everyone takes their place on the prayer rugs and goes through the
 * postures together while a caption names each one. Ends with "Allah kabul etsin",
 * grandpa going to bed and the `prayed-yatsi` flag.
 */
export class PrayerScene {
  #pop = null;
  #timers = [];

  constructor({ bus, world, cast, player, camera, fader, modes, caption, toasts, vocab, effects, story, steps, words, playerRow = () => 'saf1b' }) {
    Object.assign(this, { world, cast, player, camera, fader, modes, caption, toasts, vocab, effects, story, steps, words, playerRow });
    this.active = false;
    // mom lays out the prayer rugs once it's prayer time
    bus.on(EV.QUEST, ({ quest }) => this.#house().setPrayerRugs?.(this.active || quest?.id === 'namaz'));
  }

  #house() { return this.world.get('house'); }

  start() {
    if (this.active) return;
    this.active = true;
    this.#pop = this.modes.push('cut');
    this.fader.run(() => {
      const house = this.#house();
      house.setPrayerRugs(true);
      prayerState.pose = 'kiyam';
      ROWS.forEach(([id, anchor]) => { if (this.cast.get(id)?.location === 'house') this.cast.get(id).station(house, anchor, 'pray'); });
      this.player.place(house.anchors.get(this.playerRow())); // a girl stands in the women's row
      this.player.setPosed(true);
      // from the side, so the postures are easy to see
      this.camera.setFixed(new THREE.Vector3(2.2, 3.0, 3.4), new THREE.Vector3(-2.6, 0.6, 2.7));
      this.#run(0);
    });
  }

  #run(i) {
    const step = this.steps[i];
    if (!step) { this.#finish(); return; }
    prayerState.pose = step.pose;
    this.caption.show({ title: step.title, text: step.text, en: step.en });
    this.#timers.push(setTimeout(() => this.#run(i + 1), step.seconds * 1000));
  }

  #finish() {
    this.caption.show({ title: 'Allah kabul etsin', text: '“Allah kabul etsin.” — “Amin, hepimizden.”', en: '“May God accept it.” — “Amen, from all of us.”' });
    this.#timers.push(setTimeout(() => this.fader.run(() => {
      const house = this.#house();
      this.active = false;
      house.setPrayerRugs(false);
      this.cast.apply(this.story.chapter.cast);
      this.cast.dismiss('dede'); // grandpa goes to bed
      if (this.cast.get('ismail')?.location === 'house') this.cast.move('ismail', 'village', 'chessDede', 'sitBench'); // the guest goes home
      this.player.setPosed(false);
      this.player.place({ x: -2.6, z: 2.0, rot: Math.PI });
      this.camera.clearFixed();
      this.caption.hide();
      this.#pop?.();
      this.words.forEach(([tr, en]) => this.vocab.learn(tr, en));
      this.toasts.show('İsmail Dede evine gitti, dede de yattı. İyi geceler!', 'İsmail Dede went home and grandpa went to bed. Good night!');
      this.effects.run(['flag:prayed-yatsi']);
    }), 2600));
  }

  update() { if (this.active) PRAYER_POSES[prayerState.pose](this.player.rig); }
}
