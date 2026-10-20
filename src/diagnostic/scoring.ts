import type { ShortVowel } from '../content/types.js';
import { LAST_LESSON } from '../content/lessons.js';
import { DIAGNOSTIC_ITEMS, GATES, type DiagnosticItem } from './items.js';

export const MASTERY_THRESHOLD = 0.8;
export const DEVELOPING_THRESHOLD = 0.5;

export type MasteryLevel = 'mastered' | 'developing' | 'not-yet' | 'not-assessed';

/** What the parent observed when the child got an item wrong. */
export type ErrorType =
  | 'letter-name' // said "em" instead of /m/
  | 'added-schwa' // said "tuh" instead of /t/
  | 'vowel-confusion' // mixed up /ă/ and /ĭ/
  | 'sounded-out-no-blend' // said each sound but could not blend them
  | 'guessed-word' // said a different real word (e.g. "mat" for "map")
  | 'no-response'
  | 'other';

export interface ItemResponse {
  itemId: string;
  correct: boolean;
  errorType?: ErrorType;
}

export interface GateResult {
  lesson: number;
  skill: string;
  correct: number;
  attempted: number;
  total: number;
  accuracy: number | null;
  level: MasteryLevel;
}

export interface VowelProfile {
  vowel: ShortVowel;
  correct: number;
  attempted: number;
  total: number;
  accuracy: number | null;
  level: MasteryLevel;
}

export interface PlacementReport {
  /** The UFLI lesson to start teaching at. */
  startLesson: number;
  /** True when the child passed every gate and should start after Lesson 10. */
  beyondContent: boolean;
  reason: string;
  gates: GateResult[];
  shortVowels: VowelProfile[];
  /** Gates after `startLesson` the child already mastered — candidates for faster pacing. */
  laterStrengths: number[];
  coachingNotes: string[];
}

const COACHING_NOTES: Record<ErrorType, string> = {
  'letter-name':
    'Your child gave letter names instead of sounds. During practice, say only the sound ("/mmm/") and praise sounds, not names.',
  'added-schwa':
    'Your child added "uh" to sounds (like "tuh"). Model clipped stop sounds — whisper /t/ and /p/ — and stretch continuous ones (/mmm/, /sss/).',
  'vowel-confusion':
    'Your child mixed up /ă/ and /ĭ/. Use the mouth cue: jaw drops for /ă/, small smile for /ĭ/. Practice vowel-swap pairs like sat → sit.',
  'sounded-out-no-blend':
    'Your child knows the sounds but did not blend them. Use the blending tracker and keep sounds connected ("sssăăăt") instead of pausing between them.',
  'guessed-word':
    'Your child guessed familiar words. Encourage touching each letter and saying every sound before reading the whole word.',
  'no-response':
    'Some items got no response. Keep sessions short and upbeat; stop and try again another day if your child is tired.',
  other: '',
};

function levelFor(correct: number, attempted: number, total: number): MasteryLevel {
  if (attempted < total || total === 0) return 'not-assessed';
  const accuracy = correct / total;
  if (accuracy >= MASTERY_THRESHOLD) return 'mastered';
  if (accuracy >= DEVELOPING_THRESHOLD) return 'developing';
  return 'not-yet';
}

function tally(items: DiagnosticItem[], byId: Map<string, ItemResponse>) {
  let correct = 0;
  let attempted = 0;
  for (const item of items) {
    const response = byId.get(item.id);
    if (!response) continue;
    attempted += 1;
    if (response.correct) correct += 1;
  }
  return { correct, attempted, total: items.length, accuracy: attempted ? correct / attempted : null };
}

function indexResponses(responses: ItemResponse[]): Map<string, ItemResponse> {
  const known = new Set(DIAGNOSTIC_ITEMS.map((i) => i.id));
  const byId = new Map<string, ItemResponse>();
  for (const response of responses) {
    if (!known.has(response.itemId)) {
      throw new Error(`Unknown diagnostic item "${response.itemId}".`);
    }
    byId.set(response.itemId, response); // a re-scored item replaces the earlier answer
  }
  return byId;
}

/**
 * Scores a diagnostic session and places the child at the first lesson whose
 * gate is not yet mastered. Gates that were not fully administered count as
 * not mastered, so a partial session never places a child too far ahead.
 */
export function scoreDiagnostic(responses: ItemResponse[]): PlacementReport {
  const byId = indexResponses(responses);

  const gates: GateResult[] = GATES.map((gate) => {
    const t = tally(
      DIAGNOSTIC_ITEMS.filter((i) => i.gate === gate.lesson),
      byId,
    );
    return { lesson: gate.lesson, skill: gate.skill, ...t, level: levelFor(t.correct, t.attempted, t.total) };
  });

  const shortVowels: VowelProfile[] = (['a', 'i'] as const).map((vowel) => {
    const t = tally(
      DIAGNOSTIC_ITEMS.filter((i) => i.vowel === vowel),
      byId,
    );
    return { vowel, ...t, level: levelFor(t.correct, t.attempted, t.total) };
  });

  const firstGap = gates.find((g) => g.level !== 'mastered');
  const startLesson = firstGap ? firstGap.lesson : LAST_LESSON + 1;
  const reason = firstGap
    ? firstGap.level === 'not-assessed'
      ? `Lesson ${firstGap.lesson} (${firstGap.skill}) was not fully assessed, so teaching starts there.`
      : `Your child has not yet mastered Lesson ${firstGap.lesson}: ${firstGap.skill} (${firstGap.correct}/${firstGap.total} correct).`
    : `Your child mastered every skill in Lessons 1-${LAST_LESSON}, including short a and short i.`;

  const laterStrengths = gates.filter((g) => g.lesson > startLesson && g.level === 'mastered').map((g) => g.lesson);

  const errorTypes = new Set(
    [...byId.values()].flatMap((r) => (!r.correct && r.errorType ? [r.errorType] : [])),
  );
  const coachingNotes = [...errorTypes].map((e) => COACHING_NOTES[e]).filter((note) => note.length > 0);

  return {
    startLesson,
    beyondContent: !firstGap,
    reason,
    gates,
    shortVowels,
    laterStrengths,
    coachingNotes,
  };
}
