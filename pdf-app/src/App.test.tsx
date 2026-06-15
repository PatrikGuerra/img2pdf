import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import { IMAGE_FITS, PAGE_MARGINS, PAGE_ORIENTATIONS, PAGE_SIZES } from './constants/pdfOptions';
import { downloadPdf } from './download/downloadPdf';
import { createPdfFromImages } from './pdf/createPdfFromImages';
import { mmToPdfPoints } from './pdf/pageLayout';

vi.mock('./pdf/createPdfFromImages', () => ({
  createPdfFromImages: vi.fn(),
}));

vi.mock('./download/downloadPdf', () => ({
  downloadPdf: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createPdfFromImages).mockResolvedValue(new Uint8Array([1, 2, 3]));
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
  expect(screen.getByText('Selected: Page 1')).toBeInTheDocument();
  expect(screen.getByText('1 image · estimated 5 B')).toBeInTheDocument();
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
  expect(getOptionButton('Portrait')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '0 mm' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('spinbutton', { name: /custom margin/i })).toHaveValue(0);
  expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: "Don't Compress" })).toHaveAttribute('aria-pressed', 'true');
});

test('shows an alert for ignored files and keeps only supported images', async () => {
  const image = new File(['image'], 'photo.png', { type: 'image/png' });
  const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
  const pdf = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });

  render(<App />);

  fireEvent.change(screen.getByTestId('file-input'), {
    target: { files: [image, text, pdf] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent('2 files were not PNG/JPEG.');
  expect(await screen.findByRole('button', { name: /select page 1/i })).toBeInTheDocument();
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

test('shows page numbers and automatic page orientations after upload', async () => {
  const user = userEvent.setup();
  const portraitFile = new File(['portrait'], 'portrait.png', { type: 'image/png' });
  const landscapeFile = new File(['landscape'], 'landscape.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), [portraitFile, landscapeFile]);

  expect(await screen.findByText('Page 1')).toBeInTheDocument();
  expect(screen.getByText('Page 2')).toBeInTheDocument();
  expect(getToolbarButton('Portrait')).toHaveAttribute('aria-pressed', 'true');
  await selectPage(user, 2);
  expect(getToolbarButton('Landscape')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('Mixed page orientations')).not.toBeInTheDocument();
});

test('revokes the object URL when a page is deleted', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
  const previewUrl = vi.mocked(URL.createObjectURL).mock.results[0].value;

  await user.click(screen.getByRole('button', { name: 'Remove' }));

  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Remove page?' });
  expect(dialog).toHaveTextContent('Page 1 will be removed from the PDF.');
  await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

  expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrl);
  expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
});

test('canceling page removal keeps the page and its object URL', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile]);
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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile]);

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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile, thirdFile]);
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

  await user.upload(screen.getByTestId('file-input'), file);
  await user.clear(screen.getByLabelText('PDF name'));
  await user.type(screen.getByLabelText('PDF name'), 'scan bundle');
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

test('custom page margin accepts decimal millimeter values', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
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

test('flip controls update the page passed to PDF generation', async () => {
  const user = userEvent.setup();
  const file = new File(['image'], 'photo.png', { type: 'image/png' });

  render(<App />);

  await user.upload(screen.getByTestId('file-input'), file);
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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile]);
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

  await user.upload(screen.getByTestId('file-input'), file);
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

  await user.upload(screen.getByTestId('file-input'), [portraitFile, landscapeFile]);
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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile, thirdFile]);
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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile]);

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

  await user.upload(screen.getByTestId('file-input'), [firstFile, secondFile, thirdFile]);
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

  await user.upload(screen.getByTestId('file-input'), file);

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

  await user.upload(screen.getByTestId('file-input'), file);
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

  await user.upload(screen.getByTestId('file-input'), file);
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
