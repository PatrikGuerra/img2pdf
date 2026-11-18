import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import heic2any from 'heic2any';
import App from './App';
import {
  IMAGE_FITS,
  PAGE_MARGINS,
  PAGE_NUMBER_HORIZONTAL_ALIGNMENTS,
  PAGE_NUMBER_PLACEMENTS,
  PAGE_NUMBER_VERTICAL_POSITIONS,
  PAGE_ORIENTATIONS,
  PAGE_SIZES,
} from './constants/pdfOptions';
import { downloadPdf } from './download/downloadPdf';
import { createPdfFromImages } from './pdf/createPdfFromImages';
import { mmToPdfPoints } from './pdf/pageLayout';

vi.mock('./pdf/createPdfFromImages', () => ({
  createPdfFromImages: vi.fn(),
}));

vi.mock('./download/downloadPdf', () => ({
  downloadPdf: vi.fn(),
}));

vi.mock('heic2any', () => ({
  default: vi.fn(async () => new Blob(['converted'], { type: 'image/jpeg' })),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(createPdfFromImages).mockResolvedValue(new Uint8Array([1, 2, 3]));
  vi.mocked(heic2any).mockResolvedValue(new Blob(['converted'], { type: 'image/jpeg' }));
});

test('renders the initial landing view', () => {
  render(<App />);

  expect(screen.getByText('CONVERT IMAGE TO PDF')).toBeInTheDocument();
  const repositoryLink = screen.getByRole('link', { name: 'Open PatrikGuerra/img2pdf on GitHub' });
  expect(repositoryLink).toHaveAttribute('href', 'https://github.com/PatrikGuerra/img2pdf');
  expect(repositoryLink).toHaveAttribute('target', '_blank');
  expect(repositoryLink).toHaveAttribute('rel', 'noreferrer');
  expect(screen.getByText(/Convert JPEG, PNG, WebP, HEIC, or HEIF images to PDF/i)).toBeInTheDocument();
  expect(screen.getByTestId('file-input')).toHaveAttribute(
    'accept',
    'image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif',
  );
  const dropzone = screen.getByRole('region', { name: /drop images here/i });

  expect(dropzone).toHaveClass('dropzone');
  expect(within(dropzone).getByRole('button', { name: /select images/i })).toBeInTheDocument();
  expect(within(dropzone).getByText(/or drop images here/i)).toBeInTheDocument();
});

test('adds supported image files and exposes PDF options', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByText('Selected: Page 1')).toBeInTheDocument();
  expect(screen.getByText('1 image · estimated 5 B')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'A4' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'US Letter' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Oficio' })).toHaveAttribute('aria-pressed', 'false');
});

test('adds supported image files dropped on the landing dropzone', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'dropped.png', { type: 'image/png' });

  render(<App />);

  const dropzone = screen.getByRole('region', { name: /drop images here/i });
  fireEvent.dragEnter(dropzone, {
    dataTransfer: {
      files: [file],
      items: [],
    },
  });
  expect(dropzone).toHaveClass('dropzone--active');

  fireEvent.drop(dropzone, {
    dataTransfer: {
      files: [file],
      items: [],
    },
  });

  await continueUpload(user);

  expect(await screen.findByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByText('Selected: Page 1')).toBeInTheDocument();
  expect(URL.createObjectURL).toHaveBeenCalledWith(file);
});

test('prepares multiple pasted images', async () => {
  render(<App />);
  const files = [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })];
  fireEvent.paste(window, { clipboardData: { files } });
  expect(await screen.findByRole('button', { name: 'Continue with 2 images' })).toBeInTheDocument();
});

test('loads image URLs and retains failed URLs for retry', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).includes('bad')) throw new Error('blocked');
    return { ok: true, blob: async () => new Blob(['image'], { type: 'image/png' }) } as Response;
  });
  try {
    render(<App />);
    await user.type(screen.getByLabelText('Image URLs (one per line)'), 'https://example.com/one.png{enter}https://example.com/bad.png');
    await user.click(screen.getByRole('button', { name: 'Add image URLs' }));
    expect(await screen.findByText('one.png')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('1 URL(s) could not be loaded');
    expect(screen.getByLabelText('Image URLs (one per line)')).toHaveValue('https://example.com/bad.png');
  } finally {
    fetchMock.mockRestore();
  }
});

test('shows selected PNG and JPEG files as ready before continuing', async () => {
  const user = userEvent.setup();
  const png = new File(['png'], 'photo.png', { type: 'image/png' });
  const jpeg = new File(['jpeg'], 'scan.jpg', { type: 'image/jpeg' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), [png, jpeg]);

  expect(await screen.findByText('photo.png')).toBeInTheDocument();
  expect(screen.getByText('scan.jpg')).toBeInTheDocument();
  expect(screen.getByAltText('Preview of photo.png')).toBeInTheDocument();
  expect(screen.getByAltText('Preview of scan.jpg')).toBeInTheDocument();
  expect(screen.getAllByText('Ready')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Continue with 2 images' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /select page 1/i })).not.toBeInTheDocument();

  await continueUpload(user);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /select page 2/i })).toBeInTheDocument();
});

test('keeps already prepared files when more files are selected before continuing', async () => {
  const user = userEvent.setup();
  const first = new File(['one'], 'one.png', { type: 'image/png' });
  const second = new File(['two'], 'two.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), first);
  expect(await screen.findByText('one.png')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue with 1 image' })).toBeInTheDocument();

  await user.upload(screen.getByTestId('file-input'), second);

  expect(await screen.findByText('one.png')).toBeInTheDocument();
  expect(screen.getByText('two.png')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue with 2 images' })).toBeInTheDocument();

  await continueUpload(user);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /select page 2/i })).toBeInTheDocument();
});

test('starts with the expected default PDF options', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  expect(screen.getByRole('heading', { name: 'Page setup' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Image placement' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Page numbers' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Output' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'A4' })).toHaveAttribute('aria-pressed', 'true');
  expect(getOptionButton('Portrait')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '0 mm' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('spinbutton', { name: /custom margin/i })).toHaveValue(0);
  expect(screen.getByText('Page background')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'No background' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Use color' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('Background color')).toBeDisabled();
  expect(screen.getByLabelText('Background color')).toHaveValue('#ffffff');
  expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: "Don't Compress" })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Image quality')).toBeInTheDocument();
  expect(screen.getByText('80%')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Increase image quality' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Decrease image quality' })).toBeDisabled();
  expect(screen.getByText('Page numbers')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hide page numbers' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Show page numbers' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Bottom' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Center' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Header/Footer' })).toBeDisabled();
});

test('opens the responsive options bottom sheet from the action bar', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  const optionsPanel = screen.getByLabelText('PDF options');
  expect(optionsPanel).not.toHaveClass('options--visible');

  await user.click(screen.getByRole('button', { name: 'PDF Options' }));

  expect(optionsPanel).toHaveClass('options--visible');
  expect(screen.getByRole('button', { name: 'Close options' })).toBeInTheDocument();
});

test('keeps fixed-page-only options visible but disabled for same-as-image pages', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);
  await user.click(screen.getByRole('button', { name: 'Same as Image' }));

  expect(screen.getByText('Page margin')).toBeInTheDocument();
  expect(screen.getByText('Image fit')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '0 mm' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '5 mm' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '10 mm' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '20 mm' })).toBeDisabled();
  expect(screen.getByRole('spinbutton', { name: /custom margin/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Fit' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cover' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'A4' }));

  expect(screen.getByRole('button', { name: '0 mm' })).not.toBeDisabled();
  expect(screen.getByRole('spinbutton', { name: /custom margin/i })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Fit' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cover' })).not.toBeDisabled();
});

test('shows an alert for ignored files and keeps only supported images', async () => {
  const user = userEvent.setup();
  const image = new File(['image'], 'photo.png', { type: 'image/png' });
  const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
  const pdf = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });

  render(<App />);

  fireEvent.change(screen.getByTestId('file-input'), {
    target: { files: [image, text, pdf] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent('2 files were not PNG/JPEG/WebP/HEIC/HEIF.');
  expect(screen.getAllByText('Ignored: not PNG/JPEG/WebP/HEIC/HEIF.')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /select page 1/i })).not.toBeInTheDocument();
  await continueUpload(user);
  expect(await screen.findByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /select page 2/i })).not.toBeInTheDocument();
});

test('converts HEIC uploads locally and passes converted JPEGs to PDF generation', async () => {
  const user = userEvent.setup();
  const sourceFile = new File([new Uint8Array(2048)], 'iphone.heic', { type: 'image/heic' });
  let resolveConversion: ((blob: Blob) => void) | undefined;
  vi.mocked(heic2any).mockReturnValue(new Promise((resolve) => {
    resolveConversion = resolve;
  }));

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), sourceFile);

  expect(await screen.findByText('iphone.heic')).toBeInTheDocument();
  expect(screen.getByText('Converting HEIC/HEIF to JPEG locally...')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /continue with/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /select page 1/i })).not.toBeInTheDocument();

  if (!resolveConversion) {
    throw new Error('Expected HEIC conversion resolver to be set.');
  }

  resolveConversion(new Blob(['converted'], { type: 'image/jpeg' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('1 HEIC/HEIF file was converted to JPEG locally.');
  expect(screen.getByText('Converted to JPEG locally.')).toBeInTheDocument();
  expect(screen.getByAltText('Preview of iphone.heic')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue with 1 image' })).toBeInTheDocument();
  expect(heic2any).toHaveBeenCalledWith({
    blob: sourceFile,
    quality: 0.95,
    toType: 'image/jpeg',
  });

  const previewFile = vi.mocked(URL.createObjectURL).mock.calls[0][0] as File;
  expect(previewFile).not.toBe(sourceFile);
  expect(previewFile.name).toBe('iphone.jpg');
  expect(previewFile.type).toBe('image/jpeg');

  await continueUpload(user);
  expect(screen.getByText(/1 image .* estimated 2\.0 KB/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images[0]).toEqual(expect.objectContaining({
      convertedFrom: 'HEIC',
      file: expect.objectContaining({
        name: 'iphone.jpg',
        type: 'image/jpeg',
      }),
      sourceFile,
    }));
  });
});

test('combines local conversion and ignored file feedback', async () => {
  const user = userEvent.setup();
  const sourceFile = new File(['heif'], 'photo.heif', { type: '' });
  const text = new File(['text'], 'notes.txt', { type: 'text/plain' });

  render(<App />);

  fireEvent.change(screen.getByTestId('file-input'), {
    target: { files: [sourceFile, text] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '1 HEIC/HEIF file was converted to JPEG locally. 1 file was not PNG/JPEG/WebP/HEIC/HEIF.',
  );
  expect(screen.getByText('Converted to JPEG locally.')).toBeInTheDocument();
  expect(screen.getByText('Ignored: not PNG/JPEG/WebP/HEIC/HEIF.')).toBeInTheDocument();
  await continueUpload(user);
  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /select page 2/i })).not.toBeInTheDocument();
});

test('shows HEIC conversion failures without creating a page', async () => {
  const user = userEvent.setup();
  const sourceFile = new File(['heic'], 'broken.heic', { type: 'image/heic' });
  vi.mocked(heic2any).mockRejectedValue(new Error('bad heic'));

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), sourceFile);

  expect(await screen.findByText('Conversion failed. Try exporting this image as JPEG.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue with 0 images' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /select page 1/i })).not.toBeInTheDocument();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('clears the upload selection and allows selecting the same file again', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  expect(await screen.findByText('photo.png')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Clear selection' }));

  expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
  await uploadAndContinue(user, file);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
});

test('resets the file input so the same file can be uploaded again', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);
  await uploadAndContinue(user, file);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /select page 2/i })).toBeInTheDocument();
});

test('add page uses the preparation overlay before appending pages', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, firstFile);
  await user.upload(screen.getByTestId('file-input'), secondFile);

  expect(await screen.findByRole('dialog', { name: 'Prepare selected files' })).toBeInTheDocument();
  expect(screen.getByText('two.png')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /select page 2/i })).not.toBeInTheDocument();

  await continueUpload(user);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /select page 2/i })).toBeInTheDocument();
});

test('shows page numbers and automatic page orientations after upload', async () => {
  const user = userEvent.setup();
  const portraitFile = new File(['portrait'], 'portrait.png', { type: 'image/png' });
  const landscapeFile = new File(['landscape'], 'landscape.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, [portraitFile, landscapeFile]);

  expect(await screen.findByText('Page 1')).toBeInTheDocument();
  expect(screen.getByText('Page 2')).toBeInTheDocument();
  expect(getToolbarButton('Portrait')).toHaveAttribute('aria-pressed', 'true');
  await selectPage(user, 2);
  expect(getToolbarButton('Landscape')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('Mixed page orientations')).not.toBeInTheDocument();
});

test('restores a deleted last page and releases its URL on unmount', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  const { unmount } = render(<App />);

  await uploadAndContinue(user, file);
  const previewUrl = vi.mocked(URL.createObjectURL).mock.results[0].value;

  await user.click(screen.getByRole('button', { name: 'Remove' }));

  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Remove page?' });
  expect(dialog).toHaveTextContent('Page 1 will be removed from the PDF.');
  await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(previewUrl);
  expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Undo last page edit' }));
  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrl);
});

test('restores a page edit and displays generated PDF size', async () => {
  const user = userEvent.setup();
  render(<App />);
  await uploadAndContinue(user, new File(['image'], 'photo.webp', { type: 'image/webp' }));
  await user.click(screen.getByRole('button', { name: 'Rotate' }));
  await user.click(screen.getByRole('button', { name: 'Undo page edit' }));
  await user.click(screen.getByRole('button', { name: 'Generate PDF' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Last PDF: 3 B');
  expect(vi.mocked(createPdfFromImages).mock.calls[0][0][0].rotationDegrees).toBe(0);
});

test('persists PDF settings across app remounts', async () => {
  const user = userEvent.setup();
  const first = render(<App />);
  await uploadAndContinue(user, new File(['image'], 'photo.png', { type: 'image/png' }));
  await user.click(screen.getByRole('button', { name: 'US Letter' }));
  await user.click(screen.getByRole('button', { name: '5 mm' }));
  await user.click(screen.getByRole('button', { name: 'Compress Images' }));
  await user.click(screen.getByRole('button', { name: 'Decrease image quality' }));
  fireEvent.change(screen.getByLabelText('Maximum image dimension (pixels)'), { target: { value: '1200' } });
  first.unmount();
  render(<App />);
  await uploadAndContinue(user, new File(['image'], 'photo.png', { type: 'image/png' }));
  expect(screen.getByRole('button', { name: 'US Letter' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '5 mm' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('70%')).toBeInTheDocument();
  expect(screen.getByLabelText('Maximum image dimension (pixels)')).toHaveValue(1200);
});

test('canceling page removal keeps the page and its object URL', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);
  await screen.findByRole('button', { name: /select page 1/i });
  await user.click(screen.getByRole('button', { name: 'Remove' }));

  const dialog = screen.getByRole('dialog', { name: 'Remove page?' });
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
});

test('revokes remaining object URLs when the app unmounts', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.jpg', { type: 'image/jpeg' });
  const { unmount } = render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile]);
  const previewUrls = vi.mocked(URL.createObjectURL).mock.results.map((result) => result.value);

  unmount();

  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrls[0]);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrls[1]);
});

test('reorders pages via drag-and-drop data transfer', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.jpg', { type: 'image/jpeg' });

  render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile]);

  const firstPage = screen.getByRole('button', { name: /select page 1/i });
  const secondPage = screen.getByRole('button', { name: /select page 2/i });
  const firstPageShell = firstPage.parentElement;
  const secondPageShell = secondPage.parentElement;
  if (!firstPageShell || !secondPageShell) {
    throw new Error('Expected page shell elements to exist.');
  }

  fireEvent.drop(firstPageShell, {
    dataTransfer: {
      getData: () => secondPageShell.getAttribute('draggable') ? getImageIdFromDragStart(secondPageShell) : '',
    },
  });

  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images.map((image) => image.file.name)).toEqual(['two.jpg', 'one.png']);
  });
});

test('per-page orientation updates only the selected page', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.png', { type: 'image/png' });
  const thirdFile = new File(['three'], 'three.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile, thirdFile]);
  await selectPage(user, 3);
  await user.click(getToolbarButton('Landscape'));
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images.map((image) => image.pageOrientation)).toEqual([
      PAGE_ORIENTATIONS.PORTRAIT,
      PAGE_ORIENTATIONS.LANDSCAPE,
      PAGE_ORIENTATIONS.LANDSCAPE,
    ]);
  });
});

test('passes updated options to PDF generation and downloads the result', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

  render(<App />);

  await uploadAndContinue(user, file);
  await user.clear(screen.getByLabelText('PDF name'));
  await user.type(screen.getByLabelText('PDF name'), 'scan bundle');
  await user.click(screen.getByRole('button', { name: 'Oficio' }));
  await user.click(screen.getByRole('button', { name: '10 mm' }));
  await user.click(screen.getByRole('button', { name: 'Cover' }));
  await user.click(screen.getByRole('button', { name: 'Compress Images' }));
  expect(screen.getByText('80%')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Increase image quality' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Decrease image quality' })).not.toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Increase image quality' }));
  expect(screen.getByText('90%')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    expect(createPdfFromImages).toHaveBeenCalledWith(
      [expect.objectContaining({
        file,
        previewUrl: expect.stringMatching(/^blob:test-/),
        rotationDegrees: 0,
        selected: true,
      })],
      expect.objectContaining({
        pageSize: PAGE_SIZES.OFICIO,
        orientation: PAGE_ORIENTATIONS.PORTRAIT,
        margin: PAGE_MARGINS.MM_10,
        imageFit: IMAGE_FITS.COVER,
        compressImages: true,
        imageQuality: 90,
      }),
      expect.any(Function),
    );
    expect(downloadPdf).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 'scan bundle.pdf');
  });
});

test('opens the about dialog with original project and third-party credits', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  const aboutButton = screen.getByRole('button', { name: 'About this app' });
  expect(aboutButton).toHaveAttribute('title', 'About this app');
  expect(aboutButton.closest('.right-actions')).toBeInTheDocument();

  await user.click(aboutButton);

  const dialog = screen.getByRole('dialog', { name: 'About this app' });
  const originalProject = within(dialog).getByRole('link', { name: 'subhra74/img2pdf' });
  expect(originalProject).toHaveAttribute('href', 'https://github.com/subhra74/img2pdf');

  [
    'React',
    'React DOM',
    'pdf-lib',
    'exif-js',
    'heic2any',
    'mobile-drag-drop',
    'Font Awesome',
    'Vite',
    '@vitejs/plugin-react',
    'TypeScript',
    'Vitest',
    'jsdom',
    '@testing-library/jest-dom',
    '@testing-library/react',
    '@testing-library/user-event',
    '@types/exif-js',
    '@types/node',
    '@types/react',
    '@types/react-dom',
  ].forEach((creditName) => {
    expect(within(dialog).getByRole('link', { name: creditName })).toBeInTheDocument();
  });

  within(dialog).getAllByRole('link').forEach((link) => {
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  await user.click(within(dialog).getByRole('button', { name: 'Close' }));

  expect(screen.queryByRole('dialog', { name: 'About this app' })).not.toBeInTheDocument();
});

test('page background color updates preview and PDF options', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  const backgroundInput = screen.getByLabelText('Background color');
  expect(backgroundInput).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Use color' }));
  expect(backgroundInput).not.toBeDisabled();
  expect(backgroundInput).toHaveValue('#ffffff');

  fireEvent.change(backgroundInput, { target: { value: '#ff0033' } });
  expect(backgroundInput).toHaveValue('#ff0033');
  expect(screen.getByRole('button', { name: /select page 1/i })).toHaveStyle({
    background: 'rgb(255, 0, 51)',
  });
  expect(screen.getByRole('button', { name: /select page 1/i }).querySelector('.page-image')).toHaveStyle({
    backgroundColor: 'rgb(255, 0, 51)',
  });

  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [, options] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(options).toEqual(expect.objectContaining({
      pageBackgroundColor: '#ff0033',
    }));
  });

  await user.click(screen.getByRole('button', { name: 'No background' }));
  expect(backgroundInput).toBeDisabled();
  expect(screen.getByRole('button', { name: /select page 1/i })).toHaveStyle({
    background: 'white',
  });
  expect((screen.getByRole('button', { name: /select page 1/i }).querySelector('.page-image') as HTMLElement).style.backgroundColor)
    .toBe('transparent');

  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [, options] = vi.mocked(createPdfFromImages).mock.calls[1];
    expect(options).toEqual(expect.objectContaining({
      pageBackgroundColor: null,
    }));
  });
});

test('custom page margin accepts decimal millimeter values', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

  render(<App />);

  await uploadAndContinue(user, file);
  const marginInput = screen.getByRole('spinbutton', { name: /custom margin/i });

  await user.click(screen.getByRole('button', { name: '20 mm' }));
  expect(marginInput).toHaveValue(20);

  fireEvent.change(marginInput, { target: { value: '12.5' } });
  expect(marginInput).toHaveValue(12.5);
  expect(screen.getByRole('button', { name: '20 mm' })).toHaveAttribute('aria-pressed', 'false');

  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const pdfCall = vi.mocked(createPdfFromImages).mock.calls[0];
    if (!pdfCall) {
      throw new Error('Expected PDF generation to be called.');
    }

    const [, options] = pdfCall;
    if (!options) {
      throw new Error('Expected PDF options to be passed.');
    }

    expect(options.margin).toBeCloseTo(mmToPdfPoints(12.5), 5);
  });
});

test('page numbering controls enable preview and pass options to PDF generation', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  expect(screen.queryByLabelText('Preview page number 1')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Show page numbers' }));

  expect(screen.getByLabelText('Preview page number 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bottom' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Center' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Header/Footer' })).not.toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Top' }));
  await user.click(screen.getByRole('button', { name: 'Right' }));
  await user.click(screen.getByRole('button', { name: 'Overlay' }));
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const pdfCall = vi.mocked(createPdfFromImages).mock.calls[0];
    if (!pdfCall) {
      throw new Error('Expected PDF generation to be called.');
    }

    const [, options] = pdfCall;
    expect(options).toEqual(expect.objectContaining({
      pageNumbering: {
        enabled: true,
        horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT,
        placement: PAGE_NUMBER_PLACEMENTS.OVERLAY,
        verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.TOP,
      },
    }));
  });
});

test('flip controls update the page passed to PDF generation', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);
  await user.click(screen.getByRole('button', { name: 'Flip horizontal' }));
  await user.click(screen.getByRole('button', { name: 'Flip vertical' }));
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images[0]).toEqual(expect.objectContaining({
      flipHorizontal: true,
      flipVertical: true,
    }));
  });
});

test('shows PDF generation progress from the progress callback', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.png', { type: 'image/png' });
  let resolvePdf: ((bytes: Uint8Array) => void) | undefined;
  vi.mocked(createPdfFromImages).mockImplementation((images, _options, onProgress) => {
    onProgress?.({ current: 1, total: images.length, image: images[0] });
    return new Promise((resolve) => {
      resolvePdf = resolve;
    });
  });

  render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile]);
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  expect(screen.getByText('Processing 1 of 2')).toBeInTheDocument();

  if (!resolvePdf) {
    throw new Error('Expected PDF promise resolver to be set.');
  }

  resolvePdf(new Uint8Array([1, 2, 3]));

  await waitFor(() => {
    expect(downloadPdf).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 'file.pdf');
  });
});

test('global orientation applies directly when pages are uniform', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);
  await user.click(getOptionButton('Landscape'));
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images, options] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images[0].pageOrientation).toBe(PAGE_ORIENTATIONS.LANDSCAPE);
    expect(options).toEqual(expect.objectContaining({
      orientation: PAGE_ORIENTATIONS.LANDSCAPE,
    }));
  });
});

test('global orientation warns before overwriting mixed page orientations', async () => {
  const user = userEvent.setup();
  const portraitFile = new File(['portrait'], 'portrait.png', { type: 'image/png' });
  const landscapeFile = new File(['landscape'], 'landscape.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, [portraitFile, landscapeFile]);
  expect(await screen.findByText('Page 2')).toBeInTheDocument();
  expect(screen.queryByText('Mixed page orientations')).not.toBeInTheDocument();

  await user.click(getOptionButton('Landscape'));

  const dialog = screen.getByRole('dialog', { name: 'Change all page orientations?' });
  expect(dialog).toHaveTextContent('Your pages currently use both Portrait and Landscape.');
  await user.click(within(dialog).getByRole('button', { name: 'Change all' }));
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images, options] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images.map((image) => image.pageOrientation)).toEqual([
      PAGE_ORIENTATIONS.LANDSCAPE,
      PAGE_ORIENTATIONS.LANDSCAPE,
    ]);
    expect(options).toEqual(expect.objectContaining({
      orientation: PAGE_ORIENTATIONS.LANDSCAPE,
    }));
  });
});

test('page controls move, rotate and remove pages without drag-and-drop', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.png', { type: 'image/png' });
  const thirdFile = new File(['three'], 'three.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile, thirdFile]);
  await selectPage(user, 3);
  await user.click(screen.getByRole('button', { name: 'Move left' }));
  await user.click(screen.getByRole('button', { name: 'Rotate' }));
  await selectPage(user, 1);
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Remove page?' })).getByRole('button', { name: 'Remove' }));
  expect(screen.getByText('Selected: Page 1')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images] = vi.mocked(createPdfFromImages).mock.calls[0];
    expect(images.map((image) => image.file.name)).toEqual(['three.png', 'two.png']);
    expect(images[0].rotationDegrees).toBe(90);
  });
});

test('shows a single contextual toolbar for the selected page', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile]);

  expect(screen.getByText('Selected: Page 1')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /remove page 1/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /move page 1 right/i })).not.toBeInTheDocument();
  expect(within(getPageShell(1)).queryByRole('button', { name: 'Portrait' })).not.toBeInTheDocument();
  expect(within(getPageShell(1)).queryByRole('button', { name: 'Landscape' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
  expect(getToolbarButton('Portrait')).toHaveClass('page-control-button--orientation');
  expect(getToolbarButton('Portrait')).toHaveTextContent('');
  expect(getToolbarButton('Landscape')).toHaveClass('page-control-button--orientation');
  expect(getToolbarButton('Move left')).toHaveClass('page-control-button--move');
  expect(getToolbarButton('Move right')).toHaveClass('page-control-button--move');
  expect(getToolbarButton('Rotate')).toHaveClass('page-control-button--rotate');
  expect(getToolbarButton('Flip horizontal')).toHaveClass('page-control-button--flip');
  expect(getToolbarButton('Flip vertical')).toHaveClass('page-control-button--flip');
  expect(getToolbarButton('Remove')).toHaveClass('page-control-button--danger');
  expect(screen.getByRole('button', { name: 'Move left' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move right' })).not.toBeDisabled();

  await selectPage(user, 2);

  expect(screen.getByText('Selected: Page 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Move left' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move right' })).toBeDisabled();
});

test('contextual toolbar keeps selection on the next page after removing the selected page', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.png', { type: 'image/png' });
  const thirdFile = new File(['three'], 'three.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, [firstFile, secondFile, thirdFile]);
  await selectPage(user, 2);
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Remove page?' })).getByRole('button', { name: 'Remove' }));

  expect(screen.queryByText('Page 3')).not.toBeInTheDocument();
  expect(screen.getByText('Selected: Page 2')).toBeInTheDocument();
});

test('contextual toolbar uses the fixed responsive layout classes', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await uploadAndContinue(user, file);

  const toolbar = screen.getByText('Selected: Page 1').closest('.selected-page-toolbar');

  expect(toolbar).toBeInTheDocument();
  expect(toolbar).toHaveClass('selected-page-toolbar');
  expect(toolbar?.querySelector('.selected-page-actions')).toBeInTheDocument();
});

test('clears busy state and reports an error when PDF generation fails', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createPdfFromImages).mockRejectedValue(new Error('PDF failed'));

  render(<App />);

  await uploadAndContinue(user, file);
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('PDF failed');
  expect(screen.queryByText(/Preparing PDF|Processing/i)).not.toBeInTheDocument();
  expect(downloadPdf).not.toHaveBeenCalled();

  consoleError.mockRestore();
});

test('does not start a second PDF generation while busy', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  let resolvePdf: ((bytes: Uint8Array) => void) | undefined;
  vi.mocked(createPdfFromImages).mockReturnValue(new Promise((resolve) => {
    resolvePdf = resolve;
  }));

  render(<App />);

  await uploadAndContinue(user, file);
  const generateButton = screen.getByRole('button', { name: /generate pdf/i });

  await user.click(generateButton);
  expect(generateButton).toBeDisabled();

  await user.click(generateButton);
  expect(createPdfFromImages).toHaveBeenCalledTimes(1);

  if (!resolvePdf) {
    throw new Error('Expected PDF promise resolver to be set.');
  }

  resolvePdf(new Uint8Array([4, 5, 6]));

  await waitFor(() => {
    expect(downloadPdf).toHaveBeenCalledWith(new Uint8Array([4, 5, 6]), 'file.pdf');
  });
});

async function uploadAndContinue(
  user: ReturnType<typeof userEvent.setup>,
  files: File | File[],
): Promise<void> {
  await user.upload(screen.getByTestId('file-input'), files);
  await continueUpload(user);
}

async function continueUpload(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: /continue with \d+ images?/i }));
}

function getImageIdFromDragStart(element: HTMLElement): string {
  const dataTransfer = {
    effectAllowed: '',
    setData: vi.fn(),
  };

  fireEvent.dragStart(element, { dataTransfer });
  return dataTransfer.setData.mock.calls[0][1];
}

function getOptionButton(name: string): HTMLElement {
  const button = screen.getAllByRole('button', { name })
    .find((element) => element.classList.contains('option-choice'));

  if (!button) {
    throw new Error(`Expected option button "${name}" to exist.`);
  }

  return button;
}

async function selectPage(user: ReturnType<typeof userEvent.setup>, pageNumber: number) {
  await user.click(screen.getByRole('button', { name: `Select page ${pageNumber}` }));
}

function getPageShell(pageNumber: number): HTMLElement {
  const page = screen.getByRole('button', { name: `Select page ${pageNumber}` });
  const shell = page.closest('.image-page-shell');

  if (!shell) {
    throw new Error(`Expected page ${pageNumber} shell to exist.`);
  }

  return shell as HTMLElement;
}

function getToolbarButton(name: string): HTMLElement {
  const toolbar = screen.getByText(/Selected: Page \d+/).closest('.selected-page-toolbar');

  if (!toolbar) {
    throw new Error('Expected selected page toolbar to exist.');
  }

  return within(toolbar as HTMLElement).getByRole('button', { name });
}
