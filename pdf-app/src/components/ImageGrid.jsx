import { IMAGE_FITS, PAGE_SIZES } from '../constants/pdfOptions';
import { getAspectRatio, getFixedPageSize } from '../pdf/pageLayout';

export default function ImageGrid({
  images,
  options,
  onClearSelection,
  onSelectImage,
  onDeleteImage,
  onDropImage,
}) {
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
            onDropImage={onDropImage}
          />
        ))}
      </div>
      <div className="workspace-spacer" />
    </div>
  );
}

function ImagePage({ image, index, options, onSelectImage, onDeleteImage, onDropImage }) {
  const pageWrapper = getPageWrapperStyle(options);
  const pageStyle = getPageStyle(options, image.previewUrl);

  return (
    <div
      className="image-page-shell"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', image.id);
      }}
      onDrop={(event) => {
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
        onClick={(event) => {
          event.stopPropagation();
          onSelectImage(image.id);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectImage(image.id);
          }
        }}
        role="button"
        style={pageWrapper}
        tabIndex={0}
      >
        {image.selected ? (
          <button
            aria-label={`Delete page ${index + 1}`}
            className="delete-page-button"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteImage(image.id);
            }}
            type="button"
          >
            <i className="fa fa-trash" aria-hidden="true" />
          </button>
        ) : null}
        <div className="page-image" style={pageStyle} />
      </div>
    </div>
  );
}

function getPageWrapperStyle(options) {
  const style = {
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

function getPageStyle(options, previewUrl) {
  const previewMargin = getPreviewMarginPixels(options);
  const style = {
    margin: `${previewMargin}px`,
    flex: '1',
    backgroundImage: `url("${previewUrl}")`,
    backgroundSize: options.pageSize !== PAGE_SIZES.IMAGE && options.imageFit === IMAGE_FITS.COVER ? 'cover' : 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };

  return style;
}

function getPreviewMarginPixels(options) {
  if (options.pageSize === PAGE_SIZES.IMAGE) {
    return 0;
  }

  const pageSize = getFixedPageSize(options);
  if (!pageSize) {
    return 0;
  }

  return Math.round(Math.max(0, Number(options.margin) || 0) * 192 / pageSize[1]);
}
