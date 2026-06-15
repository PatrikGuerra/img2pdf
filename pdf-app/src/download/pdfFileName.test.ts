import { expect, test } from 'vitest';
import { normalizePdfFileName } from './pdfFileName';

test('normalizes PDF file names', () => {
  expect(normalizePdfFileName('report')).toBe('report.pdf');
  expect(normalizePdfFileName('report.pdf')).toBe('report.pdf');
  expect(normalizePdfFileName('  ')).toBe('file.pdf');
  expect(normalizePdfFileName('quarter:1/scan')).toBe('quarter-1-scan.pdf');
});
