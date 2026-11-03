import { test } from 'zora';
import { ROUND_LENGTH } from '../src/game/round.js';
import { smokeLevel, ZONES, zoneFor } from '../src/scenes/race.js';

test('race: the four zones cover exactly one round', ({ eq }) => {
  eq(ZONES.reduce((sum, zone) => sum + zone.questions, 0), ROUND_LENGTH);
  eq(ZONES.map((zone) => zone.id), ['desert', 'cave', 'canyon', 'arrival']);
});

test('race: zone by question number is 3 / 3 / 2 / 2', ({ eq }) => {
  eq(
    Array.from({ length: ROUND_LENGTH }, (_, i) => zoneFor(i)),
    ['desert', 'desert', 'desert', 'cave', 'cave', 'cave', 'canyon', 'canyon', 'arrival', 'arrival'],
  );
});

test('race: past the end of the track the pod stays at the arrival', ({ eq }) => {
  eq(zoneFor(ROUND_LENGTH), 'arrival');
  eq(zoneFor(-1), 'desert');
});

test('race: the smoke trail starts at 1 miss and thickens at 3 and 5', ({ eq }) => {
  eq(Array.from({ length: 11 }, (_, misses) => smokeLevel(misses)), [0, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3]);
});
