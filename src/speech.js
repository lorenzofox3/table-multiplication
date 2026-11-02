import { lang, t } from './i18n.js';

let enabled = false;

export const setVoiceEnabled = (value) => {
  enabled = value;
  if (!value) globalThis.speechSynthesis?.cancel();
};

/** Reads "a fois b" aloud, if voice is enabled and speech synthesis is available. */
export const speakQuestion = ({ a, b }) => {
  const synth = globalThis.speechSynthesis;
  if (!enabled || !synth) return;
  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(t.speak(a, b));
    utterance.lang = lang;
    utterance.rate = 0.9;
    synth.speak(utterance);
  } catch {
    // speech is a nice-to-have
  }
};
