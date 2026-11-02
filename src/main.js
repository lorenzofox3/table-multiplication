import '@fontsource/orbitron/600.css';
import '@fontsource/orbitron/800.css';
import './styles.css';
import { setSoundEnabled, unlockAudio } from './audio.js';
import { createStore } from './game/storage.js';
import { debugScreen } from './screens/debug.js';
import { endScreen } from './screens/end.js';
import { homeScreen } from './screens/home.js';
import { playScreen } from './screens/play.js';
import { settingsScreen } from './screens/settings.js';
import { tablesScreen } from './screens/tables.js';
import { variantScreen } from './screens/variant.js';
import { setVoiceEnabled } from './speech.js';
import { createStarfield } from './ui/starfield.js';

const SCREENS = {
  home: homeScreen,
  tables: tablesScreen,
  variant: variantScreen,
  play: playScreen,
  end: endScreen,
  settings: settingsScreen,
  debug: debugScreen,
};

const safeStorage = (() => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
})();

const store = createStore(safeStorage);
const root = document.getElementById('app');
const starfield = createStarfield(document.getElementById('stars'));

const applySettings = () => {
  const { settings } = store.get();
  setSoundEnabled(settings.sound);
  setVoiceEnabled(settings.voice);
};
applySettings();

let current = null;

const navigate = (name, params = {}) => {
  current?.destroy?.();
  root.replaceChildren();
  current = SCREENS[name](params, { store, navigate, applySettings });
  root.append(current.el);
  if (current.fullscreen) starfield.stop();
  else starfield.start();
  window.scrollTo(0, 0);
};

// Browsers only allow audio after a user gesture.
document.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
document.addEventListener('keydown', unlockAudio, { once: true });

navigate(new URLSearchParams(location.search).has('debug') ? 'debug' : 'home');
