import { pick, shuffle } from './random.js';

export const MIN_FACTOR = 1;
export const MAX_FACTOR = 9;
export const PADAWAN_TABLE_SIZE = 10;

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const fact = (a, b) => ({ a, b, answer: a * b });

/** The 10 facts of a given table (table × 1 … table × 10), shuffled. */
export const tableFacts = (table, rng) =>
  shuffle(
    rng,
    range(1, PADAWAN_TABLE_SIZE).map((n) => fact(table, n)),
  );

/** All 81 facts from 1×1 to 9×9. */
export const allFacts = () =>
  range(MIN_FACTOR, MAX_FACTOR).flatMap((a) => range(MIN_FACTOR, MAX_FACTOR).map((b) => fact(a, b)));

/**
 * Infinite source of random facts, without repetition until the 81 facts are exhausted.
 * When reshuffling, the first fact of the new batch is never the last one served.
 */
export const createFactSource = (rng) => {
  let queue = [];
  let last = null;
  return () => {
    if (queue.length === 0) {
      queue = shuffle(rng, allFacts());
      if (last && queue[0].a === last.a && queue[0].b === last.b) {
        queue.push(queue.shift());
      }
    }
    last = queue.shift();
    return last;
  };
};

const inRange = (n) => n >= MIN_FACTOR && n <= MAX_FACTOR;

/**
 * A plausible wrong answer for a × b: the result of a neighbouring fact
 * a × (b ± 1) or (a ± 1) × b, factors kept in 1–9, never equal to the correct answer.
 */
export const distractor = ({ a, b }, rng) => {
  const correct = a * b;
  const neighbours = [
    [a, b - 1],
    [a, b + 1],
    [a - 1, b],
    [a + 1, b],
  ]
    .filter(([x, y]) => inRange(x) && inRange(y))
    .map(([x, y]) => x * y)
    .filter((value) => value !== correct);

  const candidates = [...new Set(neighbours)];
  if (candidates.length > 0) {
    return pick(rng, candidates);
  }
  // Unreachable with factors in 1–9, kept as a safety net.
  return correct + 1;
};

/** Two choices (correct + distractor) in random order. */
export const choicesFor = (question, rng) => {
  const wrong = distractor(question, rng);
  return rng() < 0.5 ? [question.answer, wrong] : [wrong, question.answer];
};
