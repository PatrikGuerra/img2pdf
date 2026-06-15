import { PageSizes } from 'pdf-lib';
import { expect, test } from 'vitest';
import {
  DEFAULT_PDF_OPTIONS,
  IMAGE_FITS,
  PAGE_MARGINS,
  PAGE_NUMBER_HORIZONTAL_ALIGNMENTS,
  PAGE_NUMBER_PLACEMENTS,
  PAGE_NUMBER_VERTICAL_POSITIONS,
  PAGE_ORIENTATIONS,
  PAGE_SIZES,
} from '../constants/pdfOptions';
import type { PageNumberingOptions, PdfOptions } from '../types/pdf';
import {
  getFixedPageSize,
  getImagePlacement,
  getPageNumberTextPlacement,
  getPageSize,
  mmToPdfPoints,
  PAGE_NUMBER_FONT_SIZE,
  PAGE_NUMBER_INSET,
  PAGE_NUMBER_RESERVED_HEIGHT,
} from './pageLayout';

function makeOptions(options: Partial<PdfOptions>): PdfOptions {
  return { ...DEFAULT_PDF_OPTIONS, ...options };
}

test('returns fixed page size for portrait and landscape presets', () => {
  expect(getFixedPageSize({
    pageSize: PAGE_SIZES.A4,
    orientation: PAGE_ORIENTATIONS.PORTRAIT,
  })).toEqual(PageSizes.A4);

  expect(getFixedPageSize({
    pageSize: PAGE_SIZES.LETTER,
    orientation: PAGE_ORIENTATIONS.LANDSCAPE,
  })).toEqual([...PageSizes.Letter].reverse());

  expect(getFixedPageSize({
    pageSize: PAGE_SIZES.OFICIO,
    orientation: PAGE_ORIENTATIONS.PORTRAIT,
  })).toEqual([mmToPdfPoints(216), mmToPdfPoints(330)]);
});

test('converts millimeters to PDF points', () => {
  expect(mmToPdfPoints(0)).toBe(0);
  expect(mmToPdfPoints(5)).toBeCloseTo(14.17, 2);
  expect(mmToPdfPoints(10)).toBeCloseTo(28.35, 2);
  expect(mmToPdfPoints(20)).toBeCloseTo(56.69, 2);
});

test('uses image dimensions for same-as-image pages', () => {
  expect(getPageSize(makeOptions({
    pageSize: PAGE_SIZES.IMAGE,
    orientation: PAGE_ORIENTATIONS.PORTRAIT,
  }), { width: 640, height: 480 })).toEqual([640, 480]);
});

test('swaps fixed page dimensions for rotated JPEG orientation', () => {
  expect(getPageSize(makeOptions({
    pageSize: PAGE_SIZES.A4,
    orientation: PAGE_ORIENTATIONS.PORTRAIT,
  }), { width: 100, height: 200 }, 6)).toEqual([PageSizes.A4[1], PageSizes.A4[0]]);
});

test('calculates centered contain placement with margin', () => {
  const placement = getImagePlacement(600, 800, 1200, 800, PAGE_MARGINS.MM_5, IMAGE_FITS.CONTAIN);

  expect(placement.width).toBeCloseTo(571.65, 2);
  expect(placement.height).toBeCloseTo(381.10, 2);
  expect(placement.x).toBeCloseTo(14.17, 2);
  expect(placement.y).toBeCloseTo(209.45, 2);
});

test('keeps placement unchanged when page numbering is disabled', () => {
  const placement = getImagePlacement(
    600,
    800,
    1200,
    800,
    PAGE_MARGINS.NONE,
    IMAGE_FITS.CONTAIN,
    makePageNumbering({ enabled: false }),
  );

  expect(placement).toEqual(getImagePlacement(600, 800, 1200, 800, PAGE_MARGINS.NONE, IMAGE_FITS.CONTAIN));
});

test('reserves bottom footer space for page numbering', () => {
  const placement = getImagePlacement(
    600,
    800,
    1200,
    800,
    PAGE_MARGINS.NONE,
    IMAGE_FITS.CONTAIN,
    makePageNumbering({
      enabled: true,
      placement: PAGE_NUMBER_PLACEMENTS.RESERVED,
      verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM,
    }),
  );

  expect(placement.width).toBeCloseTo(600, 2);
  expect(placement.height).toBeCloseTo(400, 2);
  expect(placement.y).toBeCloseTo(212, 2);
});

test('reserves top header space for page numbering', () => {
  const placement = getImagePlacement(
    600,
    800,
    1200,
    800,
    PAGE_MARGINS.NONE,
    IMAGE_FITS.CONTAIN,
    makePageNumbering({
      enabled: true,
      placement: PAGE_NUMBER_PLACEMENTS.RESERVED,
      verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.TOP,
    }),
  );

  expect(placement.width).toBeCloseTo(600, 2);
  expect(placement.height).toBeCloseTo(400, 2);
  expect(placement.y).toBeCloseTo(188, 2);
});

test('does not change image placement for page numbering overlay', () => {
  const placement = getImagePlacement(
    600,
    800,
    1200,
    800,
    PAGE_MARGINS.NONE,
    IMAGE_FITS.CONTAIN,
    makePageNumbering({
      enabled: true,
      placement: PAGE_NUMBER_PLACEMENTS.OVERLAY,
    }),
  );

  expect(placement).toEqual(getImagePlacement(600, 800, 1200, 800, PAGE_MARGINS.NONE, IMAGE_FITS.CONTAIN));
});

test('calculates page number text placement from alignment and vertical position', () => {
  expect(getPageNumberTextPlacement(600, 800, 10, makePageNumbering({
    horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.LEFT,
    verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM,
  }))).toEqual({ x: PAGE_NUMBER_INSET, y: PAGE_NUMBER_INSET });

  expect(getPageNumberTextPlacement(600, 800, 10, makePageNumbering({
    horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.CENTER,
    verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM,
  }))).toEqual({ x: 295, y: PAGE_NUMBER_INSET });

  expect(getPageNumberTextPlacement(600, 800, 10, makePageNumbering({
    horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT,
    verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.TOP,
  }))).toEqual({
    x: 600 - PAGE_NUMBER_INSET - 10,
    y: 800 - PAGE_NUMBER_INSET - PAGE_NUMBER_FONT_SIZE,
  });

  expect(PAGE_NUMBER_RESERVED_HEIGHT).toBe(24);
});

test('calculates centered cover placement that fills the available area', () => {
  const placement = getImagePlacement(600, 800, 1200, 800, PAGE_MARGINS.NONE, IMAGE_FITS.COVER);

  expect(placement.width).toBe(1200);
  expect(placement.height).toBe(800);
  expect(placement.x).toBe(-300);
  expect(placement.y).toBe(0);
});

test('keeps placement finite when margin exceeds the page dimensions', () => {
  const placement = getImagePlacement(100, 100, 1000, 1000, 500);

  expect(placement.width).toBe(1);
  expect(placement.height).toBe(1);
  expect(Number.isFinite(placement.x)).toBe(true);
  expect(Number.isFinite(placement.y)).toBe(true);
  expect(Number.isFinite(placement.scaleFactor)).toBe(true);
});

function makePageNumbering(overrides: Partial<PageNumberingOptions> = {}): PageNumberingOptions {
  return {
    ...DEFAULT_PDF_OPTIONS.pageNumbering,
    ...overrides,
  };
}
