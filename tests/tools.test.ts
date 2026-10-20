import { describe, expect, it } from 'vitest';
import { CARD_SIZES, PAPER_SIZES, fitGrid, textBox, wrap } from '../src/tools/layout.js';
import { buildFlashcardBlueprint } from '../src/tools/flashcards.js';
import { buildBlendingTracker, buildWordChain, stretchedBlend } from '../src/tools/trackers.js';

describe('layout', () => {
  it('fits 9 playing cards on US Letter and keeps the grid inside the margins', () => {
    const g = fitGrid(PAPER_SIZES.letter, CARD_SIZES['playing-card']);
    expect([g.cols, g.rows]).toEqual([3, 3]);
    expect(g.originX).toBeGreaterThanOrEqual(g.marginIn);
    expect(g.originY).toBeGreaterThanOrEqual(g.marginIn);
  });

  it('throws when a card cannot fit', () => {
    expect(() => fitGrid({ name: 'tiny', widthIn: 2, heightIn: 2 }, CARD_SIZES['index-3x5'])).toThrow(RangeError);
  });

  it('wraps and boxes text to exact dimensions', () => {
    expect(wrap('touch each sound then slide', 10)).toEqual(['touch each', 'sound then', 'slide']);
    const box = textBox(['a', 'A'], 12, 6);
    expect(box).toHaveLength(6);
    expect(box.every((l) => l.length === 12)).toBe(true);
  });
});

describe('flashcards', () => {
  it('builds one card per new grapheme and mirrors backs for duplex printing', () => {
    const bp = buildFlashcardBlueprint({ lessons: [1, 2, 3, 4] });
    expect(bp.cards.map((c) => c.front.headline)).toEqual(['a', 'm', 's', 't']);
    const [front, back] = bp.pages;
    for (const f of front!.faces) {
      const b = back!.faces.find((x) => x.cardId === f.cardId)!;
      expect(b.row).toBe(f.row);
      expect(b.col).toBe(bp.grid.cols - 1 - f.col);
    }
    expect(bp.cards[0]!.front.ink).toBe('red');
    expect(bp.cards.find((c) => c.id === 'grapheme-t')!.back.details).toContain('BOUNCE it: /t/ (quick!)');
  });

  it('paginates word cards', () => {
    const bp = buildFlashcardBlueprint({ includeWordCards: true, includeBacks: false });
    const perPage = bp.grid.perPage;
    expect(bp.pages).toHaveLength(Math.ceil(bp.cards.length / perPage));
    expect(new Set(bp.cards.map((c) => c.id)).size).toBe(bp.cards.length);
  });

  it('refuses an empty set', () => {
    expect(() => buildFlashcardBlueprint({ lessons: [5] })).toThrow(/includeWordCards/);
  });
});

describe('blending tracker', () => {
  it('chains words one letter at a time when possible', () => {
    const chain = buildWordChain(['man', 'sip', 'map', 'nap', 'nip']);
    expect(chain.map((s) => s.word)).toEqual(['man', 'map', 'nap', 'nip', 'sip']);
    expect(chain[0]!.change).toBeNull();
    expect(chain[1]!.change).toEqual({ position: 2, from: 'n', to: 'p' });
  });

  it('stretches continuous sounds and clips stops', () => {
    expect(stretchedBlend('sat')).toBe('sssăăăt');
    expect(stretchedBlend('tip')).toBe('tĭĭĭp');
  });

  it('lays out boxes, dots, and arrow on the landscape page', () => {
    const t = buildBlendingTracker({ lesson: 10 });
    expect(t.boxes).toHaveLength(3);
    expect(t.dots.map((d) => d.cx)).toEqual(t.boxes.map((b) => b.x + b.w / 2));
    expect(t.strip.x + t.strip.w).toBeLessThanOrEqual(t.paper.widthIn);
    expect(t.arrow.y1).toBeGreaterThan(t.dots[0]!.cy);
    expect(t.tiles.find((x) => x.grapheme === 'i')!.ink).toBe('red');
  });

  it('provides duplicate tiles when a word repeats a letter', () => {
    const t = buildBlendingTracker({ lesson: 7 });
    expect(t.tiles.find((x) => x.grapheme === 'f')!.count).toBe(2);
  });

  it('shrinks boxes to fit and rejects lessons with nothing to blend', () => {
    const t = buildBlendingTracker({ lesson: 10, boxCount: 4, boxSizeIn: 5 });
    expect(t.strip.w).toBeLessThanOrEqual(t.paper.widthIn - 1);
    expect(() => buildBlendingTracker({ lesson: 1 })).toThrow(/no words/);
    expect(() => buildBlendingTracker({ lesson: 10, boxCount: 2 })).toThrow(RangeError);
  });
});
