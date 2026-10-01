# Game TODO

## Near-term — village / language-learning vertical slice

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
