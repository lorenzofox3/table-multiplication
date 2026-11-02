/**
 * Small seedable PRNG (mulberry32). Returns a function producing floats in [0, 1).
 */
export const createRng = (seed = Date.now()) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Integer in [min, max] (inclusive). */
export const randomInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

export const pick = (rng, items) => items[Math.floor(rng() * items.length)];

/** Fisher–Yates shuffle, returns a new array. */
export const shuffle = (rng, items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
