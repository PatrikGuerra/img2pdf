import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import { IMAGE_FITS, PAGE_MARGINS, PAGE_ORIENTATIONS, PAGE_SIZES } from './constants/pdfOptions';
import { downloadPdf } from './download/downloadPdf';
import { createPdfFromImages } from './pdf/createPdfFromImages';

vi.mock('./pdf/createPdfFromImages', () => ({
  createPdfFromImages: vi.fn(),
}));

vi.mock('./download/downloadPdf', () => ({
  downloadPdf: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  createPdfFromImages.mockResolvedValue(new Uint8Array([1, 2, 3]));
});

test('renders the initial landing view', () => {
  render(<App />);

  expect(screen.getByText(/Convert JPEG or PNG images to PDF/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
  expect(screen.getByText(/or drop images here/i)).toBeInTheDocument();
});

test('adds supported image files and exposes PDF options', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'A4' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'US Letter' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Oficio' })).toHaveAttribute('aria-pressed', 'false');
});

test('starts with the expected default PDF options', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);

  expect(screen.getByRole('button', { name: 'A4' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Portrait' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '0 mm' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: "Don't Compress" })).toHaveAttribute('aria-pressed', 'true');
});

test('shows an alert for ignored files and keeps only supported images', async () => {
  const image = new File(['image'], 'photo.png', { type: 'image/png' });
  const text = new File(['text'], 'notes.txt', { type: 'text/plain' });

  render(<App />);

  fireEvent.change(screen.getByTestId('file-input'), {
    target: { files: [image, text] },
  });

  expect(screen.getByRole('alert')).toHaveTextContent('1 file ignored');
  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /select page 2/i })).not.toBeInTheDocument();
});

test('resets the file input so the same file can be uploaded again', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  await user.upload(screen.getByTestId('file-input'), file);

  expect(screen.getByRole('button', { name: /select page 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /select page 2/i })).toBeInTheDocument();
});

test('revokes the object URL when a page is deleted', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  const previewUrl = URL.createObjectURL.mock.results[0].value;

  await user.click(screen.getByRole('button', { name: /select page 1/i }));
  await user.click(screen.getByRole('button', { name: /delete page 1/i }));

  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrl);
  expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
});

test('revokes remaining object URLs when the app unmounts', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.jpg', { type: 'image/jpeg' });
  const { unmount } = render(<App />);

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile]);
  const previewUrls = URL.createObjectURL.mock.results.map((result) => result.value);

  unmount();

  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrls[0]);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrls[1]);
});

test('reorders pages via drag-and-drop data transfer', async () => {
  const user = userEvent.setup();
  const firstFile = new File(['one'], 'one.png', { type: 'image/png' });
  const secondFile = new File(['two'], 'two.jpg', { type: 'image/jpeg' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile]);

  const firstPage = screen.getByRole('button', { name: /select page 1/i });
  const secondPage = screen.getByRole('button', { name: /select page 2/i });
  fireEvent.drop(firstPage.parentElement, {
    dataTransfer: {
      getData: () => secondPage.parentElement.getAttribute('draggable') ? getImageIdFromDragStart(secondPage.parentElement) : '',
    },
  });

  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    const [images] = createPdfFromImages.mock.calls[0];
    expect(images.map((image) => image.file.name)).toEqual(['two.jpg', 'one.png']);
  });
});

test('passes updated options to PDF generation and downloads the result', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  await user.click(screen.getByRole('button', { name: 'Oficio' }));
  await user.click(screen.getByRole('button', { name: '10 mm' }));
  await user.click(screen.getByRole('button', { name: 'Cover' }));
  await user.click(screen.getByRole('button', { name: 'Compress Images' }));
  expect(screen.getByText('80%')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Increase image quality' }));
  expect(screen.getByText('90%')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  await waitFor(() => {
    expect(createPdfFromImages).toHaveBeenCalledWith(
      [expect.objectContaining({ file, previewUrl: expect.stringMatching(/^blob:test-/), selected: false })],
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
    expect(downloadPdf).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
  });
});

test('clears busy state and reports an error when PDF generation fails', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  createPdfFromImages.mockRejectedValue(new Error('PDF failed'));

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  await user.click(screen.getByRole('button', { name: /generate pdf/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('PDF failed');
  expect(screen.queryByText(/Generating PDF/i)).not.toBeInTheDocument();
  expect(downloadPdf).not.toHaveBeenCalled();

  consoleError.mockRestore();
});

test('does not start a second PDF generation while busy', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  let resolvePdf;
  createPdfFromImages.mockReturnValue(new Promise((resolve) => {
    resolvePdf = resolve;
  }));

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  const generateButton = screen.getByRole('button', { name: /generate pdf/i });

  await user.click(generateButton);
  expect(generateButton).toBeDisabled();

  await user.click(generateButton);
  expect(createPdfFromImages).toHaveBeenCalledTimes(1);

  resolvePdf(new Uint8Array([4, 5, 6]));

  await waitFor(() => {
    expect(downloadPdf).toHaveBeenCalledWith(new Uint8Array([4, 5, 6]));
  });
});

function getImageIdFromDragStart(element) {
  const dataTransfer = {
    effectAllowed: '',
    setData: vi.fn(),
  };

  fireEvent.dragStart(element, { dataTransfer });
  return dataTransfer.setData.mock.calls[0][1];
}
