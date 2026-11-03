import { test } from 'zora';
import { facing, muzzleAt, SLOTS } from '../src/scenes/plains.js';

test('plains: every droid aims toward the middle of the view', ({ ok }) => {
  for (const slot of SLOTS) {
    const muzzle = muzzleAt(slot);
    ok(Math.abs(muzzle.x - 180) < Math.abs(slot.x - 180), `droid at x=${slot.x} points inward`);
  }
});

test('plains: droids on the left half are mirrored', ({ eq }) => {
  eq(SLOTS.map(facing), [-1, -1, 1, 1]);
});
