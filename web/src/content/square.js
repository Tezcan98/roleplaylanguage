/**
 * The village square's size and how many seats each part has (content, no three.js: the hotspots
 * need the counts, world/locations/VillageSquare.js builds that many). Sized for a crowd of ~100.
 */
export const SQUARE_HALF = 52; // the fence runs at ±52 m
/** Tea garden: a grid of tables, two chairs each; one table is the regulars' (no seats for others). */
export const TEA_COLS = 5, TEA_ROWS = 5;
export const TEA_SEATS = TEA_COLS * TEA_ROWS * 2 - 2;
/** Kahvehane: guest tables (two stools each) besides the uncles' table. */
export const KAHVE_TABLES = 12;
export const KAHVE_SEATS = KAHVE_TABLES * 2;
/** Library: reading tables, two stools each. */
export const READ_TABLES = 6;
export const READ_SEATS = READ_TABLES * 2;
/** Benches round the square (two seats each; two seats kept for Elif and Can). */
export const BENCHES = 11;
export const BENCH_SEATS = BENCHES * 2 - 2;
export const CHESS_SEATS = 8;
