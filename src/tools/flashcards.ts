import { LESSONS, getLesson, soundOut } from '../content/lessons.js';
import { PHONEME_SCRIPTS } from '../content/phonemes.js';
import type { GraphemeId } from '../content/types.js';
import {
  CARD_SIZES,
  PAPER_SIZES,
  cellRect,
  fitGrid,
  formatInches,
  joinColumns,
  textBox,
  type CardSizeId,
  type GridSpec,
  type PaperId,
  type Rect,
} from './layout.js';

export interface FlashcardFace {
  /** The large text printed in the middle of the face. */
  headline: string;
  /** Smaller supporting lines, top to bottom. */
  details: string[];
  /** Vowels are printed in red so children learn to spot them. */
  ink: 'red' | 'black';
}

export interface Flashcard {
  id: string;
  kind: 'grapheme' | 'word';
  lesson: number;
  front: FlashcardFace;
  back: FlashcardFace;
}

export interface PlacedFace {
  cardId: string;
  row: number;
  col: number;
  rect: Rect;
  face: FlashcardFace;
}

export interface SheetPage {
  page: number;
  side: 'front' | 'back';
  faces: PlacedFace[];
}

export interface FlashcardBlueprint {
  kind: 'flashcards';
  title: string;
  grid: GridSpec;
  cards: Flashcard[];
  pages: SheetPage[];
  materials: string[];
  steps: string[];
  /** Plain-text preview of every sheet, for parents who copy cards by hand. */
  textLayout: string;
}

export interface FlashcardOptions {
  /** Lessons to draw cards from. Defaults to every lesson in the database. */
  lessons?: number[];
  includeWordCards?: boolean;
  includeBacks?: boolean;
  paper?: PaperId;
  card?: CardSizeId;
  marginIn?: number;
  gutterIn?: number;
}

function graphemeCard(g: GraphemeId, lesson: number): Flashcard {
  const s = PHONEME_SCRIPTS[g];
  const ink = s.isVowel ? 'red' : 'black';
  const sym = s.phoneme.slice(1, -1);
  const how = s.soundType === 'continuous' ? `STRETCH it: /${sym}${sym}${sym}/` : `BOUNCE it: ${s.phoneme} (quick!)`;
  return {
    id: `grapheme-${g}`,
    kind: 'grapheme',
    lesson,
    front: { headline: g, details: [g.toUpperCase()], ink },
    back: { headline: s.phoneme, details: [s.keyword, how, s.mouth], ink },
  };
}

function wordCard(word: string, lesson: number): Flashcard {
  return {
    id: `word-${word}`,
    kind: 'word',
    lesson,
    front: { headline: word, details: [], ink: 'black' },
    back: { headline: soundOut(word), details: ['Touch each sound, then slide to blend.'], ink: 'black' },
  };
}

export function collectFlashcards(lessonNumbers: number[], includeWordCards: boolean): Flashcard[] {
  const lessons = lessonNumbers.map(getLesson).sort((a, b) => a.number - b.number);
  const cards: Flashcard[] = lessons.flatMap((l) => l.newGraphemes.map((g) => graphemeCard(g, l.number)));
  if (includeWordCards) {
    const seen = new Set<string>();
    for (const lesson of lessons) {
      for (const word of lesson.blendingWords) {
        if (seen.has(word)) continue;
        seen.add(word);
        cards.push(wordCard(word, lesson.number));
      }
    }
  }
  return cards;
}

function renderPage(page: SheetPage, grid: GridSpec): string {
  const charW = Math.max(14, Math.round(grid.card.widthIn * 8));
  const lineH = Math.max(7, Math.round(grid.card.heightIn * 3));
  const blank = textBox([], charW, lineH).map((l) => l.replace(/[^ ]/g, ' '));
  const rows: string[] = [];
  for (let r = 0; r < grid.rows; r++) {
    if (!page.faces.some((f) => f.row === r)) continue;
    const blocks = Array.from({ length: grid.cols }, (_, c) => {
      const placed = page.faces.find((f) => f.row === r && f.col === c);
      if (!placed) return blank;
      const { headline, details, ink } = placed.face;
      const tag = ink === 'red' ? ['[red ink]'] : [];
      return textBox([headline, '', ...details, ...tag], charW, lineH);
    });
    rows.push(...joinColumns(blocks), '');
  }
  return [`=== Page ${page.page} — ${page.side.toUpperCase()} ===`, ...rows].join('\n');
}

/**
 * Lays flashcards out on printable sheets. Back sheets are mirrored left-to-right
 * so each back lines up with its front when printed double-sided (flip on long edge).
 */
export function buildFlashcardBlueprint(options: FlashcardOptions = {}): FlashcardBlueprint {
  const lessonNumbers = options.lessons ?? LESSONS.map((l) => l.number);
  const includeBacks = options.includeBacks ?? true;
  const paper = PAPER_SIZES[options.paper ?? 'letter'];
  const card = CARD_SIZES[options.card ?? 'playing-card'];
  const grid = fitGrid(paper, card, {
    ...(options.marginIn !== undefined ? { marginIn: options.marginIn } : {}),
    ...(options.gutterIn !== undefined ? { gutterIn: options.gutterIn } : {}),
  });
  const cards = collectFlashcards(lessonNumbers, options.includeWordCards ?? false);
  if (cards.length === 0) {
    throw new Error(`Lessons ${lessonNumbers.join(', ')} introduce no new graphemes; enable includeWordCards.`);
  }

  const pages: SheetPage[] = [];
  for (let start = 0; start < cards.length; start += grid.perPage) {
    const chunk = cards.slice(start, start + grid.perPage);
    const place = (side: 'front' | 'back'): SheetPage => ({
      page: pages.length + 1,
      side,
      faces: chunk.map((c, i) => {
        const row = Math.floor(i / grid.cols);
        const col = side === 'front' ? i % grid.cols : grid.cols - 1 - (i % grid.cols);
        return { cardId: c.id, row, col, rect: cellRect(grid, row, col), face: side === 'front' ? c.front : c.back };
      }),
    });
    pages.push(place('front'));
    if (includeBacks) pages.push(place('back'));
  }

  const sheetCount = Math.ceil(cards.length / grid.perPage);
  const materials = [
    `${sheetCount} sheet(s) of ${paper.name} cardstock (65–110 lb), or plain paper glued to cereal-box cardboard`,
    'Black marker and red marker (red is for vowels)',
    'Scissors or a paper trimmer; ruler',
    'Optional: laminating sheets or clear packing tape for durability',
  ];
  const steps = [
    `Each card is ${formatInches(card.widthIn)} wide × ${formatInches(card.heightIn)} tall; ${grid.perPage} fit per sheet (${grid.cols} across, ${grid.rows} down).`,
    `Start the first card ${formatInches(grid.originX)} from the left edge and ${formatInches(grid.originY)} from the top; ${
      grid.gutterIn > 0 ? `leave ${formatInches(grid.gutterIn)} between cards` : 'neighboring cards share cut lines'
    }.`,
    'Write the large headline in the center of each front. Print lowercase letters clearly — this is the form your child will read in books.',
    includeBacks
      ? 'Backs are mirrored left-to-right: print double-sided and "flip on long edge," or copy each back onto the reverse of its matching front.'
      : 'Fronts only — keep the pronunciation scripts in the app for reference.',
    'Cut along the outer border of each card. Round the corners if little fingers will handle them a lot.',
  ];

  return {
    kind: 'flashcards',
    title: `Flashcards — Lessons ${lessonNumbers.join(', ')}`,
    grid,
    cards,
    pages,
    materials,
    steps,
    textLayout: pages.map((p) => renderPage(p, grid)).join('\n\n'),
  };
}
