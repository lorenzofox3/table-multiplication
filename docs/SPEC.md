# Multiplication Table game — Specification

A small PWA to help a 7–8 year old learn the multiplication tables while having fun, in a
space-opera universe inspired by Star Wars.

## Context & constraints

- **Audience**: a child of 7–8 who reads, but slowly. Shared with a small circle (classmates, parents).
- **Hosting**: GitHub Pages, default URL (`/table-multiplication/`).
- **Device**: phone, **portrait** first. Must remain usable on desktop (physical keyboard).
- **Visuals & sounds**: 100 % original, *inspired by* Star Wars. No official logos, artwork or audio.
- **Language**: French UI. All strings live in a single dictionary (`src/i18n.js`) so English can be added later.
- **Text**: minimal. Questions displayed as big numbers (`7 × 8`). Optional speech synthesis reads the question.
- **Persistence**: `localStorage` only (settings, Die hard records, crystals).

## Modes

| | Padawan | Avancé | Jedi |
|---|---|---|---|
| Questions | One table, ×1 to ×10, shuffled | Random among the 81 facts (1–9 × 1–9), no repetition within a round | Same as Avancé |
| Input | Numeric keypad | 2 choices (one plausible distractor) | Numeric keypad |
| Timer | None | ~10 s | ~8 s |
| Normal round | 10 questions | 10 questions | 10 questions |
| Die hard | — | Until the first miss | Until the first miss |

### Common rules

- **Fixed-length rounds** (Normal): a miss plays the failure animation, then the correct answer is shown
  (`7 × 8 = 56`) for ~1.5 s before moving on. The game continues.
- **Timeout** counts as a miss (tracked separately).
- **Die hard** (Avancé & Jedi only): play until the first miss. The time limit shrinks by 10 % every
  10 correct answers (with a floor). The best score per mode is saved.
- **Stars** (Normal): 10/10 → 3, ≥ 8 → 2, ≥ 5 → 1, otherwise 0.
- A parent setting disables all timers.

### Distractors (Avancé)

The wrong choice is a *plausible* mistake: the result of a neighbouring fact — `a×(b±1)` or `(a±1)×b` —
with factors in 1–9, never equal to the correct answer. The side of the correct answer is randomised.

### Padawan scene

A young apprentice holds a green laser sword. A spherical training drone hovers and "charges" (pulsing glow).
- Correct: the drone fires, the apprentice deflects the bolt.
- Miss: the bolt hits the apprentice (a flinch, a puff of smoke — nothing violent).

Each Padawan round picks one of two views at random (50/50) and keeps it for all 10 questions.

### Padawan scene — Levitation

A small alien apprentice (teal skin, pointed ears, dark topknot, deep-blue outfit with a gold sash) holds a
one-hand handstand, the other hand reaching toward four floating objects: a cargo crate, a visored training
helmet, a dome-shaped maintenance droid and a boulder.
- Height = number of correct answers: on the floor at 0, one step higher per correct answer, the highest object
  just under the ceiling at 10. A miss never removes height.
- Waiting: the objects bob out of sync, Force ripples from the raised hand, eyes closed in concentration.
- Correct: hand pulse, teal shimmer, the whole group floats up one step ("whoosh").
- Miss: the apprentice wobbles and tumbles to a sitting position ("oof", comic, nothing painful); the objects crash
  down with a thud, a bounce and dust, the droid looks worried. On the next question the apprentice flips back
  into the handstand and lifts the objects back to their height.
- 10/10: finale — the objects spin in a circle around the apprentice before the end screen.
- Reduced motion: no wobble, bob or bounce; falls and flips are short fades; the finale is a slow glow.

### Avancé scene (first person)

A squad of 3–4 white-armoured troopers in a corridor. Each question, one trooper steps forward and aims
(red laser sight + timer). The player's blue laser sword is at the bottom of the view.
- Correct: the bolt is deflected back, the trooper falls. When the squad is down, a new wave arrives.
- Miss: red flash + shake + 0.5 s fade to black, then respawn. In Die hard: "Tu es tombé…" and the score.

### Jedi scene

A starfighter flies in a trench, **viewed from above**. No steering: the answer is the only input.
- An obstacle comes down the trench during the timer.
- Correct: automatic dodge (lateral roll). Miss/timeout: explosion, immediate respawn (Normal).
- Every 4–7 questions (first one at question 4 or 5), switch to the **cockpit view**: a targeting computer
  shows an enemy fighter wobbling in the crosshair, a lock bar fills with the timer.
  - Correct: lock, shot, enemy explodes. Miss: red flash + cockpit shake.
- End screen also shows "enemy fighters destroyed".

## Progression

- Everything is open from the start.
- A perfect Padawan table (10/10) awards a **kyber crystal** for that table. All 10 crystals → the
  "Chevalier Jedi" title on the home screen.

## Screens

```
Home (title + starfield + collected crystals)
 ├─ Padawan → pick a table (1–10, crystals on completed ones) → game → end
 ├─ Avancé  → Normal / Die hard (+ record) → game → end
 ├─ Jedi    → Normal / Die hard (+ record) → game → end
 └─ ⚙ Settings (long press 2 s)
```

- **End screen**: score, stars, new crystal / new record, fighters destroyed (Jedi); "Rejouer" / "Menu".
- **In game**: a ✕ button quits after confirmation; a mute button is always visible.
- **Settings**: timers on/off, voice on/off, sound on/off, reset progress (with confirmation).

## Accessibility

- Respect `prefers-reduced-motion`: no shakes, flashes replaced by soft fades.
- Never repeated rapid flashing: at most one short flash per failure.
- Big touch targets; keypad usable with a physical keyboard (digits, Backspace, Enter).

## Technical design

- Vanilla JS (ES modules), **Vite** + **vite-plugin-pwa** (Workbox `generateSW`, full precache,
  `autoUpdate`). Manifest: portrait, standalone, dark theme.
- **Rendering**: SVG + Web Animations for characters/UI; Canvas for starfield, trench, lasers, explosions.
- **Sound**: synthesised with the Web Audio API (no audio files). Voice: `speechSynthesis` (fr-FR).
- **Architecture**
  - `src/game/` — pure engine (no DOM): questions, distractors, rounds, scoring, storage.
    Randomness is injected (`rng`) so tests are deterministic.
  - `src/scenes/` — each scene exposes `present(question)`, `threat(durationMs)`, `success()`,
    `failure()`, `destroy()`; the play controller drives them.
  - `src/ui/` — screens and widgets (keypad, choices, modal).
- **Tests**: unit tests of `src/game/` with **zora**. A `?debug` page triggers scene animations on demand.
- **CI**: GitHub Actions — install, test, build, deploy to Pages on every push to `main`.
