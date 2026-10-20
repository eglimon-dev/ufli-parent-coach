/** Graphemes introduced in UFLI Foundations Lessons 1-10. */
export type GraphemeId = 'a' | 'm' | 's' | 't' | 'p' | 'f' | 'i' | 'n';

export type ShortVowel = Extract<GraphemeId, 'a' | 'i'>;

/**
 * Continuous sounds can be stretched ("mmm"); stop sounds must be clipped
 * short ("t", never "tuh").
 */
export type SoundType = 'continuous' | 'stop';

/** Coaching script that tells a parent exactly how to produce one phoneme cleanly. */
export interface PhonemeScript {
  grapheme: GraphemeId;
  /** Dictionary-style notation shown to parents, e.g. "/ă/". */
  phoneme: string;
  ipa: string;
  isVowel: boolean;
  voiced: boolean;
  soundType: SoundType;
  /** Suggested picture keyword; the word must start with the target sound. */
  keyword: string;
  /** Where the lips, teeth, and tongue go. */
  mouth: string;
  /** Word-for-word line the parent says to the child. */
  say: string;
  /** Common mispronunciations parents should avoid. */
  avoid: string[];
  /** A quick self-check the parent can do. */
  check: string;
}

export type LessonKind = 'new-grapheme' | 'word-work';

export interface Lesson {
  number: number;
  title: string;
  kind: LessonKind;
  /** Graphemes introduced in this lesson (empty for word-work lessons). */
  newGraphemes: GraphemeId[];
  /** Every grapheme the child is expected to know by the end of this lesson. */
  cumulativeGraphemes: GraphemeId[];
  /** Real words decodable with `cumulativeGraphemes`. */
  blendingWords: string[];
  /** Nonsense words that check decoding rather than sight memory. */
  pseudoWords: string[];
  /** Word pairs differing only in the vowel, for short-vowel contrast. */
  minimalPairs: Array<[string, string]>;
  /** One-paragraph explanation of what to focus on this lesson. */
  parentFocus: string;
}
