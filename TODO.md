# Game TODO

## Near-term — home / language-learning vertical slice

- [x] Expand the after-school home loop with tea, table setting, dish washing, sweeping, and plant care.
- [ ] Add persistent home-state feedback (dirty/clean dishes, watered plant, swept room) so family dialogue can react to completed chores.
- [ ] Add a small home inventory/storage system for food, cleaning supplies, and household objects.
- [ ] Add a morning routine variation (make the bed, wash face, breakfast, pack school bag) before leaving home.

### Meshy asset backlog — home

These are optional replacement assets for the procedural placeholders. Generate them one at a time and export as **GLB**; the game already uses a fallback-first `ModelLibrary`, so a missing GLB will not break the scene.

- [ ] `prop.fridge` — small Turkish village-house refrigerator, kitchen corner.
- [ ] `prop.stove` — compact freestanding cooker/oven, simple enamel body.
- [ ] `prop.broom` — wooden-handled traditional household broom, upright/leaning pose.
- [ ] `prop.dishpan` — enamel wash basin with a few plates, kitchen counter.
- [ ] `prop.caydanlik` — Turkish double teapot (çaydanlık), red enamel / metal details.
- [ ] `prop.teaTray` — round Turkish tea tray with two small tulip-shaped tea glasses.
- [ ] `prop.siniSet` — low Turkish sini table with simple breakfast dishes, visually readable from a third-person camera.
- [ ] `prop.prayerRug` — optional folded/rolled traditional Turkish prayer rug for bedroom/living room decoration.



- [x] Add a real bakkal shopping flow: choose an item, understand the price, and receive it in inventory. *(Monday evening: order, add up the prices, pay, change.)*
- [ ] Add an optional **speak** task at the bakkal (for example: “Bir ekmek lütfen.”) using the existing speech activity.
- [x] Add a later **speak** task with the muhtar (for example: ask where the school/clinic is) without making early chapters depend on microphone input. *(Monday evening letter quest: “Dedem bu mektubu gönderdi.”)*
- [ ] Add persistent object state where useful (fountain used, bench occupied, shop visited) so interactions can affect later dialogue.
- [ ] Add more village NPC routines (child, farmer, tea-house regular) with time-of-day positions.
- [ ] Add a kahvehane and simple social interactions inspired by life-sim / RPG language-learning games.
- [ ] Add contextual vocabulary review: when an object is used again, show the previously learned word less prominently instead of teaching it as new.
- [ ] Add a small “mission rehearsal” mode where the player can practice a sentence before a story quest requires speaking it.
- [ ] Add automated browser smoke tests for: start game → yard → village → interact with fountain/well/bench → return to yard.

## Later — scalable language gameplay

- [ ] Generalize speech quests so the same scenario can be authored for Turkish, Japanese, Spanish, etc.
- [ ] Add adaptive dialogue difficulty based on vocabulary already learned.
- [ ] Add NPC memory/relationship flags that change available dialogue.
- [ ] Add economy/rewards only after the core conversation loop is fun and reliable.

### Design rule

Keep optional village exploration separate from the main story until the interactions are stable. New microphone/speech requirements should be introduced in later quests, not as a hard gate in the opening sequence.
