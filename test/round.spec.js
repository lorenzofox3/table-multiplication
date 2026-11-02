import { test } from 'zora';
import { createRng } from '../src/game/random.js';
import { createRound, starsFor, timeLimit } from '../src/game/round.js';

const play = (round, decide) => {
  const questions = [];
  while (!round.isOver()) {
    const q = round.next();
    questions.push(q);
    round.answer(decide(q));
  }
  return questions;
};

test('padawan round serves the 10 facts of the table, keypad input, no timer', ({ eq }) => {
  const round = createRound({ mode: 'padawan', table: 3, rng: createRng(1) });
  const questions = play(round, (q) => q.answer);
  eq(questions.length, 10);
  eq(questions.map((q) => q.b).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  eq(questions.every((q) => q.choices === null && q.timeLimit === null && q.kind === 'standard'), true);
  eq(round.summary().perfect, true);
  eq(round.summary().stars, 3);
});

test('a miss in normal mode does not end the round', ({ eq }) => {
  const round = createRound({ mode: 'advanced', rng: createRng(1) });
  const first = round.next();
  const result = round.answer(first.answer + 1);
  eq(result.correct, false);
  eq(result.expected, first.answer);
  eq(round.isOver(), false);
  const questions = play(round, (q) => q.answer);
  eq(questions.length, 9);
  eq(round.summary().correct, 9);
  eq(round.summary().stars, 2);
  eq(round.summary().perfect, false);
});

test('advanced questions come with two choices including the answer', ({ ok }) => {
  const round = createRound({ mode: 'advanced', rng: createRng(4) });
  play(round, (q) => {
    ok(q.choices.length === 2 && q.choices.includes(q.answer));
    ok(q.timeLimit === 10_000);
    return q.answer;
  });
});

test('advanced round never repeats a fact', ({ eq }) => {
  const round = createRound({ mode: 'advanced', rng: createRng(9) });
  const questions = play(round, () => 0);
  eq(new Set(questions.map((q) => `${q.a}x${q.b}`)).size, 10);
});

test('timeout counts as a miss and is tracked separately', ({ eq }) => {
  const round = createRound({ mode: 'jedi', rng: createRng(1) });
  round.next();
  const result = round.answer(null);
  eq(result.correct, false);
  eq(result.timedOut, true);
  play(round, (q) => q.answer);
  eq(round.summary().timeouts, 1);
  eq(round.summary().misses, 1);
});

test('die hard ends on the first miss, score = correct answers', ({ eq }) => {
  const round = createRound({ mode: 'advanced', variant: 'diehard', rng: createRng(3) });
  let n = 0;
  play(round, (q) => (++n <= 25 ? q.answer : -1));
  eq(round.summary().score, 25);
  eq(round.summary().answered, 26);
  eq(round.summary().stars, null);
});

test('die hard is not available in padawan mode', ({ throws }) => {
  throws(() => createRound({ mode: 'padawan', variant: 'diehard', table: 2, rng: createRng(1) }));
});

test('padawan mode requires a valid table', ({ throws }) => {
  throws(() => createRound({ mode: 'padawan', table: 0, rng: createRng(1) }));
  throws(() => createRound({ mode: 'padawan', table: 11, rng: createRng(1) }));
});

test('jedi targeting: first at question 4 or 5, then every 4 to 7 questions', ({ ok }) => {
  for (let seed = 0; seed < 100; seed++) {
    const round = createRound({ mode: 'jedi', variant: 'diehard', rng: createRng(seed) });
    let n = 0;
    const questions = play(round, (q) => (++n < 60 ? q.answer : -1));
    const targeting = questions.filter((q) => q.kind === 'targeting').map((q) => q.number);
    ok(targeting[0] === 4 || targeting[0] === 5, `seed ${seed}: first at ${targeting[0]}`);
    for (let i = 1; i < targeting.length; i++) {
      const gap = targeting[i] - targeting[i - 1];
      ok(gap >= 4 && gap <= 7, `seed ${seed}: gap ${gap}`);
    }
  }
});

test('fighters destroyed counts correct targeting answers only', ({ eq }) => {
  const round = createRound({ mode: 'jedi', rng: createRng(8) });
  let expected = 0;
  let toggle = false;
  play(round, (q) => {
    if (q.kind !== 'targeting') return q.answer;
    toggle = !toggle;
    if (toggle) expected++;
    return toggle ? q.answer : -1;
  });
  eq(round.summary().fightersDestroyed, expected);
});

test('timeLimit by mode, disabled timers and die hard speed-up', ({ eq }) => {
  eq(timeLimit({ mode: 'padawan', variant: 'normal' }), null);
  eq(timeLimit({ mode: 'advanced', variant: 'normal' }), 10_000);
  eq(timeLimit({ mode: 'jedi', variant: 'normal', correctCount: 50 }), 8_000);
  eq(timeLimit({ mode: 'advanced', variant: 'normal', timersEnabled: false }), null);
  eq(timeLimit({ mode: 'advanced', variant: 'diehard', correctCount: 9 }), 10_000);
  eq(timeLimit({ mode: 'advanced', variant: 'diehard', correctCount: 10 }), 9_000);
  eq(timeLimit({ mode: 'advanced', variant: 'diehard', correctCount: 20 }), 8_100);
  eq(timeLimit({ mode: 'advanced', variant: 'diehard', correctCount: 1000 }), 4_000);
  eq(timeLimit({ mode: 'jedi', variant: 'diehard', correctCount: 1000 }), 3_500);
});

test('starsFor thresholds', ({ eq }) => {
  eq([10, 9, 8, 7, 5, 4, 0].map((c) => starsFor(c, 10)), [3, 2, 2, 1, 1, 0, 0]);
});

test('next() cannot be called twice without answering', ({ throws }) => {
  const round = createRound({ mode: 'advanced', rng: createRng(1) });
  round.next();
  throws(() => round.next());
});
