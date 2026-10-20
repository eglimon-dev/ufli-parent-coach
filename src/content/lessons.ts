import { PHONEME_SCRIPTS } from './phonemes.js';
import type { GraphemeId, Lesson, LessonKind } from './types.js';

/**
 * The grapheme order follows the published UFLI Foundations scope & sequence
 * for Lessons 1-10. Word lists, scripts, and tips are original to this app.
 */
interface LessonSeed {
  number: number;
  title: string;
  kind: LessonKind;
  newGraphemes: GraphemeId[];
  blendingWords: string[];
  pseudoWords?: string[];
  minimalPairs?: Array<[string, string]>;
  parentFocus: string;
}

const SEEDS: LessonSeed[] = [
  {
    number: 1,
    title: 'a /ă/',
    kind: 'new-grapheme',
    newGraphemes: ['a'],
    blendingWords: [],
    parentFocus:
      'Teach the sound, not the name. Your child should see "a" and say /ă/ with a wide-open jaw. No blending yet — practice hearing /ă/ at the start of spoken words (apple, ant, alligator).',
  },
  {
    number: 2,
    title: 'm /m/',
    kind: 'new-grapheme',
    newGraphemes: ['m'],
    blendingWords: ['am'],
    parentFocus:
      'Both /m/ and /ă/ can be stretched, so blending is easy: hold /ăăă/ and slide straight into /mmm/ without a break — "ăăămmm… am!"',
  },
  {
    number: 3,
    title: 's /s/',
    kind: 'new-grapheme',
    newGraphemes: ['s'],
    blendingWords: ['am'],
    pseudoWords: ['sam', 'mas'],
    parentFocus:
      'Keep /s/ a quiet hiss. Nonsense words like "sam" are fine — they prove your child is reading the letters, not guessing a familiar word.',
  },
  {
    number: 4,
    title: 't /t/',
    kind: 'new-grapheme',
    newGraphemes: ['t'],
    blendingWords: ['at', 'sat', 'mat'],
    pseudoWords: ['tam', 'tas'],
    parentFocus:
      '/t/ is the first stop sound. Clip it short — "t", not "tuh". In "sat", stretch /sss/ into /ăăă/, then add a crisp /t/ at the end.',
  },
  {
    number: 5,
    title: 'VC & CVC Words',
    kind: 'word-work',
    newGraphemes: [],
    blendingWords: ['at', 'am', 'sat', 'mat'],
    pseudoWords: ['tas', 'mas', 'tam', 'sas'],
    parentFocus:
      'No new letters — this lesson is all about blending. Use the blending tracker: touch each dot and say the sound, then slide along the arrow to read the word smoothly.',
  },
  {
    number: 6,
    title: 'p /p/',
    kind: 'new-grapheme',
    newGraphemes: ['p'],
    blendingWords: ['pat', 'tap', 'map', 'sap', 'mat', 'sat'],
    pseudoWords: ['pam', 'pas', 'pap'],
    parentFocus:
      '/p/ is a stop sound like /t/: one pop of the lips, no "puh". Words ending in /p/ ("tap", "map") are a good check that the ending stays crisp.',
  },
  {
    number: 7,
    title: 'f /f/',
    kind: 'new-grapheme',
    newGraphemes: ['f'],
    blendingWords: ['fat', 'tap', 'map', 'pat', 'sat'],
    pseudoWords: ['faf', 'maf', 'fap', 'saf'],
    parentFocus:
      '/f/ can be stretched — teeth on lip and blow. Few real words are possible yet, so lean on the nonsense words to practice /f/ in every position.',
  },
  {
    number: 8,
    title: 'i /ĭ/',
    kind: 'new-grapheme',
    newGraphemes: ['i'],
    blendingWords: ['it', 'if', 'sit', 'fit', 'pit', 'tip', 'sip', 'pip'],
    pseudoWords: ['mip', 'fip', 'tis', 'mif'],
    minimalPairs: [
      ['sat', 'sit'],
      ['pat', 'pit'],
      ['tap', 'tip'],
      ['fat', 'fit'],
    ],
    parentFocus:
      'Your child now has two short vowels. /ă/ and /ĭ/ are easy to mix up, so use the mouth cue: jaw drops for /ă/, small smile for /ĭ/. Practice the vowel-swap pairs (sat → sit).',
  },
  {
    number: 9,
    title: 'n /n/',
    kind: 'new-grapheme',
    newGraphemes: ['n'],
    blendingWords: ['an', 'in', 'nap', 'pan', 'fan', 'man', 'tan', 'tin', 'pin', 'fin', 'nip'],
    pseudoWords: ['nas', 'fim', 'nif', 'pim'],
    minimalPairs: [
      ['pan', 'pin'],
      ['fan', 'fin'],
      ['tan', 'tin'],
      ['nap', 'nip'],
    ],
    parentFocus:
      '/n/ is a continuous hum like /m/. Watch for /m/–/n/ mix-ups: lips together for /m/, tongue up for /n/.',
  },
  {
    number: 10,
    title: 'CVC Practice (a, i)',
    kind: 'word-work',
    newGraphemes: [],
    blendingWords: ['man', 'map', 'nap', 'sat', 'sit', 'pin', 'pan', 'fit', 'tip', 'fan', 'sip', 'tin'],
    pseudoWords: ['nim', 'fis', 'paf', 'tam', 'sif'],
    minimalPairs: [
      ['sat', 'sit'],
      ['pan', 'pin'],
      ['tap', 'tip'],
      ['fan', 'fin'],
      ['pat', 'pit'],
      ['nap', 'nip'],
    ],
    parentFocus:
      'Mixed short-a and short-i review. The goal is for your child to look at the vowel first and choose the right sound every time. Build word chains (man → map → nap → nip) by changing one letter at a time.',
  },
];

function buildLessons(seeds: LessonSeed[]): Lesson[] {
  const known: GraphemeId[] = [];
  return seeds.map((seed) => {
    known.push(...seed.newGraphemes);
    return {
      number: seed.number,
      title: seed.title,
      kind: seed.kind,
      newGraphemes: [...seed.newGraphemes],
      cumulativeGraphemes: [...known],
      blendingWords: [...seed.blendingWords],
      pseudoWords: [...(seed.pseudoWords ?? [])],
      minimalPairs: (seed.minimalPairs ?? []).map(([x, y]) => [x, y] as [string, string]),
      parentFocus: seed.parentFocus,
    };
  });
}

export const LESSONS: readonly Lesson[] = buildLessons(SEEDS);

export const FIRST_LESSON = 1;
export const LAST_LESSON = LESSONS.length;

export function getLesson(number: number): Lesson {
  const lesson = LESSONS.find((l) => l.number === number);
  if (!lesson) {
    throw new RangeError(`Lesson ${number} is not in the content database (available: ${FIRST_LESSON}-${LAST_LESSON}).`);
  }
  return lesson;
}

function isGraphemeId(value: string): value is GraphemeId {
  return Object.hasOwn(PHONEME_SCRIPTS, value);
}

/**
 * Splits a word into its graphemes. Lessons 1-10 only use single-letter
 * graphemes, so this is a per-letter split that rejects anything unknown.
 */
export function segmentWord(word: string): GraphemeId[] {
  return [...word.toLowerCase()].map((ch) => {
    if (!isGraphemeId(ch)) {
      throw new Error(`"${word}" contains "${ch}", which is not taught in Lessons ${FIRST_LESSON}-${LAST_LESSON}.`);
    }
    return ch;
  });
}

/** True when every grapheme in `word` has been taught by the end of `lessonNumber`. */
export function isDecodableAt(word: string, lessonNumber: number): boolean {
  const known = new Set(getLesson(lessonNumber).cumulativeGraphemes);
  try {
    return segmentWord(word).every((g) => known.has(g));
  } catch {
    return false;
  }
}

/** "/m/ /ă/ /t/" — the sound-by-sound breakdown a parent models before blending. */
export function soundOut(word: string): string {
  return segmentWord(word)
    .map((g) => PHONEME_SCRIPTS[g].phoneme)
    .join(' ');
}
