import { test } from 'zora';
import { createRng } from '../src/game/random.js';
import { allFacts, choicesFor, createFactSource, distractor, tableFacts } from '../src/game/questions.js';

test('tableFacts returns table × 1 … table × 10', ({ eq }) => {
  const facts = tableFacts(7, createRng(1));
  eq(facts.length, 10);
  eq(facts.map((f) => f.b).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  eq(facts.every((f) => f.a === 7 && f.answer === 7 * f.b), true);
});

test('allFacts covers the 81 facts of 1–9', ({ eq }) => {
  const facts = allFacts();
  eq(facts.length, 81);
  eq(new Set(facts.map((f) => `${f.a}x${f.b}`)).size, 81);
});

test('createFactSource does not repeat a fact before the 81 are served', ({ eq }) => {
  const next = createFactSource(createRng(5));
  const served = Array.from({ length: 81 }, () => {
    const f = next();
    return `${f.a}x${f.b}`;
  });
  eq(new Set(served).size, 81);
});

test('createFactSource never serves the same fact twice in a row across reshuffles', ({ ok }) => {
  for (let seed = 0; seed < 50; seed++) {
    const next = createFactSource(createRng(seed));
    let previous = null;
    for (let i = 0; i < 81 * 3; i++) {
      const f = next();
      ok(!(previous && previous.a === f.a && previous.b === f.b), `seed ${seed} index ${i}`);
      previous = f;
    }
  }
});

test('distractor is a neighbouring fact result, never the correct answer', ({ ok }) => {
  const rng = createRng(11);
  for (const fact of allFacts()) {
    const neighbours = [
      [fact.a, fact.b - 1],
      [fact.a, fact.b + 1],
      [fact.a - 1, fact.b],
      [fact.a + 1, fact.b],
    ]
      .filter(([x, y]) => x >= 1 && x <= 9 && y >= 1 && y <= 9)
      .map(([x, y]) => x * y);
    for (let i = 0; i < 10; i++) {
      const wrong = distractor(fact, rng);
      ok(wrong !== fact.answer, `${fact.a}×${fact.b} distractor differs from answer`);
      ok(neighbours.includes(wrong), `${fact.a}×${fact.b} → ${wrong} is a neighbour`);
    }
  }
});

test('choicesFor contains the answer and puts it on both sides over time', ({ ok }) => {
  const rng = createRng(2);
  const question = { a: 7, b: 8, answer: 56 };
  const sides = new Set();
  for (let i = 0; i < 50; i++) {
    const choices = choicesFor(question, rng);
    ok(choices.length === 2 && choices.includes(56));
    sides.add(choices.indexOf(56));
  }
  ok(sides.has(0) && sides.has(1));
});
