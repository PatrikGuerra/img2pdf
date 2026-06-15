import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { IMAGE_FITS, PAGE_SIZES } from '../constants/pdfOptions';
import { getAspectRatio, getFixedPageSize } from '../pdf/pageLayout';
import type { ImageItem, PdfOptions } from '../types/pdf';

interface ImageGridProps {
  images: ImageItem[];
  options: PdfOptions;
  onClearSelection: () => void;
  onSelectImage: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onMoveImage: (id: string, offset: number) => void;
  onRotateImage: (id: string) => void;
  onDropImage: (droppedId: string, targetId: string) => void;
}

interface ImagePageProps {
  image: ImageItem;
  index: number;
  options: PdfOptions;
  onSelectImage: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onMoveImage: (id: string, offset: number) => void;
  onRotateImage: (id: string) => void;
  onDropImage: (droppedId: string, targetId: string) => void;
  pageCount: number;
}

export default function ImageGrid({
  images,
  options,
  onClearSelection,
  onSelectImage,
  onDeleteImage,
  onMoveImage,
  onRotateImage,
  onDropImage,
}: ImageGridProps) {
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
            onDeleteImage={onDeleteImage}
            onMoveImage={onMoveImage}
            onRotateImage={onRotateImage}
            onDropImage={onDropImage}
            pageCount={images.length}
          />
        ))}
      </div>
      <div className="workspace-spacer" />
    </div>
  );
}

function ImagePage({
  image,
  index,
  options,
  onSelectImage,
  onDeleteImage,
  onMoveImage,
  onRotateImage,
  onDropImage,
  pageCount,
}: ImagePageProps) {
  const pageWrapper = getPageWrapperStyle(options);
  const pageStyle = getPageStyle(options, image.previewUrl);

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
        className="page-preview"
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
        <div className="page-controls">
          <PageControlButton
            icon="fa-trash"
            label={`Remove page ${index + 1}`}
            onClick={() => onDeleteImage(image.id)}
          />
          <PageControlButton
            disabled={index === 0}
            icon="fa-arrow-left"
            label={`Move page ${index + 1} left`}
            onClick={() => onMoveImage(image.id, -1)}
          />
          <PageControlButton
            disabled={index === pageCount - 1}
            icon="fa-arrow-right"
            label={`Move page ${index + 1} right`}
            onClick={() => onMoveImage(image.id, 1)}
          />
          <PageControlButton
            icon="fa-rotate-right"
            label={`Rotate page ${index + 1} clockwise`}
            onClick={() => onRotateImage(image.id)}
          />
        </div>
        <div className="page-image" style={{
          ...pageStyle,
          transform: `rotate(${image.rotationDegrees}deg)`,
        }} />
      </div>
    </div>
  );
}

interface PageControlButtonProps {
  disabled?: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}

function PageControlButton({ disabled = false, icon, label, onClick }: PageControlButtonProps) {
  return (
    <button
      aria-label={label}
      className="page-control-button"
      disabled={disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <i className={`fa ${icon}`} aria-hidden="true" />
    </button>
  );
}

function getPageWrapperStyle(options: PdfOptions): CSSProperties {
  const style: CSSProperties = {
    height: '192px',
    width: '192px',
    border: 'none',
    display: 'flex',
    background: 'white',
    position: 'relative',
  };

  if (options.pageSize !== PAGE_SIZES.IMAGE) {
    style.width = `${Math.ceil(192 * getAspectRatio(options))}px`;
    style.boxShadow = '5px 5px 5px rgb(200,200,200)';
  }

  return style;
}

function getPageStyle(options: PdfOptions, previewUrl: string): CSSProperties {
  const previewMargin = getPreviewMarginPixels(options);
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

function getPreviewMarginPixels(options: PdfOptions): number {
  if (options.pageSize === PAGE_SIZES.IMAGE) {
    return 0;
  }

  const pageSize = getFixedPageSize(options);
  if (!pageSize) {
    return 0;
  }

  return Math.round(Math.max(0, Number(options.margin) || 0) * 192 / pageSize[1]);
}
