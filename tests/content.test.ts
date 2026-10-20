import { describe, expect, it } from 'vitest';
import { LESSONS, getLesson, isDecodableAt, soundOut } from '../src/content/lessons.js';
import { PHONEME_SCRIPTS } from '../src/content/phonemes.js';

describe('lesson content', () => {
  it('follows the UFLI grapheme order for Lessons 1-10', () => {
    expect(LESSONS.map((l) => l.newGraphemes.join(''))).toEqual(['a', 'm', 's', 't', '', 'p', 'f', 'i', 'n', '']);
  });

  it.each(LESSONS.map((l) => [l.number, l] as const))('lesson %i only uses taught graphemes', (n, lesson) => {
    const words = [...lesson.blendingWords, ...lesson.pseudoWords, ...lesson.minimalPairs.flat()];
    for (const word of words) expect(isDecodableAt(word, n), word).toBe(true);
  });

  it('keeps real and nonsense word lists separate', () => {
    for (const l of LESSONS) {
      expect(l.blendingWords.filter((w) => l.pseudoWords.includes(w))).toEqual([]);
    }
  });

  it('minimal pairs differ only in the vowel', () => {
    for (const [x, y] of LESSONS.flatMap((l) => l.minimalPairs)) {
      expect(x.replace(/[ai]/, '_')).toBe(y.replace(/[ai]/, '_'));
      expect(x).not.toBe(y);
    }
  });

  it('every phoneme script has a keyword starting with its letter and stop sounds are marked', () => {
    for (const s of Object.values(PHONEME_SCRIPTS)) {
      expect(s.keyword.startsWith(s.grapheme)).toBe(true);
      expect(s.avoid.length).toBeGreaterThan(0);
    }
    expect(PHONEME_SCRIPTS.t.soundType).toBe('stop');
    expect(PHONEME_SCRIPTS.p.soundType).toBe('stop');
  });

  it('sounds out words and rejects unknown lessons', () => {
    expect(soundOut('mat')).toBe('/m/ /ă/ /t/');
    expect(isDecodableAt('tip', 7)).toBe(false);
    expect(() => getLesson(11)).toThrow(RangeError);
  });
});
