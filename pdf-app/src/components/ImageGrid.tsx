import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { IMAGE_FITS, PAGE_ORIENTATION_LABELS, PAGE_ORIENTATIONS, PAGE_SIZES } from '../constants/pdfOptions';
import { getAspectRatio, getFixedPageSize } from '../pdf/pageLayout';
import type { FlipAxis, ImageItem, PageOrientation, PdfOptions } from '../types/pdf';

interface ImageGridProps {
  images: ImageItem[];
  options: PdfOptions;
  onChangeImageOrientation: (id: string, orientation: PageOrientation) => void;
  onClearSelection: () => void;
  onSelectImage: (id: string) => void;
  onRequestDeleteImage: (id: string, pageNumber: number) => void;
  onFlipImage: (id: string, axis: FlipAxis) => void;
  onMoveImage: (id: string, offset: number) => void;
  onRotateImage: (id: string) => void;
  onDropImage: (droppedId: string, targetId: string) => void;
}

interface ImagePageProps {
  image: ImageItem;
  index: number;
  options: PdfOptions;
  onSelectImage: (id: string) => void;
  onDropImage: (droppedId: string, targetId: string) => void;
}

interface SelectedPageToolbarProps {
  image: ImageItem;
  index: number;
  pageCount: number;
  onChangeImageOrientation: (id: string, orientation: PageOrientation) => void;
  onFlipImage: (id: string, axis: FlipAxis) => void;
  onMoveImage: (id: string, offset: number) => void;
  onRequestDeleteImage: (id: string, pageNumber: number) => void;
  onRotateImage: (id: string) => void;
}

export default function ImageGrid({
  images,
  options,
  onChangeImageOrientation,
  onClearSelection,
  onSelectImage,
  onRequestDeleteImage,
  onFlipImage,
  onMoveImage,
  onRotateImage,
  onDropImage,
}: ImageGridProps) {
  const selectedIndex = images.findIndex((image) => image.selected);
  const selectedImage = selectedIndex >= 0 ? images[selectedIndex] : undefined;

  return (
    <div className="image-workspace" onClick={onClearSelection}>
      <div className="image-grid">
        {images.map((image, index) => (
          <ImagePage
            image={image}
            index={index}
            key={image.id}
            options={options}
            onSelectImage={onSelectImage}
            onDropImage={onDropImage}
          />
        ))}
      </div>
      {selectedImage ? (
        <SelectedPageToolbar
          image={selectedImage}
          index={selectedIndex}
          pageCount={images.length}
          onChangeImageOrientation={onChangeImageOrientation}
          onFlipImage={onFlipImage}
          onMoveImage={onMoveImage}
          onRequestDeleteImage={onRequestDeleteImage}
          onRotateImage={onRotateImage}
        />
      ) : null}
    </div>
  );
}

function ImagePage({
  image,
  index,
  options,
  onSelectImage,
  onDropImage,
}: ImagePageProps) {
  const pageWrapper = getPageWrapperStyle(options, image.pageOrientation);
  const pageMetaStyle = getPageMetaStyle(options, image.pageOrientation);
  const pageStyle = getPageStyle(options, image.previewUrl, image.pageOrientation);

  return (
    <div
      className="image-page-shell"
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', image.id);
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onDropImage(event.dataTransfer.getData('text/plain'), image.id);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={(event) => event.preventDefault()}
    >
      <div
        aria-label={`Select page ${index + 1}`}
        aria-pressed={image.selected}
        className={`page-preview${image.selected ? ' page-preview--selected' : ''}`}
        onClick={(event: MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
          onSelectImage(image.id);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectImage(image.id);
          }
        }}
        role="button"
        style={pageWrapper}
        tabIndex={0}
      >
        <div className="page-image" style={{
          ...pageStyle,
          transform: getImageTransform(image),
        }} />
      </div>
      <div className="page-meta" onClick={(event) => event.stopPropagation()} style={pageMetaStyle}>
        <div className="page-number">Page {index + 1}</div>
      </div>
    </div>
  );
}

function SelectedPageToolbar({
  image,
  index,
  pageCount,
  onChangeImageOrientation,
  onFlipImage,
  onMoveImage,
  onRequestDeleteImage,
  onRotateImage,
}: SelectedPageToolbarProps) {
  return (
    <div className="selected-page-toolbar" onClick={(event) => event.stopPropagation()}>
      <div className="selected-page-toolbar-label">Selected: Page {index + 1}</div>
      <div className="selected-page-actions">
        <PageControlButton
          icon="fa-file-o"
          label={PAGE_ORIENTATION_LABELS[PAGE_ORIENTATIONS.PORTRAIT]}
          onClick={() => onChangeImageOrientation(image.id, PAGE_ORIENTATIONS.PORTRAIT)}
          pressed={image.pageOrientation === PAGE_ORIENTATIONS.PORTRAIT}
          tone="orientation"
        />
        <PageControlButton
          icon="fa-file-o"
          iconClassName="page-control-icon--landscape"
          label={PAGE_ORIENTATION_LABELS[PAGE_ORIENTATIONS.LANDSCAPE]}
          onClick={() => onChangeImageOrientation(image.id, PAGE_ORIENTATIONS.LANDSCAPE)}
          pressed={image.pageOrientation === PAGE_ORIENTATIONS.LANDSCAPE}
          tone="orientation"
        />
        <PageControlButton
          disabled={index === 0}
          icon="fa-arrow-left"
          label="Move left"
          onClick={() => onMoveImage(image.id, -1)}
          tone="move"
        />
        <PageControlButton
          disabled={index === pageCount - 1}
          icon="fa-arrow-right"
          label="Move right"
          onClick={() => onMoveImage(image.id, 1)}
          tone="move"
        />
        <PageControlButton
          icon="fa-rotate-right"
          label="Rotate"
          onClick={() => onRotateImage(image.id)}
          tone="rotate"
        />
        <PageControlButton
          icon="fa-arrows-h"
          label="Flip horizontal"
          onClick={() => onFlipImage(image.id, 'horizontal')}
          tone="flip"
        />
        <PageControlButton
          icon="fa-arrows-v"
          label="Flip vertical"
          onClick={() => onFlipImage(image.id, 'vertical')}
          tone="flip"
        />
        <PageControlButton
          icon="fa-trash"
          label="Remove"
          onClick={() => onRequestDeleteImage(image.id, index + 1)}
          tone="danger"
        />
      </div>
    </div>
  );
}

type PageActionTone = 'danger' | 'flip' | 'move' | 'orientation' | 'rotate';

interface PageControlButtonProps {
  disabled?: boolean;
  icon: string;
  iconClassName?: string;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  tone: PageActionTone;
}

function PageControlButton({
  disabled = false,
  icon,
  iconClassName,
  label,
  onClick,
  pressed,
  tone,
}: PageControlButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={`page-control-button page-control-button--${tone}${pressed ? ' page-control-button--active' : ''}`}
      disabled={disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      type="button"
    >
      <i className={`fa ${icon}${iconClassName ? ` ${iconClassName}` : ''}`} aria-hidden="true" />
    </button>
  );
}

function getPageWrapperStyle(options: PdfOptions, pageOrientation: PageOrientation): CSSProperties {
  const pageOptions = {
    ...options,
    orientation: pageOrientation,
  };
  const style: CSSProperties = {
    height: '192px',
    width: '192px',
    border: 'none',
    display: 'flex',
    background: 'white',
    position: 'relative',
  };

  if (options.pageSize !== PAGE_SIZES.IMAGE) {
    style.width = `${Math.ceil(192 * getAspectRatio(pageOptions))}px`;
    style.boxShadow = '5px 5px 5px rgb(200,200,200)';
  }

  return style;
}

function getPageMetaStyle(options: PdfOptions, pageOrientation: PageOrientation): CSSProperties {
  const pageOptions = {
    ...options,
    orientation: pageOrientation,
  };

  if (options.pageSize === PAGE_SIZES.IMAGE) {
    return { width: '192px' };
  }

  return {
    width: `${Math.ceil(192 * getAspectRatio(pageOptions))}px`,
  };
}

function getImageTransform(image: ImageItem): string {
  const scaleX = image.flipHorizontal ? -1 : 1;
  const scaleY = image.flipVertical ? -1 : 1;

  return `rotate(${image.rotationDegrees}deg) scale(${scaleX}, ${scaleY})`;
}

function getPageStyle(options: PdfOptions, previewUrl: string, pageOrientation: PageOrientation): CSSProperties {
  const previewMargin = getPreviewMarginPixels(options, pageOrientation);
  const style: CSSProperties = {
    margin: `${previewMargin}px`,
    flex: '1',
    backgroundImage: `url("${previewUrl}")`,
    backgroundSize: options.pageSize !== PAGE_SIZES.IMAGE && options.imageFit === IMAGE_FITS.COVER ? 'cover' : 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };

  return style;
}

function getPreviewMarginPixels(options: PdfOptions, pageOrientation: PageOrientation): number {
  if (options.pageSize === PAGE_SIZES.IMAGE) {
    return 0;
  }

  const pageSize = getFixedPageSize({
    ...options,
    orientation: pageOrientation,
  });
  if (!pageSize) {
    return 0;
  }

  return Math.round(Math.max(0, Number(options.margin) || 0) * 192 / pageSize[1]);
}
