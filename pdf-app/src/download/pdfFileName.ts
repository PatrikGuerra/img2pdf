const DEFAULT_PDF_FILE_NAME = 'file.pdf';

export function normalizePdfFileName(fileName: string): string {
  const cleanedName = fileName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^-+|-+$/g, '');

  if (!cleanedName) {
    return DEFAULT_PDF_FILE_NAME;
  }

  return /\.pdf$/i.test(cleanedName) ? cleanedName : `${cleanedName}.pdf`;
}
