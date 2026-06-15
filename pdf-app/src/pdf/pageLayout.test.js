import { PageSizes } from 'pdf-lib';
import { expect, test } from 'vitest';
import { IMAGE_FITS, PAGE_MARGINS, PAGE_ORIENTATIONS, PAGE_SIZES } from '../constants/pdfOptions';
import { getFixedPageSize, getImagePlacement, getPageSize, mmToPdfPoints } from './pageLayout';

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
  expect(getPageSize({
    pageSize: PAGE_SIZES.IMAGE,
    orientation: PAGE_ORIENTATIONS.PORTRAIT,
  }, { width: 640, height: 480 })).toEqual([640, 480]);
});

test('swaps fixed page dimensions for rotated JPEG orientation', () => {
  expect(getPageSize({
    pageSize: PAGE_SIZES.A4,
    orientation: PAGE_ORIENTATIONS.PORTRAIT,
  }, { width: 100, height: 200 }, 6)).toEqual([PageSizes.A4[1], PageSizes.A4[0]]);
});

test('calculates centered contain placement with margin', () => {
  const placement = getImagePlacement(600, 800, 1200, 800, PAGE_MARGINS.MM_5, IMAGE_FITS.CONTAIN);

  expect(placement.width).toBeCloseTo(571.65, 2);
  expect(placement.height).toBeCloseTo(381.10, 2);
  expect(placement.x).toBeCloseTo(14.17, 2);
  expect(placement.y).toBeCloseTo(209.45, 2);
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
