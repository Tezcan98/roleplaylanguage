/** Every event name used on the bus, in one place. */
export const EV = Object.freeze({
  TIME: 'time:changed',
  LOCATION: 'location:entered',
  ITEM_PICKED: 'item:picked',
  INVENTORY: 'inventory:changed',
  WORD: 'vocab:learned',
  QUEST: 'quest:changed',
  QUEST_DONE: 'quest:completed',
  CHAPTER: 'chapter:started',
  HOTSPOT: 'hotspot:used',
  FLAG: 'flag:set',
  FREE_ACTION: 'free:action',
  DIALOGUE_OPEN: 'dialogue:opened',
  DIALOGUE_CLOSE: 'dialogue:closed',
  THINK: 'think',
  TOAST: 'toast',
});
