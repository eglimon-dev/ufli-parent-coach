import { getLesson, isDecodableAt, segmentWord } from '../content/lessons.js';
import { PHONEME_SCRIPTS } from '../content/phonemes.js';
import type { GraphemeId } from '../content/types.js';
import {
  PAPER_SIZES,
  formatInches,
  landscape,
  round,
  type NamedSize,
  type PaperId,
  type Rect,
  type Size,
} from './layout.js';

export interface TileSpec {
  grapheme: GraphemeId;
  /** Enough copies to build any practice word for this lesson. */
  count: number;
  ink: 'red' | 'black';
}

export interface ChainStep {
  word: string;
  /** The single letter that changed from the previous word, or null for a fresh start. */
  change: { position: number; from: GraphemeId; to: GraphemeId } | null;
}

export interface Dot {
  cx: number;
  cy: number;
  r: number;
}

export interface Arrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BlendingTrackerBlueprint {
  kind: 'blending-tracker';
  title: string;
  lesson: number;
  paper: NamedSize;
  /** The base strip the boxes, dots, and arrow are drawn on. */
  strip: Rect;
  boxes: Rect[];
  dots: Dot[];
  arrow: Arrow;
  tileSize: Size;
  tiles: TileSpec[];
  wordChain: ChainStep[];
  materials: string[];
  steps: string[];
  /** Word-for-word coaching script for the first word in the chain. */
  parentScript: string[];
  textLayout: string;
}

export interface BlendingTrackerOptions {
  lesson: number;
  paper?: PaperId;
  /** Number of sound boxes; defaults to the longest practice word in the lesson. */
  boxCount?: number;
  boxSizeIn?: number;
  marginIn?: number;
}

const DOT_GAP_IN = 0.35;
const DOT_RADIUS_IN = 0.15;
const ARROW_GAP_IN = 0.45;
const TILE_INSET_IN = 0.2;

function practiceWords(lessonNumber: number): string[] {
  const lesson = getLesson(lessonNumber);
  const words = [...lesson.blendingWords, ...lesson.minimalPairs.flat(), ...lesson.pseudoWords];
  return [...new Set(words)].filter((w) => isDecodableAt(w, lessonNumber));
}

function singleChange(a: GraphemeId[], b: GraphemeId[]): ChainStep['change'] {
  if (a.length !== b.length) return null;
  const diffs = a.flatMap((g, i) => (g !== b[i] ? [i] : []));
  if (diffs.length !== 1) return null;
  const position = diffs[0]!;
  return { position, from: a[position]!, to: b[position]! };
}

/**
 * Orders words so that each one differs from the last by a single letter where
 * possible (UFLI-style word chains). A null `change` means "clear the tracker
 * and build this word from scratch."
 */
export function buildWordChain(words: string[]): ChainStep[] {
  const remaining = [...words];
  const chain: ChainStep[] = [];
  let current: GraphemeId[] | null = null;
  while (remaining.length > 0) {
    let index = 0;
    let change: ChainStep['change'] = null;
    if (current) {
      const prev: GraphemeId[] = current;
      const found = remaining.findIndex((w) => singleChange(prev, segmentWord(w)) !== null);
      if (found >= 0) {
        index = found;
        change = singleChange(prev, segmentWord(remaining[found]!));
      }
    }
    const [word] = remaining.splice(index, 1) as [string];
    chain.push({ word, change });
    current = segmentWord(word);
  }
  return chain;
}

/** "sssăăăt" — continuous sounds held, stop sounds clipped. */
export function stretchedBlend(word: string): string {
  return segmentWord(word)
    .map((g) => {
      const s = PHONEME_SCRIPTS[g];
      const sym = s.phoneme.slice(1, -1);
      return s.soundType === 'continuous' ? sym.repeat(3) : sym;
    })
    .join('');
}

function tileCounts(words: string[], graphemes: GraphemeId[]): TileSpec[] {
  return graphemes.map((g) => {
    const most = Math.max(1, ...words.map((w) => segmentWord(w).filter((x) => x === g).length));
    return { grapheme: g, count: most, ink: PHONEME_SCRIPTS[g].isVowel ? 'red' : 'black' };
  });
}

function parentScriptFor(word: string): string[] {
  const sounds = segmentWord(word).map((g) => PHONEME_SCRIPTS[g]);
  const lines = [`Build "${word}" by placing one tile in each box, left to right.`];
  sounds.forEach((s, i) => {
    const next = i < sounds.length - 1 ? ' while moving to the next dot' : '';
    lines.push(
      s.soundType === 'continuous'
        ? `Touch dot ${i + 1} and say ${s.phoneme} — hold it ("${s.phoneme.slice(1, -1).repeat(3)}")${next}.`
        : `Touch dot ${i + 1} and say ${s.phoneme} — quick and crisp, no "uh."`,
    );
  });
  lines.push(
    `Slide your finger along the arrow and say the sounds smoothly together: "${stretchedBlend(word)}."`,
    `Say it fast like we talk: "${word}!" Then ask your child to do it with you, then alone.`,
  );
  return lines;
}

function renderTracker(boxCount: number, word: string): string {
  const cell = 9;
  const letters = segmentWord(word);
  const border = '+' + Array(boxCount).fill('-'.repeat(cell)).join('+') + '+';
  const blank = '|' + Array(boxCount).fill(' '.repeat(cell)).join('|') + '|';
  const mid =
    '|' +
    Array.from({ length: boxCount }, (_, i) => {
      const g = letters[i];
      const label = g ? (PHONEME_SCRIPTS[g].isVowel ? `${g}*` : g) : '';
      const left = Math.floor((cell - label.length) / 2);
      return ' '.repeat(left) + label + ' '.repeat(cell - label.length - left);
    }).join('|') +
    '|';
  const centers = Array.from({ length: boxCount }, (_, i) => 1 + i * (cell + 1) + Math.floor(cell / 2));
  const dots = [...' '.repeat(border.length)];
  centers.forEach((c) => (dots[c] = '●'));
  const arrowStart = centers[0]!;
  const arrow = ' '.repeat(arrowStart) + '─'.repeat(border.length - arrowStart - 1) + '▶';
  return [border, blank, mid, blank, border, dots.join('').trimEnd(), arrow, '', '* = vowel tile (red ink)'].join(
    '\n',
  );
}

/**
 * Generates a sound-box blending tracker: a strip of boxes the child slides
 * letter tiles into, a dot under each box to touch while saying each sound,
 * and an arrow to sweep along while blending.
 */
export function buildBlendingTracker(options: BlendingTrackerOptions): BlendingTrackerBlueprint {
  const lesson = getLesson(options.lesson);
  const words = practiceWords(lesson.number);
  if (words.length === 0) {
    throw new Error(
      `Lesson ${lesson.number} has no words to blend yet. Use letter flashcards for this lesson instead.`,
    );
  }
  const longest = Math.max(...words.map((w) => segmentWord(w).length));
  const boxCount = options.boxCount ?? Math.max(2, longest);
  if (boxCount < longest) {
    throw new RangeError(`Lesson ${lesson.number} has ${longest}-sound words; use at least ${longest} boxes.`);
  }

  const paper = landscape(PAPER_SIZES[options.paper ?? 'letter']);
  const marginIn = options.marginIn ?? 0.5;
  const maxBox = (paper.widthIn - 2 * marginIn) / boxCount;
  const box = round(Math.min(options.boxSizeIn ?? 2.5, maxBox), 2);

  const stripW = box * boxCount;
  const stripH = box + DOT_GAP_IN + 2 * DOT_RADIUS_IN + ARROW_GAP_IN + 0.3;
  const strip: Rect = {
    x: round((paper.widthIn - stripW) / 2),
    y: round((paper.heightIn - stripH) / 2),
    w: round(stripW),
    h: round(stripH),
  };
  const boxes: Rect[] = Array.from({ length: boxCount }, (_, i) => ({
    x: round(strip.x + i * box),
    y: strip.y,
    w: box,
    h: box,
  }));
  const dotY = round(strip.y + box + DOT_GAP_IN + DOT_RADIUS_IN);
  const dots: Dot[] = boxes.map((b) => ({ cx: round(b.x + b.w / 2), cy: dotY, r: DOT_RADIUS_IN }));
  const arrowY = round(dotY + DOT_RADIUS_IN + ARROW_GAP_IN);
  const arrow: Arrow = { x1: dots[0]!.cx, y1: arrowY, x2: round(strip.x + stripW - 0.1), y2: arrowY };

  const tileSide = round(box - 2 * TILE_INSET_IN, 2);
  const tiles = tileCounts(words, lesson.cumulativeGraphemes);
  const wordChain = buildWordChain(words);
  const first = wordChain[0]!.word;
  const tileTotal = tiles.reduce((n, t) => n + t.count, 0);

  return {
    kind: 'blending-tracker',
    title: `Blending Tracker — Lesson ${lesson.number}: ${lesson.title}`,
    lesson: lesson.number,
    paper,
    strip,
    boxes,
    dots,
    arrow,
    tileSize: { widthIn: tileSide, heightIn: tileSide },
    tiles,
    wordChain,
    materials: [
      `1 sheet of ${paper.name} cardstock for the tracker strip`,
      `Cardstock for ${tileTotal} letter tiles`,
      'Black and red markers, ruler, scissors',
      'Optional: a sticker or bingo dauber for the dots, and clear tape to make box "pockets"',
    ],
    steps: [
      `Draw ${boxCount} boxes side by side, each ${formatInches(box)} square, starting ${formatInches(strip.x)} from the left edge and ${formatInches(strip.y)} from the top.`,
      `Centered ${formatInches(DOT_GAP_IN + DOT_RADIUS_IN)} below each box, draw a dot ${formatInches(DOT_RADIUS_IN * 2)} across.`,
      `Draw an arrow ${formatInches(ARROW_GAP_IN)} below the dots, from under the first dot to the right end of the last box.`,
      `Cut ${tileTotal} tiles, each ${formatInches(tileSide)} square, so they sit inside a box with room to spare.`,
      `Write one letter per tile: ${tiles.map((t) => `${t.count}× "${t.grapheme}"`).join(', ')}. Write vowels (${tiles
        .filter((t) => t.ink === 'red')
        .map((t) => t.grapheme)
        .join(', ')}) in red.`,
      'Practice the word chain in order: change only the tile that is different each time.',
    ],
    parentScript: parentScriptFor(first),
    textLayout: renderTracker(boxCount, first),
  };
}
