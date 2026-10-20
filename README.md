# UFLI Parent Coach — core engine

TypeScript domain core for a parent-facing UFLI Foundations coaching web app. No UI yet; every module
returns plain data (plus plain-text previews) for a front end to render.

```
npm install
npm test        # vitest
npm run demo    # placement → flashcards → blending tracker, printed to the terminal
```

| Module | Entry points |
| --- | --- |
| `src/content` | `LESSONS`, `getLesson`, `PHONEME_SCRIPTS`, `segmentWord`, `soundOut`, `isDecodableAt` |
| `src/diagnostic` | `DIAGNOSTIC_ITEMS`, `GATES`, `scoreDiagnostic(responses)` → `PlacementReport` |
| `src/tools` | `buildFlashcardBlueprint(opts)`, `buildBlendingTracker({ lesson })`, `buildWordChain`, `fitGrid` |

## Placement logic

Each of Lessons 1-10 has a gate of 2-8 items. A gate is mastered at ≥ 80% with every item given; the
child starts at the first gate not mastered (a gate left unfinished counts as not mastered).
Passing every gate gives `startLesson: 11, beyondContent: true`. The report also includes a
short-a / short-i profile, gates already mastered past the start lesson, and coaching notes
based on the error types the parent recorded (letter name, added "uh", vowel mix-up, …).

## Content notes

The grapheme order follows the published UFLI Foundations scope & sequence (a, m, s, t, VC/CVC,
p, f, i, n, CVC practice). Word lists, pronunciation scripts, and keywords are original to this
project, not UFLI materials, and this project is not affiliated with the University of Florida
Literacy Institute. Tests check that every word only uses letters taught by its lesson.
