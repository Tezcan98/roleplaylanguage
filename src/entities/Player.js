import { Character } from './Character.js';

/** Ahmet. Movement is driven by PlayerController; this only knows its body. */
export class Player extends Character {
  wear(item, on = true) { this.showProp(item, on); }
}
