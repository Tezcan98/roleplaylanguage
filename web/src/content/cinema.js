/**
 * The open-air cinema's films (systems/Cinema.js), the Voscreen way: real cartoons from their
 * official YouTube channels, played a few seconds at a time through YouTube's embedded player (no
 * copy of a video is made). After each line the player picks what it meant out of two (`en` the
 * right meaning, `altEn` a near miss) — or, with no language for meanings, which sentence they heard
 * (`tr` or `altTr`); then the line is shown with its meaning and its `words` go into the notebook.
 *
 *   { id, title, en, youtube: '<video id>', channel: 'TRT Çocuk',
 *     lines: [{ start, end, tr, en, altTr, altEn, words: [[tr, en], …] }, …] }   (start / end: seconds in the video)
 *
 * None yet: the cinema says its projectionist isn't here and films are coming soon.
 */
export const FILMS = [];
