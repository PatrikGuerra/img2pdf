import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  IMAGE_FIT_LABELS,
  IMAGE_FITS,
  PAGE_NUMBER_HORIZONTAL_ALIGNMENT_LABELS,
  PAGE_NUMBER_HORIZONTAL_ALIGNMENTS,
  PAGE_NUMBER_PLACEMENT_LABELS,
  PAGE_NUMBER_PLACEMENTS,
  PAGE_NUMBER_VERTICAL_POSITION_LABELS,
  PAGE_NUMBER_VERTICAL_POSITIONS,
  PAGE_MARGIN_LABELS,
  PAGE_MARGINS,
  PAGE_ORIENTATION_LABELS,
  PAGE_ORIENTATIONS,
  PAGE_SIZE_LABELS,
  PAGE_SIZES,
} from '../constants/pdfOptions';
import { mmToPdfPoints } from '../pdf/pageLayout';
import type { PageNumberingOptions, PageOrientation, PdfOptions } from '../types/pdf';

interface OptionsPanelProps {
  forceShowOptions: boolean;
  options: PdfOptions;
  onChangeOptions: (options: Partial<PdfOptions>) => void;
  onChangeOrientation: (orientation: PageOrientation) => void;
  onClose: () => void;
}

interface OptionSectionProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  title: string;
}

interface OptionGroupProps {
  children: ReactNode;
  title: string;
}

interface OptionButtonProps {
  active: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

export default function OptionsPanel({
  forceShowOptions,
  options,
  onChangeOptions,
  onChangeOrientation,
  onClose,
}: OptionsPanelProps) {
  const [marginInputFocused, setMarginInputFocused] = useState(false);
  const [marginInputValue, setMarginInputValue] = useState(() => formatMarginInputValue(options.margin));
  const fixedPageOptionsEnabled = options.pageSize !== PAGE_SIZES.IMAGE;

  useEffect(() => {
    if (!marginInputFocused) {
      setMarginInputValue(formatMarginInputValue(options.margin));
    }
  }, [marginInputFocused, options.margin]);

  const updateMargin = (margin: number) => {
    onChangeOptions({ margin });
    setMarginInputValue(formatMarginInputValue(margin));
  };

  const updatePageNumbering = (pageNumbering: Partial<PageNumberingOptions>) => {
    onChangeOptions({
      pageNumbering: {
        ...options.pageNumbering,
        ...pageNumbering,
      },
    });
  };

  const changeCustomMargin = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setMarginInputValue(value);

    if (value.trim() === '') {
      return;
    }

    const marginMillimeters = Number(value);
    if (!Number.isFinite(marginMillimeters)) {
      return;
    }

    onChangeOptions({ margin: mmToPdfPoints(Math.max(0, marginMillimeters)) });
  };

  const commitCustomMargin = () => {
    setMarginInputFocused(false);

    const marginMillimeters = Number(marginInputValue);
    if (marginInputValue.trim() === '' || !Number.isFinite(marginMillimeters)) {
      updateMargin(PAGE_MARGINS.NONE);
      return;
    }

    updateMargin(mmToPdfPoints(Math.max(0, marginMillimeters)));
  };

  return (
    <div className={`options options-panel${forceShowOptions ? ' options--visible' : ''}`} aria-label="PDF options">
      <div className="options-header options-panel-header">
        <span>Options</span>
        {forceShowOptions ? (
          <button aria-label="Close options" className="plain-button" onClick={onClose} type="button">
            X
          </button>
        ) : <span />}
      </div>

      <div className="options-panel-body">
        <OptionGroup title="Page setup">
          <OptionSection columns={2} title="Page orientation">
            <OptionButton
              active={options.orientation === PAGE_ORIENTATIONS.PORTRAIT}
              onClick={() => onChangeOrientation(PAGE_ORIENTATIONS.PORTRAIT)}
            >
              {PAGE_ORIENTATION_LABELS[PAGE_ORIENTATIONS.PORTRAIT]}
            </OptionButton>
            <OptionButton
              active={options.orientation === PAGE_ORIENTATIONS.LANDSCAPE}
              onClick={() => onChangeOrientation(PAGE_ORIENTATIONS.LANDSCAPE)}
            >
              {PAGE_ORIENTATION_LABELS[PAGE_ORIENTATIONS.LANDSCAPE]}
            </OptionButton>
          </OptionSection>

          <OptionSection columns={2} title="Page size">
            <OptionButton
              active={options.pageSize === PAGE_SIZES.A4}
              onClick={() => onChangeOptions({ pageSize: PAGE_SIZES.A4 })}
            >
              {PAGE_SIZE_LABELS[PAGE_SIZES.A4]}
            </OptionButton>
            <OptionButton
              active={options.pageSize === PAGE_SIZES.LETTER}
              onClick={() => onChangeOptions({ pageSize: PAGE_SIZES.LETTER })}
            >
              {PAGE_SIZE_LABELS[PAGE_SIZES.LETTER]}
            </OptionButton>
            <OptionButton
              active={options.pageSize === PAGE_SIZES.OFICIO}
              onClick={() => onChangeOptions({ pageSize: PAGE_SIZES.OFICIO })}
            >
              {PAGE_SIZE_LABELS[PAGE_SIZES.OFICIO]}
            </OptionButton>
            <OptionButton
              active={options.pageSize === PAGE_SIZES.IMAGE}
              onClick={() => onChangeOptions({ pageSize: PAGE_SIZES.IMAGE })}
            >
              {PAGE_SIZE_LABELS[PAGE_SIZES.IMAGE]}
            </OptionButton>
          </OptionSection>

          <OptionSection columns={4} disabled={!fixedPageOptionsEnabled} title="Page margin">
            <OptionButton
              active={isSameMargin(options.margin, PAGE_MARGINS.NONE)}
              disabled={!fixedPageOptionsEnabled}
              onClick={() => updateMargin(PAGE_MARGINS.NONE)}
            >
              {PAGE_MARGIN_LABELS[PAGE_MARGINS.NONE]}
            </OptionButton>
            <OptionButton
              active={isSameMargin(options.margin, PAGE_MARGINS.MM_5)}
              disabled={!fixedPageOptionsEnabled}
              onClick={() => updateMargin(PAGE_MARGINS.MM_5)}
            >
              {PAGE_MARGIN_LABELS[PAGE_MARGINS.MM_5]}
            </OptionButton>
            <OptionButton
              active={isSameMargin(options.margin, PAGE_MARGINS.MM_10)}
              disabled={!fixedPageOptionsEnabled}
              onClick={() => updateMargin(PAGE_MARGINS.MM_10)}
            >
              {PAGE_MARGIN_LABELS[PAGE_MARGINS.MM_10]}
            </OptionButton>
            <OptionButton
              active={isSameMargin(options.margin, PAGE_MARGINS.MM_20)}
              disabled={!fixedPageOptionsEnabled}
              onClick={() => updateMargin(PAGE_MARGINS.MM_20)}
            >
              {PAGE_MARGIN_LABELS[PAGE_MARGINS.MM_20]}
            </OptionButton>
            <div className={`custom-margin-field${fixedPageOptionsEnabled ? '' : ' custom-margin-field--disabled'}`}>
              <label htmlFor="custom-margin">Custom margin</label>
              <div className="custom-margin-input">
                <input
                  disabled={!fixedPageOptionsEnabled}
                  id="custom-margin"
                  inputMode="decimal"
                  min="0"
                  onBlur={commitCustomMargin}
                  onChange={changeCustomMargin}
                  onFocus={() => setMarginInputFocused(true)}
                  step="0.1"
                  type="number"
                  value={marginInputValue}
                />
                <span>mm</span>
              </div>
            </div>
          </OptionSection>

          <OptionSection columns={2} title="Page background">
            <OptionButton
              active={options.pageBackgroundColor === null}
              onClick={() => onChangeOptions({ pageBackgroundColor: null })}
            >
              No background
            </OptionButton>
            <OptionButton
              active={options.pageBackgroundColor !== null}
              onClick={() => onChangeOptions({ pageBackgroundColor: options.pageBackgroundColor ?? '#ffffff' })}
            >
              Use color
            </OptionButton>
            <div className={`page-background-field${options.pageBackgroundColor ? '' : ' page-background-field--disabled'}`}>
              <label htmlFor="page-background-color">Background color</label>
              <input
                aria-label="Background color"
                disabled={options.pageBackgroundColor === null}
                id="page-background-color"
                onChange={(event) => onChangeOptions({ pageBackgroundColor: event.currentTarget.value })}
                type="color"
                value={options.pageBackgroundColor ?? '#ffffff'}
              />
            </div>
          </OptionSection>
        </OptionGroup>

        <OptionGroup title="Image placement">
          <OptionSection columns={2} disabled={!fixedPageOptionsEnabled} title="Image fit">
            <OptionButton
              active={options.imageFit === IMAGE_FITS.CONTAIN}
              disabled={!fixedPageOptionsEnabled}
              onClick={() => onChangeOptions({ imageFit: IMAGE_FITS.CONTAIN })}
            >
              {IMAGE_FIT_LABELS[IMAGE_FITS.CONTAIN]}
            </OptionButton>
            <OptionButton
              active={options.imageFit === IMAGE_FITS.COVER}
              disabled={!fixedPageOptionsEnabled}
              onClick={() => onChangeOptions({ imageFit: IMAGE_FITS.COVER })}
            >
              {IMAGE_FIT_LABELS[IMAGE_FITS.COVER]}
            </OptionButton>
          </OptionSection>
        </OptionGroup>

        <OptionGroup title="Page numbers">
          <OptionSection columns={2} title="Visibility">
            <OptionButton
              active={options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ enabled: true })}
            >
              Show page numbers
            </OptionButton>
            <OptionButton
              active={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ enabled: false })}
            >
              Hide page numbers
            </OptionButton>
            <OptionRowLabel>Position</OptionRowLabel>
            <OptionButton
              active={options.pageNumbering.verticalPosition === PAGE_NUMBER_VERTICAL_POSITIONS.TOP}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.TOP })}
            >
              {PAGE_NUMBER_VERTICAL_POSITION_LABELS[PAGE_NUMBER_VERTICAL_POSITIONS.TOP]}
            </OptionButton>
            <OptionButton
              active={options.pageNumbering.verticalPosition === PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM })}
            >
              {PAGE_NUMBER_VERTICAL_POSITION_LABELS[PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM]}
            </OptionButton>
            <OptionRowLabel>Alignment</OptionRowLabel>
            <OptionButton
              active={options.pageNumbering.horizontalAlignment === PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.LEFT}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.LEFT })}
            >
              {PAGE_NUMBER_HORIZONTAL_ALIGNMENT_LABELS[PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.LEFT]}
            </OptionButton>
            <OptionButton
              active={options.pageNumbering.horizontalAlignment === PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.CENTER}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.CENTER })}
            >
              {PAGE_NUMBER_HORIZONTAL_ALIGNMENT_LABELS[PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.CENTER]}
            </OptionButton>
            <OptionButton
              active={options.pageNumbering.horizontalAlignment === PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT })}
            >
              {PAGE_NUMBER_HORIZONTAL_ALIGNMENT_LABELS[PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT]}
            </OptionButton>
            <OptionRowLabel>Placement</OptionRowLabel>
            <OptionButton
              active={options.pageNumbering.placement === PAGE_NUMBER_PLACEMENTS.RESERVED}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ placement: PAGE_NUMBER_PLACEMENTS.RESERVED })}
            >
              {PAGE_NUMBER_PLACEMENT_LABELS[PAGE_NUMBER_PLACEMENTS.RESERVED]}
            </OptionButton>
            <OptionButton
              active={options.pageNumbering.placement === PAGE_NUMBER_PLACEMENTS.OVERLAY}
              disabled={!options.pageNumbering.enabled}
              onClick={() => updatePageNumbering({ placement: PAGE_NUMBER_PLACEMENTS.OVERLAY })}
            >
              {PAGE_NUMBER_PLACEMENT_LABELS[PAGE_NUMBER_PLACEMENTS.OVERLAY]}
            </OptionButton>
          </OptionSection>
        </OptionGroup>

        <OptionGroup title="Output">
          <div className="resize-field">
            <label htmlFor="max-image-dimension">Maximum image dimension (pixels)</label>
            <input id="max-image-dimension" type="number" min="0" max="10000" step="1"
              value={options.maxImageDimension ?? 0}
              onChange={(event) => onChangeOptions({ maxImageDimension: Math.min(10000, Math.max(0, Math.floor(Number(event.currentTarget.value) || 0))) })} />
            <span>0 keeps the original size. Images are never enlarged.</span>
          </div>
          <OptionSection columns={2} title="Compression">
            <OptionButton
              active={options.compressImages}
              onClick={() => onChangeOptions({ compressImages: true })}
            >
              Compress Images
            </OptionButton>
            <OptionButton
              active={!options.compressImages}
              onClick={() => onChangeOptions({ compressImages: false })}
            >
              Don&apos;t Compress
            </OptionButton>
          </OptionSection>

          <div className={`image-quality-row${options.compressImages ? '' : ' image-quality-row--disabled'}`}>
            <div className="quality-label">Image quality</div>
            <div className="quality-controls">
              <button
                aria-label="Decrease image quality"
                disabled={!options.compressImages}
                onClick={() => onChangeOptions({ imageQuality: Math.max(10, options.imageQuality - 10) })}
                type="button"
              >
                -
              </button>
              <div className="quality-value">{options.imageQuality}%</div>
              <button
                aria-label="Increase image quality"
                disabled={!options.compressImages}
                onClick={() => onChangeOptions({ imageQuality: Math.min(100, options.imageQuality + 10) })}
                type="button"
              >
                +
              </button>
            </div>
          </div>
          <div className={`compression-note${options.compressImages ? '' : ' compression-note--disabled'}`}>
            Compression can reduce file size and image quality.
          </div>
        </OptionGroup>
      </div>
    </div>
  );
}

function OptionGroup({ children, title }: OptionGroupProps) {
  return (
    <section className="option-group">
      <h2 className="option-group-title">{title}</h2>
      <div className="option-group-body">{children}</div>
    </section>
  );
}

function OptionSection({ children, columns = 2, disabled = false, title }: OptionSectionProps) {
  return (
    <fieldset className={disabled ? 'option-section option-section--disabled' : 'option-section'}>
      <legend className="option-section-title">{title}</legend>
      <div className={`option-row option-row--${columns}`}>{children}</div>
    </fieldset>
  );
}

function OptionRowLabel({ children }: { children: ReactNode }) {
  return <div className="option-row-label">{children}</div>;
}

function OptionButton({ active, children, disabled = false, onClick }: OptionButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={`option-choice${active ? ' option-choice--active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function formatMarginInputValue(margin: number): string {
  const millimeters = Math.max(0, Number(margin) || 0) * 25.4 / 72;
  const roundedMillimeters = Math.round(millimeters * 100) / 100;

  if (Number.isInteger(roundedMillimeters)) {
    return String(roundedMillimeters);
  }

  return String(roundedMillimeters);
}

function isSameMargin(currentMargin: number, targetMargin: number): boolean {
  return Math.abs(currentMargin - targetMargin) < 0.01;
}
