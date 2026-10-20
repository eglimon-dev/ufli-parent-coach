/** All measurements are in inches, measured from the top-left corner of the page. */
export interface Size {
  widthIn: number;
  heightIn: number;
}

export interface NamedSize extends Size {
  name: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PAPER_SIZES = {
  letter: { name: 'US Letter (8.5 × 11 in)', widthIn: 8.5, heightIn: 11 },
  a4: { name: 'A4 (210 × 297 mm)', widthIn: 8.27, heightIn: 11.69 },
} as const satisfies Record<string, NamedSize>;

export type PaperId = keyof typeof PAPER_SIZES;

export const CARD_SIZES = {
  'playing-card': { name: 'Playing card (2.5 × 3.5 in)', widthIn: 2.5, heightIn: 3.5 },
  'index-3x5': { name: 'Index card (5 × 3 in)', widthIn: 5, heightIn: 3 },
  'tile-2in': { name: 'Square tile (2 × 2 in)', widthIn: 2, heightIn: 2 },
} as const satisfies Record<string, NamedSize>;

export type CardSizeId = keyof typeof CARD_SIZES;

export interface GridSpec {
  paper: NamedSize;
  card: NamedSize;
  marginIn: number;
  gutterIn: number;
  cols: number;
  rows: number;
  perPage: number;
  /** Top-left of the first cell; the grid is centered on the page. */
  originX: number;
  originY: number;
}

export interface GridOptions {
  marginIn?: number;
  gutterIn?: number;
}

/**
 * Packs as many cards as fit on the page inside the margins, then centers the
 * grid. The defaults (0.25 in margins, no gutter, so neighbors share cut lines)
 * fit the standard 9-up playing-card sheet on US Letter.
 */
export function fitGrid(paper: NamedSize, card: NamedSize, options: GridOptions = {}): GridSpec {
  const marginIn = options.marginIn ?? 0.25;
  const gutterIn = options.gutterIn ?? 0;
  const usableW = paper.widthIn - 2 * marginIn;
  const usableH = paper.heightIn - 2 * marginIn;
  const cols = Math.floor((usableW + gutterIn) / (card.widthIn + gutterIn));
  const rows = Math.floor((usableH + gutterIn) / (card.heightIn + gutterIn));
  if (cols < 1 || rows < 1) {
    throw new RangeError(`A ${card.name} does not fit on ${paper.name} with ${marginIn} in margins.`);
  }
  const gridW = cols * card.widthIn + (cols - 1) * gutterIn;
  const gridH = rows * card.heightIn + (rows - 1) * gutterIn;
  return {
    paper,
    card,
    marginIn,
    gutterIn,
    cols,
    rows,
    perPage: cols * rows,
    originX: round((paper.widthIn - gridW) / 2),
    originY: round((paper.heightIn - gridH) / 2),
  };
}

export function cellRect(grid: GridSpec, row: number, col: number): Rect {
  return {
    x: round(grid.originX + col * (grid.card.widthIn + grid.gutterIn)),
    y: round(grid.originY + row * (grid.card.heightIn + grid.gutterIn)),
    w: grid.card.widthIn,
    h: grid.card.heightIn,
  };
}

export function landscape(paper: NamedSize): NamedSize {
  return { name: `${paper.name}, landscape`, widthIn: paper.heightIn, heightIn: paper.widthIn };
}

export function round(n: number, places = 3): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export function toMm(inches: number): number {
  return round(inches * 25.4, 1);
}

export function formatInches(inches: number): string {
  return `${round(inches, 2)} in (${toMm(inches)} mm)`;
}

/** Greedy word wrap; words longer than `width` are hard-split. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > width) {
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (!line) {
      line = rest;
    } else if (line.length + 1 + rest.length <= width) {
      line += ` ${rest}`;
    } else {
      lines.push(line);
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function center(text: string, width: number): string {
  const left = Math.floor((width - text.length) / 2);
  return ' '.repeat(left) + text + ' '.repeat(width - text.length - left);
}

/**
 * Draws a box `width` characters wide and `height` lines tall (borders
 * included) with `lines` wrapped and centered inside. Overflow is cut with "…".
 */
export function textBox(lines: string[], width: number, height: number): string[] {
  const inner = width - 4;
  const rows = height - 2;
  let body = lines.flatMap((l) => (l === '' ? [''] : wrap(l, inner)));
  if (body.length > rows) body = [...body.slice(0, rows - 1), '…'];
  const top = Math.floor((rows - body.length) / 2);
  const padded = [...Array<string>(top).fill(''), ...body, ...Array<string>(rows - top - body.length).fill('')];
  const edge = `+${'-'.repeat(width - 2)}+`;
  return [edge, ...padded.map((l) => `| ${center(l, inner)} |`), edge];
}

/** Places pre-rendered blocks of equal height side by side. */
export function joinColumns(blocks: string[][], gap = 2): string[] {
  const height = Math.max(0, ...blocks.map((b) => b.length));
  return Array.from({ length: height }, (_, i) =>
    blocks.map((b) => b[i] ?? ' '.repeat(b[0]?.length ?? 0)).join(' '.repeat(gap)).trimEnd(),
  );
}
