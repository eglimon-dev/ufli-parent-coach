import type { GraphemeId, ShortVowel } from '../content/types.js';
import { PHONEME_SCRIPTS } from '../content/phonemes.js';
import { soundOut } from '../content/lessons.js';

export type ItemSkill =
  | 'letter-sound' // child sees a letter and says its sound
  | 'medial-vowel' // parent says a word aloud; child names the middle sound
  | 'decode-real' // child reads a real word
  | 'decode-pseudo' // child reads a nonsense word
  | 'vowel-discrimination'; // parent says a word; child points to the matching card

export interface DiagnosticItem {
  id: string;
  /** The placement gate (lesson number) this item checks. */
  gate: number;
  skill: ItemSkill;
  /** What to show the child, if anything (letters, a word, or a choice of words). */
  display: string[];
  /** Exactly what the parent says to the child. */
  parentPrompt: string;
  /** What counts as a correct response. */
  expected: string;
  /** The short vowel this item tests, if any. Feeds the short-vowel profile. */
  vowel?: ShortVowel;
}

export interface PlacementGate {
  lesson: number;
  skill: string;
}

export const GATES: readonly PlacementGate[] = [
  { lesson: 1, skill: 'Short a sound /ă/' },
  { lesson: 2, skill: 'Sound for m' },
  { lesson: 3, skill: 'Sound for s' },
  { lesson: 4, skill: 'Sound for t' },
  { lesson: 5, skill: 'Blending VC & CVC words with short a' },
  { lesson: 6, skill: 'Sound for p' },
  { lesson: 7, skill: 'Sound for f' },
  { lesson: 8, skill: 'Short i sound /ĭ/' },
  { lesson: 9, skill: 'Sound for n' },
  { lesson: 10, skill: 'Reading and discriminating short a vs. short i CVC words' },
];

function vowelOf(word: string): ShortVowel | undefined {
  if (word.includes('a')) return 'a';
  if (word.includes('i')) return 'i';
  return undefined;
}

function letterSoundItems(gate: number, g: GraphemeId): DiagnosticItem[] {
  const script = PHONEME_SCRIPTS[g];
  const vowel = script.isVowel ? (g as ShortVowel) : undefined;
  return [g, g.toUpperCase()].map((shown) => ({
    id: `g${gate}-sound-${shown === g ? 'lower' : 'upper'}`,
    gate,
    skill: 'letter-sound' as const,
    display: [shown],
    parentPrompt: 'Point to the letter. "What sound does this letter make?"',
    expected: `${script.phoneme} (the sound, not the letter name)`,
    ...(vowel ? { vowel } : {}),
  }));
}

function medialVowelItem(gate: number, word: string, vowel: ShortVowel): DiagnosticItem {
  return {
    id: `g${gate}-medial-${word}`,
    gate,
    skill: 'medial-vowel',
    display: [],
    parentPrompt: `Do not show any letters. Say: "Listen: ${word}. What sound do you hear in the middle of ${word}?"`,
    expected: PHONEME_SCRIPTS[vowel].phoneme,
    vowel,
  };
}

function decodeItem(gate: number, word: string, pseudo: boolean): DiagnosticItem {
  const vowel = vowelOf(word);
  return {
    id: `g${gate}-${pseudo ? 'pseudo' : 'real'}-${word}`,
    gate,
    skill: pseudo ? 'decode-pseudo' : 'decode-real',
    display: [word],
    parentPrompt: pseudo
      ? 'Point to the word. "This is a silly word. Read it for me."'
      : 'Point to the word. "Read this word for me."',
    expected: `${soundOut(word)} blended as "${word}"`,
    ...(vowel ? { vowel } : {}),
  };
}

function discriminationItem(gate: number, spoken: string, other: string): DiagnosticItem {
  const vowel = vowelOf(spoken);
  // Alphabetical order, so card position never hints at the answer.
  const display = spoken < other ? [spoken, other] : [other, spoken];
  return {
    id: `g${gate}-discriminate-${spoken}`,
    gate,
    skill: 'vowel-discrimination',
    display,
    parentPrompt: `Show both cards. Say: "Point to ${spoken}."`,
    expected: `Points to "${spoken}"`,
    ...(vowel ? { vowel } : {}),
  };
}

export const DIAGNOSTIC_ITEMS: readonly DiagnosticItem[] = [
  ...letterSoundItems(1, 'a'),
  medialVowelItem(1, 'mat', 'a'),
  ...letterSoundItems(2, 'm'),
  ...letterSoundItems(3, 's'),
  ...letterSoundItems(4, 't'),
  decodeItem(5, 'at', false),
  decodeItem(5, 'am', false),
  decodeItem(5, 'sat', false),
  decodeItem(5, 'mat', false),
  decodeItem(5, 'tas', true),
  ...letterSoundItems(6, 'p'),
  ...letterSoundItems(7, 'f'),
  ...letterSoundItems(8, 'i'),
  medialVowelItem(8, 'sit', 'i'),
  decodeItem(8, 'it', false),
  decodeItem(8, 'tip', false),
  ...letterSoundItems(9, 'n'),
  decodeItem(10, 'pan', false),
  decodeItem(10, 'fin', false),
  decodeItem(10, 'nap', false),
  decodeItem(10, 'sip', false),
  decodeItem(10, 'nim', true),
  decodeItem(10, 'fas', true),
  discriminationItem(10, 'pin', 'pan'),
  discriminationItem(10, 'sat', 'sit'),
];

export function itemsForGate(gate: number): DiagnosticItem[] {
  return DIAGNOSTIC_ITEMS.filter((item) => item.gate === gate);
}
