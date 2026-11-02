import { test } from 'zora';
import { createRng, randomInt, shuffle } from '../src/game/random.js';

test('createRng is deterministic for a given seed', ({ eq }) => {
  const a = createRng(42);
  const b = createRng(42);
  eq([a(), a(), a()], [b(), b(), b()]);
});

test('createRng produces floats in [0, 1)', ({ ok }) => {
  const rng = createRng(1);
  const values = Array.from({ length: 1000 }, rng);
  ok(values.every((v) => v >= 0 && v < 1));
});

test('randomInt stays within inclusive bounds and reaches both ends', ({ ok }) => {
  const rng = createRng(7);
  const values = new Set(Array.from({ length: 500 }, () => randomInt(rng, 4, 7)));
  ok([...values].every((v) => v >= 4 && v <= 7));
  ok(values.has(4) && values.has(7));
});

test('shuffle keeps the same elements and does not mutate the input', ({ eq }) => {
  const input = [1, 2, 3, 4, 5];
  const output = shuffle(createRng(3), input);
  eq(input, [1, 2, 3, 4, 5]);
  eq([...output].sort(), [1, 2, 3, 4, 5]);
});
