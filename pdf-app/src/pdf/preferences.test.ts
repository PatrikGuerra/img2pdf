import { expect, test } from 'vitest';
import { DEFAULT_PDF_OPTIONS } from '../constants/pdfOptions';
import { loadPreferences, savePreferences } from './preferences';

test('saves options and rejects invalid or corrupt storage', () => {
  savePreferences({ ...DEFAULT_PDF_OPTIONS, pageSize: 'LETTER', maxImageDimension: 1200 });
  expect(loadPreferences()).toMatchObject({ pageSize: 'LETTER', maxImageDimension: 1200 });
  localStorage.setItem('img2pdf-options', '{"pageSize":"invalid","margin":-3,"maxImageDimension":100000}');
  expect(loadPreferences()).toMatchObject({ pageSize: 'A4', margin: 0, maxImageDimension: 0 });
  localStorage.setItem('img2pdf-options', '{');
  expect(loadPreferences()).toEqual(DEFAULT_PDF_OPTIONS);
  localStorage.clear();
});
