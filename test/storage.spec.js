import { test } from 'zora';
import { STORAGE_KEY, applySummary, createStore, defaultState, isKnight } from '../src/game/storage.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
};

const summary = (overrides) => ({
  mode: 'advanced',
  variant: 'normal',
  table: null,
  score: 0,
  perfect: false,
  ...overrides,
});

test('store starts with defaults on empty storage', ({ eq }) => {
  eq(createStore(memoryStorage()).get(), defaultState());
});

test('store survives corrupted or unavailable storage', ({ eq }) => {
  eq(createStore(memoryStorage({ [STORAGE_KEY]: '{not json' })).get(), defaultState());
  const throwing = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  const store = createStore(throwing);
  eq(store.get(), defaultState());
  eq(store.setSetting('sound', false).settings.sound, false);
});

test('store sanitizes unexpected values', ({ eq }) => {
  const raw = JSON.stringify({
    settings: { timers: 'yes', voice: true },
    records: { advanced: -3, jedi: 12 },
    crystals: [3, 3, 42, 'x', 1],
  });
  const state = createStore(memoryStorage({ [STORAGE_KEY]: raw })).get();
  eq(state.settings, { timers: true, voice: true, sound: true });
  eq(state.records, { advanced: 0, jedi: 12 });
  eq(state.crystals, [1, 3]);
});

test('settings are persisted', ({ eq }) => {
  const storage = memoryStorage();
  createStore(storage).setSetting('timers', false);
  eq(createStore(storage).get().settings.timers, false);
});

test('unknown setting throws', ({ throws }) => {
  throws(() => createStore(memoryStorage()).setSetting('nope', true));
});

test('die hard record only when beaten', ({ eq }) => {
  const storage = memoryStorage();
  const store = createStore(storage);
  eq(store.recordRound(summary({ variant: 'diehard', score: 12 })).newRecord, true);
  eq(store.recordRound(summary({ variant: 'diehard', score: 12 })).newRecord, false);
  eq(store.recordRound(summary({ variant: 'diehard', score: 8 })).newRecord, false);
  eq(store.recordRound(summary({ mode: 'jedi', variant: 'diehard', score: 3 })).newRecord, true);
  eq(createStore(storage).get().records, { advanced: 12, jedi: 3 });
});

test('normal rounds never set a record', ({ eq }) => {
  eq(applySummary(defaultState(), summary({ score: 10 })).newRecord, false);
});

test('a perfect padawan table awards its crystal once', ({ eq }) => {
  const store = createStore(memoryStorage());
  eq(store.recordRound(summary({ mode: 'padawan', table: 4, perfect: false })).newCrystal, false);
  eq(store.recordRound(summary({ mode: 'padawan', table: 4, perfect: true })).newCrystal, true);
  eq(store.recordRound(summary({ mode: 'padawan', table: 4, perfect: true })).newCrystal, false);
  eq(store.get().crystals, [4]);
});

test('collecting the 10th crystal knights the player', ({ eq }) => {
  let state = { ...defaultState(), crystals: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
  eq(isKnight(state), false);
  const result = applySummary(state, summary({ mode: 'padawan', table: 10, perfect: true }));
  eq(result.knighted, true);
  eq(isKnight(result.state), true);
});

test('reset progress keeps settings', ({ eq }) => {
  const store = createStore(memoryStorage());
  store.setSetting('voice', true);
  store.recordRound(summary({ variant: 'diehard', score: 5 }));
  store.recordRound(summary({ mode: 'padawan', table: 2, perfect: true }));
  const state = store.resetProgress();
  eq(state.settings.voice, true);
  eq(state.records, { advanced: 0, jedi: 0 });
  eq(state.crystals, []);
});
