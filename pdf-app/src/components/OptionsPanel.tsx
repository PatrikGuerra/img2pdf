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
  disabled?: boolean;
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
    <div className={`options${forceShowOptions ? ' options--visible' : ''}`}>
      <div className="options-header">
        <span>Options</span>
        {forceShowOptions ? (
          <button className="plain-button" onClick={onClose} type="button">
            X
          </button>
        ) : <span />}
      </div>

      <OptionSection title="Page orientation">
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

      <OptionSection title="Page size">
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

      <OptionSection disabled={!fixedPageOptionsEnabled} title="Page margin">
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

      <OptionSection disabled={!fixedPageOptionsEnabled} title="Image fit">
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

      <OptionSection title="Compression">
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

      <OptionSection title="Page numbers">
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
        <div className="option-row-label">Position</div>
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
        <div className="option-row-label">Alignment</div>
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
        <div className="option-row-label">Placement</div>
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

      <div className={`image-quality-row${options.compressImages ? '' : ' image-quality-row--disabled'}`}>
        <div className="quality-label">Image quality</div>
        <div className="quality-controls">
          <button
            aria-label="Increase image quality"
            disabled={!options.compressImages}
            onClick={() => onChangeOptions({ imageQuality: Math.min(100, options.imageQuality + 10) })}
            type="button"
          >
            +
          </button>
          <div>{options.imageQuality}%</div>
          <button
            aria-label="Decrease image quality"
            disabled={!options.compressImages}
            onClick={() => onChangeOptions({ imageQuality: Math.max(10, options.imageQuality - 10) })}
            type="button"
          >
            -
          </button>
        </div>
      </div>
      <div className={`compression-note${options.compressImages ? '' : ' compression-note--disabled'}`}>
        Compression can reduce file size and image quality.
      </div>
    </div>
  );
}

function OptionSection({ children, disabled = false, title }: OptionSectionProps) {
  return (
    <div className={disabled ? 'option-section option-section--disabled' : 'option-section'}>
      <div className="option-section-title">{title}</div>
      <div className="option-row">{children}</div>
    </div>
  );
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
