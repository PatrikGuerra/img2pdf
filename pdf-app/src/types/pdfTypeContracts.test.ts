import { expect, test } from 'vitest';
import { DEFAULT_PDF_OPTIONS } from '../constants/pdfOptions';
import type { PdfOptions } from './pdf';

test('keeps PdfOptions contract available at compile time', () => {
  const options: PdfOptions = { ...DEFAULT_PDF_OPTIONS };

  expect(options.pageSize).toBe('A4');
});

// @ts-expect-error invalid page size must be rejected by TypeScript.
const invalidPageSize: PdfOptions = { ...DEFAULT_PDF_OPTIONS, pageSize: 'LEGAL' };
void invalidPageSize;
