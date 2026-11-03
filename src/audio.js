/**
 * Sound effects synthesised with the Web Audio API — no audio files.
 * The AudioContext is created lazily on the first user gesture (browser autoplay policy).
 */
let ctx = null;
let master = null;
let enabled = true;

const context = () => {
  if (!ctx) {
    const AudioCtx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

export const unlockAudio = () => {
  if (enabled) context();
};

export const setSoundEnabled = (value) => {
  enabled = value;
};

const play = (build) => {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;
  try {
    build(audio, audio.currentTime);
  } catch {
    // never let a sound break the game
  }
};

const envelope = (audio, t, { attack = 0.005, hold = 0, release = 0.2, peak = 1 }) => {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  gain.connect(master);
  return gain;
};

const tone = (audio, t, { type = 'sine', from, to = from, duration, peak = 0.6, attack, release }) => {
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  const gain = envelope(audio, t, { attack, release: release ?? duration, peak });
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + duration + 0.05);
};

let noiseBuffer = null;
const noise = (audio, t, { duration, filterFrom, filterTo, peak = 0.8 }) => {
  if (!noiseBuffer) {
    noiseBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFrom, t);
  filter.frequency.exponentialRampToValueAtTime(filterTo, t + duration);
  const gain = envelope(audio, t, { attack: 0.01, release: duration, peak });
  source.connect(filter).connect(gain);
  source.start(t);
  source.stop(t + duration + 0.05);
};

/** "Pew": a falling square sweep. */
export const blaster = () =>
  play((audio, t) => tone(audio, t, { type: 'square', from: 1400, to: 180, duration: 0.18, peak: 0.25 }));

/** Laser sword swing: a modulated sawtooth hum. */
export const swing = () =>
  play((audio, t) => {
    const osc = audio.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(160, t + 0.12);
    osc.frequency.linearRampToValueAtTime(80, t + 0.35);
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = envelope(audio, t, { attack: 0.03, hold: 0.1, release: 0.25, peak: 0.35 });
    osc.connect(filter).connect(gain);
    osc.start(t);
    osc.stop(t + 0.45);
  });

/** Bolt deflected by the sword: a bright zap. */
export const deflect = () =>
  play((audio, t) => {
    tone(audio, t, { type: 'sawtooth', from: 2200, to: 600, duration: 0.12, peak: 0.25 });
    noise(audio, t, { duration: 0.1, filterFrom: 6000, filterTo: 2000, peak: 0.3 });
  });

/** Player hit: a dull thud. */
export const hit = () =>
  play((audio, t) => {
    tone(audio, t, { type: 'triangle', from: 220, to: 60, duration: 0.3, peak: 0.6 });
    noise(audio, t, { duration: 0.25, filterFrom: 1200, filterTo: 200, peak: 0.4 });
  });

export const explosion = () =>
  play((audio, t) => {
    noise(audio, t, { duration: 1.1, filterFrom: 3000, filterTo: 80, peak: 0.9 });
    tone(audio, t, { type: 'sine', from: 120, to: 35, duration: 0.8, peak: 0.6 });
  });

/** Success chime: two rising notes. */
export const chime = () =>
  play((audio, t) => {
    tone(audio, t, { type: 'triangle', from: 784, duration: 0.18, peak: 0.3 });
    tone(audio, t + 0.1, { type: 'triangle', from: 1175, duration: 0.3, peak: 0.3 });
  });

/** Targeting computer lock: short beeps. */
export const lockOn = () =>
  play((audio, t) => {
    for (let i = 0; i < 3; i++) tone(audio, t + i * 0.08, { type: 'square', from: 1760, duration: 0.05, peak: 0.12 });
  });

export const click = () => play((audio, t) => tone(audio, t, { type: 'sine', from: 660, duration: 0.04, peak: 0.15 }));

export const whoosh = () =>
  play((audio, t) => noise(audio, t, { duration: 0.5, filterFrom: 400, filterTo: 3000, peak: 0.35 }));

export const fanfare = () =>
  play((audio, t) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(audio, t + i * 0.12, { type: 'triangle', from: f, duration: i === 3 ? 0.6 : 0.16, peak: 0.3 }),
    );
  });

/** Heavy object landing on the floor: a low thump. */
export const thud = () =>
  play((audio, t) => {
    tone(audio, t, { type: 'sine', from: 150, to: 45, duration: 0.22, peak: 0.7 });
    noise(audio, t, { duration: 0.14, filterFrom: 900, filterTo: 120, peak: 0.35 });
  });

/** Comic "oof": a short voiced drop through a vowel-like filter. */
export const oof = () =>
  play((audio, t) => {
    const osc = audio.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(190, t + 0.22);
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 3;
    const gain = envelope(audio, t, { attack: 0.02, hold: 0.06, release: 0.18, peak: 0.45 });
    osc.connect(filter).connect(gain);
    osc.start(t);
    osc.stop(t + 0.32);
  });
