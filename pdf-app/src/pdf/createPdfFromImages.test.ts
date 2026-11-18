import { beforeEach, describe, expect, test, vi } from 'vitest';
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
import type { ImageItem, PdfOptions, PdfPageSize, RotationDegrees } from '../types/pdf';
import { createPdfFromImages, fetchImageData } from './createPdfFromImages';

interface MockPage {
  size: PdfPageSize;
  drawImage: ReturnType<typeof vi.fn>;
  drawRectangle: ReturnType<typeof vi.fn>;
  drawText: ReturnType<typeof vi.fn>;
  getHeight: ReturnType<typeof vi.fn>;
  getWidth: ReturnType<typeof vi.fn>;
  setRotation: ReturnType<typeof vi.fn>;
}

const pdfMocks = vi.hoisted(() => {
  const pages: MockPage[] = [];
  const pdfDoc = {
    addPage: vi.fn((size: PdfPageSize) => {
      const page: MockPage = {
        size,
        drawImage: vi.fn(),
        drawRectangle: vi.fn(),
        drawText: vi.fn(),
        getHeight: vi.fn(() => size[1]),
        getWidth: vi.fn(() => size[0]),
        setRotation: vi.fn(),
      };
      pages.push(page);
      return page;
    }),
    embedFont: vi.fn(async () => ({
      widthOfTextAtSize: vi.fn((text: string, size: number) => text.length * size / 2),
    })),
    embedJpg: vi.fn(async () => ({ height: 200, width: 100 })),
    embedPng: vi.fn(async () => ({ height: 100, width: 200 })),
    save: vi.fn(async () => new Uint8Array([9, 8, 7])),
  };

  return {
    createPdfDoc: vi.fn(async () => pdfDoc),
    degrees: vi.fn((value: number) => ({ degrees: value })),
    pages,
    pdfDoc,
  };
});

const exifMock = vi.hoisted(() => ({
  readFromBinaryFile: vi.fn(() => ({})),
}));

const imageMock = vi.hoisted(() => ({
  canvasToBlob: vi.fn(async () => ({
    arrayBuffer: vi.fn(async () => new ArrayBuffer(3)),
  })),
  loadImage: vi.fn(async () => ({ height: 240, width: 320 })),
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: pdfMocks.createPdfDoc,
  },
  PageSizes: {
    A4: [595.28, 841.89],
    Letter: [612, 792],
  },
  degrees: pdfMocks.degrees,
  rgb: vi.fn((red: number, green: number, blue: number) => ({ blue, green, red })),
  StandardFonts: {
    Helvetica: 'Helvetica',
  },
}));

vi.mock('exif-js', () => ({
  default: exifMock,
}));

vi.mock('../image/imageFiles', () => imageMock);

describe('createPdfFromImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdfMocks.pages.length = 0;
    mockFetchMime('image/png');
  });

  test('calls progress once per processed image and saves the PDF', async () => {
    const onProgress = vi.fn();
    const images = [makeImageItem('one.png', 'image/png'), makeImageItem('two.png', 'image/png')];

    const bytes = await createPdfFromImages(images, makeOptions(), onProgress);

    expect(bytes).toEqual(new Uint8Array([9, 8, 7]));
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { current: 1, total: 2, image: images[0] });
    expect(onProgress).toHaveBeenNthCalledWith(2, { current: 2, total: 2, image: images[1] });
    expect(pdfMocks.pdfDoc.save).toHaveBeenCalledTimes(1);
  });

  test('uses contain placement by default', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions());

    expect(pdfMocks.pages[0].drawImage).toHaveBeenCalledWith(
      { height: 100, width: 200 },
      expect.objectContaining({
        height: expect.closeTo(297.64, 2),
        width: expect.closeTo(595.28, 2),
        x: expect.closeTo(0, 2),
        y: expect.closeTo(272.13, 2),
      }),
    );
  });

  test('uses cover placement when requested', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      imageFit: IMAGE_FITS.COVER,
    }));

    const placement = pdfMocks.pages[0].drawImage.mock.calls[0][1] as { width: number; height: number; x: number; y: number };

    expect(placement.width).toBeGreaterThan(595.28);
    expect(placement.height).toBeCloseTo(841.89, 2);
    expect(placement.x).toBeLessThan(0);
    expect(placement.y).toBeCloseTo(0, 2);
  });

  test('does not draw page numbers by default', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions());

    expect(pdfMocks.pdfDoc.embedFont).not.toHaveBeenCalled();
    expect(pdfMocks.pages[0].drawText).not.toHaveBeenCalled();
  });

  test('does not draw a page background by default', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions());

    expect(pdfMocks.pages[0].drawRectangle).not.toHaveBeenCalled();
  });

  test('draws a white page background before the image when requested', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageBackgroundColor: '#ffffff',
    }));

    expect(pdfMocks.pages[0].drawRectangle).toHaveBeenCalledWith({
      color: { blue: 1, green: 1, red: 1 },
      height: 841.89,
      width: 595.28,
      x: 0,
      y: 0,
    });
    expect(pdfMocks.pages[0].drawRectangle.mock.invocationCallOrder[0])
      .toBeLessThan(pdfMocks.pages[0].drawImage.mock.invocationCallOrder[0]);
  });

  test('normalizes custom page background color to PDF rgb values', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageBackgroundColor: '#ff0033',
    }));

    expect(pdfMocks.pages[0].drawRectangle).toHaveBeenCalledWith(expect.objectContaining({
      color: { blue: 0.2, green: 0, red: 1 },
    }));
  });

  test('ignores invalid page background color values', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageBackgroundColor: 'purple',
    }));

    expect(pdfMocks.pages[0].drawRectangle).not.toHaveBeenCalled();
    expect(pdfMocks.pages[0].drawImage).toHaveBeenCalled();
  });

  test('draws enabled page numbers on every page', async () => {
    await createPdfFromImages([
      makeImageItem('one.png', 'image/png'),
      makeImageItem('two.png', 'image/png'),
      makeImageItem('three.png', 'image/png'),
    ], makeOptions({
      pageNumbering: {
        ...DEFAULT_PDF_OPTIONS.pageNumbering,
        enabled: true,
      },
    }));

    expect(pdfMocks.pdfDoc.embedFont).toHaveBeenCalledWith('Helvetica');
    expect(pdfMocks.pages[0].drawText).toHaveBeenCalledWith('1', expect.objectContaining({
      size: 12,
      x: expect.closeTo(294.64, 2),
      y: 12,
    }));
    expect(pdfMocks.pages[1].drawText).toHaveBeenCalledWith('2', expect.any(Object));
    expect(pdfMocks.pages[2].drawText).toHaveBeenCalledWith('3', expect.any(Object));
  });

  test('draws page numbers at the requested top right position', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageNumbering: {
        ...DEFAULT_PDF_OPTIONS.pageNumbering,
        enabled: true,
        horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT,
        placement: PAGE_NUMBER_PLACEMENTS.OVERLAY,
        verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.TOP,
      },
    }));

    expect(pdfMocks.pages[0].drawText).toHaveBeenCalledWith('1', expect.objectContaining({
      x: expect.closeTo(577.28, 2),
      y: expect.closeTo(817.89, 2),
    }));
  });

  test('reserves footer space before placing the image when page numbering uses header/footer placement', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageNumbering: {
        ...DEFAULT_PDF_OPTIONS.pageNumbering,
        enabled: true,
        placement: PAGE_NUMBER_PLACEMENTS.RESERVED,
        verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM,
      },
    }));

    expect(pdfMocks.pages[0].drawImage).toHaveBeenCalledWith(
      { height: 100, width: 200 },
      expect.objectContaining({
        height: expect.closeTo(297.64, 2),
        width: expect.closeTo(595.28, 2),
        x: expect.closeTo(0, 2),
        y: expect.closeTo(284.13, 2),
      }),
    );
  });

  test('does not change image placement when page numbering uses overlay placement', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageNumbering: {
        ...DEFAULT_PDF_OPTIONS.pageNumbering,
        enabled: true,
        placement: PAGE_NUMBER_PLACEMENTS.OVERLAY,
      },
    }));

    expect(pdfMocks.pages[0].drawImage).toHaveBeenCalledWith(
      { height: 100, width: 200 },
      expect.objectContaining({
        y: expect.closeTo(272.13, 2),
      }),
    );
  });

  test('ignores margin and fit for same-as-image pages', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageSize: PAGE_SIZES.IMAGE,
      orientation: PAGE_ORIENTATIONS.LANDSCAPE,
      margin: PAGE_MARGINS.MM_20,
      imageFit: IMAGE_FITS.COVER,
    }));

    expect(pdfMocks.pdfDoc.addPage).toHaveBeenCalledWith([200, 100]);
    expect(pdfMocks.pages[0].drawImage).toHaveBeenCalledWith({ height: 100, width: 200 }, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  test('supports reserved page numbering for same-as-image pages without increasing page size', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      pageNumbering: {
        ...DEFAULT_PDF_OPTIONS.pageNumbering,
        enabled: true,
        placement: PAGE_NUMBER_PLACEMENTS.RESERVED,
        verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM,
      },
      pageSize: PAGE_SIZES.IMAGE,
    }));

    expect(pdfMocks.pdfDoc.addPage).toHaveBeenCalledWith([200, 100]);
    expect(pdfMocks.pages[0].drawImage).toHaveBeenCalledWith({ height: 100, width: 200 }, {
      height: 76,
      scaleFactor: 0.76,
      width: 152,
      x: 24,
      y: 24,
    });
    expect(pdfMocks.pages[0].drawText).toHaveBeenCalledWith('1', expect.any(Object));
  });

  test('uses each image page orientation for fixed page sizes', async () => {
    await createPdfFromImages([
      makeImageItem('portrait.png', 'image/png', 0, { pageOrientation: PAGE_ORIENTATIONS.PORTRAIT }),
      makeImageItem('landscape.png', 'image/png', 0, { pageOrientation: PAGE_ORIENTATIONS.LANDSCAPE }),
    ], makeOptions());

    expect(pdfMocks.pdfDoc.addPage).toHaveBeenNthCalledWith(1, [595.28, 841.89]);
    expect(pdfMocks.pdfDoc.addPage).toHaveBeenNthCalledWith(2, [841.89, 595.28]);
  });

  test('preserves PNG and JPEG embedding when compression is disabled', async () => {
    await createPdfFromImages([makeImageItem('image.png', 'image/png')]);

    expect(imageMock.loadImage).not.toHaveBeenCalled();
    expect(pdfMocks.pdfDoc.embedPng).toHaveBeenCalledTimes(1);
    expect(pdfMocks.pdfDoc.embedJpg).not.toHaveBeenCalled();

    vi.clearAllMocks();
    pdfMocks.pages.length = 0;
    mockFetchMime('image/jpeg');

    await createPdfFromImages([makeImageItem('image.jpg', 'image/jpeg')]);

    expect(imageMock.loadImage).not.toHaveBeenCalled();
    expect(pdfMocks.pdfDoc.embedJpg).toHaveBeenCalledTimes(1);
    expect(pdfMocks.pdfDoc.embedPng).not.toHaveBeenCalled();
  });

  test('embeds locally converted HEIC files as JPEG images', async () => {
    const sourceFile = new File(['heic'], 'photo.heic', { type: 'image/heic' });
    mockFetchMime('image/jpeg');

    await createPdfFromImages([
      makeImageItem('photo.jpg', 'image/jpeg', 0, {
        convertedFrom: 'HEIC',
        sourceFile,
      }),
    ]);

    expect(pdfMocks.pdfDoc.embedJpg).toHaveBeenCalledTimes(1);
    expect(pdfMocks.pdfDoc.embedPng).not.toHaveBeenCalled();
  });

  test('uses canvas when an image has manual rotation', async () => {
    const { canvas, drawImage, rotate, scale, translate, restore } = mockCanvasElement();

    await createPdfFromImages([makeImageItem('image.png', 'image/png', 90)], makeOptions());

    expect(imageMock.loadImage).toHaveBeenCalledWith('blob:image.png');
    expect(canvas.width).toBe(240);
    expect(canvas.height).toBe(320);
    expect(translate).toHaveBeenCalledWith(120, 160);
    expect(rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(scale).toHaveBeenCalledWith(1, 1);
    expect(drawImage).toHaveBeenCalledWith({ height: 240, width: 320 }, -160, -120, 320, 240);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, undefined, 'image/png');
    expect(pdfMocks.pdfDoc.embedPng).toHaveBeenCalledTimes(1);
    expect(exifMock.readFromBinaryFile).not.toHaveBeenCalled();

    restore();
  });

  test('uses canvas when an image is flipped horizontally or vertically', async () => {
    const horizontal = mockCanvasElement();

    await createPdfFromImages([makeImageItem('image.png', 'image/png', 0, {
      flipHorizontal: true,
    })], makeOptions());

    expect(horizontal.scale).toHaveBeenCalledWith(-1, 1);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(horizontal.canvas, undefined, 'image/png');
    expect(exifMock.readFromBinaryFile).not.toHaveBeenCalled();
    horizontal.restore();

    vi.clearAllMocks();
    pdfMocks.pages.length = 0;
    const vertical = mockCanvasElement();

    await createPdfFromImages([makeImageItem('image.png', 'image/png', 0, {
      flipVertical: true,
    })], makeOptions());

    expect(vertical.scale).toHaveBeenCalledWith(1, -1);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(vertical.canvas, undefined, 'image/png');
    vertical.restore();
  });

  test('uses JPEG compression quality from percentage options', async () => {
    const { canvas, restore } = mockCanvasElement();

    await createPdfFromImages([makeImageItem('image.png', 'image/png')], makeOptions({
      compressImages: true,
      imageQuality: 80,
    }));

    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, 0.8);
    expect(pdfMocks.pdfDoc.embedJpg).toHaveBeenCalledTimes(1);

    restore();
  });

  test('uses JPEG quality when compression and manual rotation are enabled', async () => {
    const { canvas, restore } = mockCanvasElement();

    await createPdfFromImages([makeImageItem('image.png', 'image/png', 180)], makeOptions({
      compressImages: true,
      imageQuality: 70,
    }));

    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, 0.7);
    expect(pdfMocks.pdfDoc.embedJpg).toHaveBeenCalledTimes(1);
    expect(pdfMocks.pdfDoc.embedPng).not.toHaveBeenCalled();

    restore();
  });

  test('uses JPEG quality when compression and flip are enabled', async () => {
    const { canvas, scale, restore } = mockCanvasElement();

    await createPdfFromImages([makeImageItem('image.png', 'image/png', 0, {
      flipHorizontal: true,
    })], makeOptions({
      compressImages: true,
      imageQuality: 60,
    }));

    expect(scale).toHaveBeenCalledWith(-1, 1);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, 0.6);
    expect(pdfMocks.pdfDoc.embedJpg).toHaveBeenCalledTimes(1);
    expect(pdfMocks.pdfDoc.embedPng).not.toHaveBeenCalled();

    restore();
  });

  test('throws a clear error for unsupported MIME types', async () => {
    mockFetchMime('image/gif');

    await expect(createPdfFromImages([
      makeImageItem('image.gif', 'image/gif'),
    ])).rejects.toThrow('Unsupported image type: image/gif');
  });

  test.each([
    [3, 180],
    [6, 90],
    [8, 270],
  ])('applies EXIF orientation %i as a %i degree page rotation', async (orientation, expectedDegrees) => {
    mockFetchMime('image/jpeg');
    exifMock.readFromBinaryFile.mockReturnValue({ Orientation: orientation });

    await createPdfFromImages([makeImageItem('image.jpg', 'image/jpeg')], makeOptions());

    expect(pdfMocks.degrees).toHaveBeenCalledWith(expectedDegrees);
    expect(pdfMocks.pages[0].setRotation).toHaveBeenCalledWith({ degrees: expectedDegrees });
  });

  test('falls back to normal orientation when EXIF parsing fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchMime('image/jpeg');
    exifMock.readFromBinaryFile.mockImplementation(() => {
      throw new Error('bad exif');
    });

    await createPdfFromImages([makeImageItem('image.jpg', 'image/jpeg')]);

    expect(pdfMocks.pages[0].setRotation).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe('fetchImageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  test('uses fetch directly when compression is disabled', async () => {
    mockFetchMime('image/png');

    const imageData = await fetchImageData('blob:image');

    expect(globalThis.fetch).toHaveBeenCalledWith('blob:image');
    expect(imageData.mime).toBe('image/png');
    expect(imageData.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(imageMock.loadImage).not.toHaveBeenCalled();
  });

  test('uses canvas and JPEG quality when compression is enabled', async () => {
    const { canvas, drawImage, restore } = mockCanvasElement();

    const imageData = await fetchImageData('blob:image', 0.8);

    expect(imageMock.loadImage).toHaveBeenCalledWith('blob:image');
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(240);
    expect(drawImage).toHaveBeenCalledWith({ height: 240, width: 320 }, 0, 0, 320, 240);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, 0.8);
    expect(imageData.mime).toBe('image/jpeg');
    expect(globalThis.fetch).not.toHaveBeenCalled();

    restore();
  });

  test('converts WebP to PNG and resizes without enlarging', async () => {
    const { canvas, drawImage, restore } = mockCanvasElement();
    const result = await fetchImageData('blob:image', undefined, {}, 'image/webp', 160);
    expect(result.mime).toBe('image/png');
    expect([canvas.width, canvas.height]).toEqual([160, 120]);
    expect(drawImage).toHaveBeenCalledWith({ height: 240, width: 320 }, 0, 0, 160, 120);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, undefined, 'image/png');
    await fetchImageData('blob:image', undefined, {}, 'image/webp', 1000);
    expect([canvas.width, canvas.height]).toEqual([320, 240]);
    restore();
  });

  test('resizes rotated images while preserving the rotation', async () => {
    const { canvas, scale, rotate, restore } = mockCanvasElement();
    await fetchImageData('blob:image', undefined, { rotationDegrees: 90 }, 'image/png', 160);
    expect([canvas.width, canvas.height]).toEqual([120, 160]);
    expect(scale).toHaveBeenCalledWith(0.5, 0.5);
    expect(rotate).toHaveBeenCalledWith(Math.PI / 2);
    restore();
  });

  test.each([
    [90, 240, 320, [120, 160], Math.PI / 2],
    [180, 320, 240, [160, 120], Math.PI],
    [270, 240, 320, [120, 160], 3 * Math.PI / 2],
  ])('rotates image data by %i degrees before embedding', async (
    rotationDegrees,
    expectedWidth,
    expectedHeight,
    expectedTranslate,
    expectedRotation,
  ) => {
    const { canvas, rotate, translate, restore } = mockCanvasElement();

    const imageData = await fetchImageData(
      'blob:image',
      undefined,
      { rotationDegrees: rotationDegrees as RotationDegrees },
      'image/jpeg',
    );

    expect(canvas.width).toBe(expectedWidth);
    expect(canvas.height).toBe(expectedHeight);
    expect(translate).toHaveBeenCalledWith(...expectedTranslate);
    expect(rotate).toHaveBeenCalledWith(expectedRotation);
    expect(imageMock.canvasToBlob).toHaveBeenCalledWith(canvas, undefined);
    expect(imageData.mime).toBe('image/jpeg');
    expect(globalThis.fetch).not.toHaveBeenCalled();

    restore();
  });
});

function makeOptions(options: Partial<PdfOptions> = {}): PdfOptions {
  return {
    ...DEFAULT_PDF_OPTIONS,
    ...options,
  };
}

function makeImageItem(
  name: string,
  type: string,
  rotationDegrees: RotationDegrees = 0,
  overrides: Partial<ImageItem> = {},
): ImageItem {
  return {
    id: name,
    file: new File([name], name, { type }),
    flipHorizontal: false,
    flipVertical: false,
    pageOrientation: PAGE_ORIENTATIONS.PORTRAIT,
    previewUrl: `blob:${name}`,
    rotationDegrees,
    selected: false,
    ...overrides,
  };
}

function mockFetchMime(mime: string): void {
  globalThis.fetch = vi.fn(async () => createFetchResponse(mime)) as unknown as typeof fetch;
}

function createFetchResponse(mime: string): Response {
  return {
    arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
    headers: {
      get: vi.fn(() => mime),
    },
  } as unknown as Response;
}

function mockCanvasElement(): {
  canvas: HTMLCanvasElement;
  drawImage: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  restore: () => void;
  translate: ReturnType<typeof vi.fn>;
} {
  const drawImage = vi.fn();
  const rotate = vi.fn();
  const scale = vi.fn();
  const translate = vi.fn();
  const canvas = {
    getContext: vi.fn(() => ({ drawImage, rotate, scale, translate })),
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement;
  const createElement = vi.spyOn(document, 'createElement').mockReturnValue(canvas);

  return {
    canvas,
    drawImage,
    rotate,
    scale,
    restore: () => createElement.mockRestore(),
    translate,
  };
}
