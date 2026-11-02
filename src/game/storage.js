import { MODES, VARIANTS } from './round.js';

export const STORAGE_KEY = 'table-multiplication:v1';
export const CRYSTAL_COUNT = 10;

export const defaultState = () => ({
  settings: { timers: true, voice: false, sound: true },
  records: { advanced: 0, jedi: 0 },
  crystals: [],
});

const sanitize = (raw) => {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const settings = { ...base.settings };
  for (const key of Object.keys(settings)) {
    if (typeof raw.settings?.[key] === 'boolean') settings[key] = raw.settings[key];
  }
  const records = { ...base.records };
  for (const key of Object.keys(records)) {
    const value = raw.records?.[key];
    if (Number.isInteger(value) && value >= 0) records[key] = value;
  }
  const crystals = Array.isArray(raw.crystals)
    ? [...new Set(raw.crystals.filter((t) => Number.isInteger(t) && t >= 1 && t <= CRYSTAL_COUNT))].sort(
        (x, y) => x - y,
      )
    : [];
  return { settings, records, crystals };
};

/**
 * Pure: applies a round summary to the state.
 * Returns the new state and what was earned.
 */
export const applySummary = (state, summary) => {
  let newRecord = false;
  let newCrystal = false;
  let records = state.records;
  let crystals = state.crystals;

  if (summary.variant === VARIANTS.diehard && summary.score > (state.records[summary.mode] ?? 0)) {
    records = { ...records, [summary.mode]: summary.score };
    newRecord = true;
  }
  if (summary.mode === MODES.padawan && summary.perfect && !crystals.includes(summary.table)) {
    crystals = [...crystals, summary.table].sort((x, y) => x - y);
    newCrystal = true;
  }
  return {
    state: { ...state, records, crystals },
    newRecord,
    newCrystal,
    knighted: newCrystal && crystals.length === CRYSTAL_COUNT,
  };
};

export const isKnight = (state) => state.crystals.length === CRYSTAL_COUNT;

/**
 * Persistent store backed by a Web Storage–like object.
 * Every access is guarded: the app keeps working (in memory) if storage is unavailable.
 */
export const createStore = (storage) => {
  const read = () => {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      return sanitize(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultState();
    }
  };

  let state = read();

  const write = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or blocked: keep the in-memory state
    }
  };

  return {
    get: () => state,
    setSetting(key, value) {
      if (!(key in state.settings)) throw new Error(`Unknown setting: ${key}`);
      state = { ...state, settings: { ...state.settings, [key]: Boolean(value) } };
      write();
      return state;
    },
    recordRound(summary) {
      const result = applySummary(state, summary);
      state = result.state;
      write();
      return result;
    },
    resetProgress() {
      state = { ...defaultState(), settings: state.settings };
      write();
      return state;
    },
  };
};
