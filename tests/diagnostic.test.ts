import { describe, expect, it } from 'vitest';
import { DIAGNOSTIC_ITEMS, GATES } from '../src/diagnostic/items.js';
import { scoreDiagnostic, type ItemResponse } from '../src/diagnostic/scoring.js';
import { isDecodableAt } from '../src/content/lessons.js';

const all = (correct: (id: string, gate: number) => boolean): ItemResponse[] =>
  DIAGNOSTIC_ITEMS.map((i) => ({ itemId: i.id, correct: correct(i.id, i.gate) }));

describe('diagnostic items', () => {
  it('has unique ids and covers every gate', () => {
    expect(new Set(DIAGNOSTIC_ITEMS.map((i) => i.id)).size).toBe(DIAGNOSTIC_ITEMS.length);
    for (const g of GATES) expect(DIAGNOSTIC_ITEMS.some((i) => i.gate === g.lesson)).toBe(true);
  });

  it('only shows words decodable at the gate lesson', () => {
    for (const item of DIAGNOSTIC_ITEMS.filter((i) => i.skill.startsWith('decode'))) {
      expect(isDecodableAt(item.display[0]!, item.gate), item.id).toBe(true);
    }
  });
});

describe('scoreDiagnostic', () => {
  it('places a child with no responses at Lesson 1', () => {
    const r = scoreDiagnostic([]);
    expect(r.startLesson).toBe(1);
    expect(r.gates[0]!.level).toBe('not-assessed');
  });

  it('places a child who mastered everything beyond Lesson 10', () => {
    const r = scoreDiagnostic(all(() => true));
    expect(r.startLesson).toBe(11);
    expect(r.beyondContent).toBe(true);
    expect(r.shortVowels.every((v) => v.level === 'mastered')).toBe(true);
  });

  it('places at the first unmastered gate and reports later strengths', () => {
    const r = scoreDiagnostic(all((_, gate) => gate !== 8));
    expect(r.startLesson).toBe(8);
    expect(r.laterStrengths).toEqual([9, 10]);
    expect(r.shortVowels.find((v) => v.vowel === 'i')!.level).not.toBe('mastered');
    expect(r.shortVowels.find((v) => v.vowel === 'a')!.level).toBe('mastered');
  });

  it('allows one miss in a five-item gate but not two', () => {
    const gate5 = DIAGNOSTIC_ITEMS.filter((i) => i.gate === 5).map((i) => i.id);
    expect(scoreDiagnostic(all((id) => id !== gate5[0])).startLesson).toBe(11);
    expect(scoreDiagnostic(all((id) => !gate5.slice(0, 2).includes(id))).startLesson).toBe(5);
  });

  it('turns error types into coaching notes and lets re-scores replace answers', () => {
    const id = DIAGNOSTIC_ITEMS[0]!.id;
    const r = scoreDiagnostic([...all(() => true), { itemId: id, correct: false, errorType: 'letter-name' }]);
    expect(r.startLesson).toBe(1);
    expect(r.coachingNotes.join(' ')).toMatch(/letter names/);
    expect(scoreDiagnostic([{ itemId: id, correct: false }, ...all(() => true)]).startLesson).toBe(11);
  });

  it('rejects unknown item ids', () => {
    expect(() => scoreDiagnostic([{ itemId: 'nope', correct: true }])).toThrow(/Unknown/);
  });
});
