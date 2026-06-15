export function downloadPdf(pdfBytes: Uint8Array, fileName = 'file.pdf'): string {
  const copiedBytes: Uint8Array<ArrayBuffer> = new Uint8Array(pdfBytes.byteLength);
  copiedBytes.set(pdfBytes);
  const blob = new Blob([copiedBytes.buffer], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 0);

  return url;
}
