import { randomInt } from './random.js';
import { choicesFor, createFactSource, tableFacts } from './questions.js';

export const MODES = Object.freeze({ padawan: 'padawan', advanced: 'advanced', jedi: 'jedi' });
export const VARIANTS = Object.freeze({ normal: 'normal', diehard: 'diehard' });

export const ROUND_LENGTH = 10;

const BASE_TIME_LIMIT = { padawan: null, advanced: 10_000, jedi: 8_000 };
const MIN_TIME_LIMIT = { padawan: null, advanced: 4_000, jedi: 3_500 };
const DIEHARD_SPEEDUP_EVERY = 10;
const DIEHARD_SPEEDUP_FACTOR = 0.9;

const FIRST_TARGETING = [4, 5];
const TARGETING_GAP = [4, 7];

export const supportsDiehard = (mode) => mode !== MODES.padawan;

/** Time limit in ms for the next question, or null when there is no timer. */
export const timeLimit = ({ mode, variant, correctCount = 0, timersEnabled = true }) => {
  const base = BASE_TIME_LIMIT[mode];
  if (!timersEnabled || base == null) {
    return null;
  }
  if (variant !== VARIANTS.diehard) {
    return base;
  }
  const steps = Math.floor(correctCount / DIEHARD_SPEEDUP_EVERY);
  return Math.max(MIN_TIME_LIMIT[mode], Math.round(base * DIEHARD_SPEEDUP_FACTOR ** steps));
};

/** 10/10 → 3, ≥ 8 → 2, ≥ 5 → 1, otherwise 0. */
export const starsFor = (correct, total) => {
  if (total <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
};

/**
 * Jedi mode: question numbers (1-based) that are played in the cockpit "targeting" view.
 * The first one is question 4 or 5, then every 4 to 7 questions.
 */
const createTargetingSchedule = (rng) => {
  let next = randomInt(rng, ...FIRST_TARGETING);
  return (questionNumber) => {
    if (questionNumber !== next) return false;
    next += randomInt(rng, ...TARGETING_GAP);
    return true;
  };
};

const createQuestionSource = ({ mode, table, rng }) => {
  if (mode === MODES.padawan) {
    const facts = tableFacts(table, rng);
    let index = 0;
    return () => facts[index++];
  }
  return createFactSource(rng);
};

/**
 * A game round: serves questions one by one and records answers.
 *
 * @param {object} options
 * @param {'padawan'|'advanced'|'jedi'} options.mode
 * @param {'normal'|'diehard'} [options.variant]
 * @param {number} [options.table] required in padawan mode (1–10)
 * @param {boolean} [options.timersEnabled]
 * @param {() => number} options.rng
 */
export const createRound = ({ mode, variant = VARIANTS.normal, table, timersEnabled = true, rng }) => {
  if (!MODES[mode]) throw new Error(`Unknown mode: ${mode}`);
  if (variant === VARIANTS.diehard && !supportsDiehard(mode)) {
    throw new Error(`Die hard is not available in ${mode} mode`);
  }
  if (mode === MODES.padawan && !(table >= 1 && table <= 10)) {
    throw new Error(`Invalid table: ${table}`);
  }

  const nextFact = createQuestionSource({ mode, table, rng });
  const isTargeting = mode === MODES.jedi ? createTargetingSchedule(rng) : () => false;

  let current = null;
  let answered = 0;
  let correct = 0;
  let timeouts = 0;
  let fightersDestroyed = 0;
  let over = false;

  const isOver = () => over;

  const next = () => {
    if (over) throw new Error('Round is over');
    if (current) throw new Error('Current question has not been answered');
    const number = answered + 1;
    const fact = nextFact();
    current = {
      ...fact,
      number,
      kind: isTargeting(number) ? 'targeting' : 'standard',
      choices: mode === MODES.advanced ? choicesFor(fact, rng) : null,
      timeLimit: timeLimit({ mode, variant, correctCount: correct, timersEnabled }),
    };
    return current;
  };

  /** @param {number|null} value the given answer, null on timeout */
  const answer = (value) => {
    if (!current) throw new Error('No question to answer');
    const question = current;
    current = null;
    answered++;

    const timedOut = value == null;
    const isCorrect = !timedOut && Number(value) === question.answer;
    if (isCorrect) {
      correct++;
      if (question.kind === 'targeting') fightersDestroyed++;
    }
    if (timedOut) timeouts++;

    over = variant === VARIANTS.diehard ? !isCorrect : answered >= ROUND_LENGTH;

    return { question, correct: isCorrect, timedOut, expected: question.answer, over };
  };

  const progress = () => ({
    answered,
    correct,
    total: variant === VARIANTS.diehard ? null : ROUND_LENGTH,
  });

  const summary = () => ({
    mode,
    variant,
    table: mode === MODES.padawan ? table : null,
    answered,
    correct,
    misses: answered - correct,
    timeouts,
    fightersDestroyed,
    score: correct,
    stars: variant === VARIANTS.normal ? starsFor(correct, ROUND_LENGTH) : null,
    perfect: variant === VARIANTS.normal && correct === ROUND_LENGTH,
  });

  return { next, answer, isOver, progress, summary };
};
