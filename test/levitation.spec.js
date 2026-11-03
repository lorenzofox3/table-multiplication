import { test } from 'zora';
import { CEILING_Y, liftFor, MAX_LEVEL, OBJECTS } from '../src/scenes/levitation.js';

test('levitation: objects sit on the floor at level 0', ({ eq }) => {
  eq(OBJECTS.map((object) => liftFor(object, 0)), OBJECTS.map(() => 0));
});

test('levitation: every correct answer lifts every object higher', ({ ok }) => {
  for (const object of OBJECTS) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      ok(liftFor(object, level) > liftFor(object, level - 1), `${object.id} rises at level ${level}`);
    }
  }
});

test('levitation: at 10/10 the highest object is just under the ceiling', ({ ok }) => {
  const tops = OBJECTS.map((object) => object.top - liftFor(object, MAX_LEVEL));
  const highest = Math.min(...tops);
  ok(highest > CEILING_Y, 'no object goes through the ceiling (bob included)');
  ok(highest - 4 > CEILING_Y, 'room left for the bobbing');
  ok(highest < CEILING_Y + 20, 'highest object is near the ceiling');
});
