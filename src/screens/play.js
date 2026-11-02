import * as sfx from '../audio.js';
import { pick, createRng } from '../game/random.js';
import { createRound, ROUND_LENGTH } from '../game/round.js';
import { t } from '../i18n.js';
import { createJediScene } from '../scenes/jedi.js';
import { createPadawanScene } from '../scenes/padawan.js';
import { createTroopersScene } from '../scenes/troopers.js';
import { wait } from '../scenes/fx.js';
import { speakQuestion } from '../speech.js';
import { createChoices } from '../ui/choices.js';
import { h } from '../ui/dom.js';
import { icons } from '../ui/icons.js';
import { createKeypad } from '../ui/keypad.js';
import { confirmDialog } from '../ui/modal.js';

const CORRECTION_MS = 1600;
const ABORTED = Symbol('aborted');

const SCENES = {
  padawan: createPadawanScene,
  advanced: createTroopersScene,
  jedi: createJediScene,
};

export const playScreen = (params, { store, navigate, applySettings }) => {
  const { mode, variant, table } = params;
  const rng = createRng();
  const round = createRound({ mode, variant, table, timersEnabled: store.get().settings.timers, rng });
  let alive = true;
  let pendingAnswer = null;

  // --- layout ----------------------------------------------------------------

  const progress = h('div', { class: 'hud-progress' });
  const muteButton = h('button', { type: 'button', class: 'icon-btn' });
  const renderMute = () => {
    const on = store.get().settings.sound;
    muteButton.innerHTML = on ? icons.soundOn : icons.soundOff;
    muteButton.setAttribute('aria-label', on ? t.mute : t.unmute);
  };
  muteButton.addEventListener('click', () => {
    store.setSetting('sound', !store.get().settings.sound);
    applySettings();
    renderMute();
  });
  renderMute();

  const quitButton = h('button', {
    type: 'button',
    class: 'icon-btn',
    'aria-label': t.quit,
    html: icons.close,
    onClick: async () => {
      if (await confirmDialog(t.quitConfirm)) leave('home');
    },
  });

  const timerFill = h('div', { class: 'timer-fill' });
  const timerBar = h('div', { class: 'timer', 'aria-hidden': 'true' }, timerFill);
  const sceneHost = h('div', { class: 'scene-host' });
  const factors = h('span', { class: 'q-factors' });
  const slot = h('span', { class: 'q-slot' });
  const feedback = h('span', { class: 'q-feedback', role: 'status' });
  const questionLine = h('div', { class: 'question', 'aria-live': 'polite' }, factors, h('span', { class: 'q-eq' }, '='), slot, feedback);

  const usesChoices = mode === 'advanced';
  const input = usesChoices
    ? createChoices({ onPick: (value) => resolveAnswer(value) })
    : createKeypad({
        onChange: (value) => {
          slot.textContent = value || '?';
          slot.classList.toggle('is-empty', !value);
        },
        onSubmit: (value) => resolveAnswer(value),
      });
  input.disable();

  const el = h(
    'main',
    { class: `screen play mode-${mode}` },
    h('div', { class: 'hud' }, quitButton, progress, muteButton),
    timerBar,
    sceneHost,
    questionLine,
    h('div', { class: 'input-area' }, input.el),
  );

  const scene = SCENES[mode](sceneHost, { rng });

  // --- helpers -----------------------------------------------------------------

  const renderProgress = () => {
    const { answered, correct } = round.progress();
    progress.textContent = variant === 'diehard' ? `★ ${correct}` : `${Math.min(answered + 1, ROUND_LENGTH)} / ${ROUND_LENGTH}`;
  };

  let timerAnimation = null;
  const startTimer = (ms) => {
    timerAnimation?.cancel();
    timerBar.classList.toggle('is-hidden', !ms);
    if (!ms) return;
    timerAnimation = timerFill.animate(
      [
        { transform: 'scaleX(1)', backgroundColor: 'var(--timer-ok)' },
        { transform: 'scaleX(0.35)', backgroundColor: 'var(--timer-warn)', offset: 0.65 },
        { transform: 'scaleX(0)', backgroundColor: 'var(--timer-late)' },
      ],
      { duration: ms, fill: 'forwards', easing: 'linear' },
    );
  };
  const stopTimer = () => timerAnimation?.pause();

  const waitForAnswer = (limit) =>
    new Promise((resolve) => {
      const timeout = limit ? setTimeout(() => resolveAnswer(null), limit) : null;
      pendingAnswer = (value) => {
        clearTimeout(timeout);
        pendingAnswer = null;
        resolve(value);
      };
    });

  function resolveAnswer(value) {
    pendingAnswer?.(value);
  }

  const showQuestion = (question) => {
    factors.textContent = `${question.a} × ${question.b}`;
    slot.textContent = '?';
    slot.className = 'q-slot is-empty';
    feedback.textContent = '';
    questionLine.classList.remove('is-correct', 'is-wrong');
    if (usesChoices) input.set(question.choices);
  };

  const showResult = (result, given) => {
    if (result.correct) {
      questionLine.classList.add('is-correct');
      slot.textContent = String(result.expected);
      slot.classList.remove('is-empty');
      feedback.textContent = pick(Math.random, t.wellDone);
    } else {
      questionLine.classList.add('is-wrong');
      feedback.textContent = result.timedOut ? t.timeUp : '';
      if (usesChoices) input.mark(given, result.expected);
    }
  };

  const showCorrection = (result) => {
    slot.textContent = String(result.expected);
    slot.classList.remove('is-empty');
    slot.classList.add('is-correction');
  };

  function leave(screen, screenParams) {
    if (!alive) return;
    alive = false;
    pendingAnswer?.(ABORTED);
    navigate(screen, screenParams);
  }

  // --- game loop -------------------------------------------------------------------

  const run = async () => {
    while (alive && !round.isOver()) {
      const question = round.next();
      renderProgress();
      showQuestion(question);
      timerBar.classList.toggle('is-hidden', !question.timeLimit);
      timerAnimation?.cancel();
      await scene.present(question);
      if (!alive) return;

      speakQuestion(question);
      input.enable();
      scene.threat(question.timeLimit);
      startTimer(question.timeLimit);
      const given = await waitForAnswer(question.timeLimit);
      if (given === ABORTED || !alive) return;
      input.disable();
      stopTimer();

      const result = round.answer(given);
      showResult(result, given);
      if (result.correct) {
        sfx.chime();
        await scene.success();
      } else {
        await scene.failure();
        if (!alive) return;
        showCorrection(result);
        await wait(CORRECTION_MS);
      }
    }
    if (!alive) return;
    const summary = round.summary();
    const outcome = store.recordRound(summary);
    leave('end', { summary, outcome, params });
  };

  // start after the screen is mounted
  requestAnimationFrame(() => run().catch((error) => console.error(error)));

  return {
    el,
    fullscreen: true,
    destroy() {
      alive = false;
      pendingAnswer?.(ABORTED);
      timerAnimation?.cancel();
      input.destroy();
      scene.destroy();
      globalThis.speechSynthesis?.cancel();
    },
  };
};
