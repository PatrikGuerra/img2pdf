import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  IMAGE_FIT_LABELS,
  IMAGE_FITS,
  PAGE_MARGIN_LABELS,
  PAGE_MARGINS,
  PAGE_ORIENTATION_LABELS,
  PAGE_ORIENTATIONS,
  PAGE_SIZE_LABELS,
  PAGE_SIZES,
} from '../constants/pdfOptions';
import { mmToPdfPoints } from '../pdf/pageLayout';
import type { PageOrientation, PdfOptions } from '../types/pdf';

interface OptionsPanelProps {
  forceShowOptions: boolean;
  options: PdfOptions;
  onChangeOptions: (options: Partial<PdfOptions>) => void;
  onChangeOrientation: (orientation: PageOrientation) => void;
  onClose: () => void;
}

interface OptionSectionProps {
  children: ReactNode;
  title: string;
}

interface OptionButtonProps {
  active: boolean;
  children: ReactNode;
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

  useEffect(() => {
    if (!marginInputFocused) {
      setMarginInputValue(formatMarginInputValue(options.margin));
    }
  }, [marginInputFocused, options.margin]);

  const updateMargin = (margin: number) => {
    onChangeOptions({ margin });
    setMarginInputValue(formatMarginInputValue(margin));
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

      {options.pageSize !== PAGE_SIZES.IMAGE ? (
        <OptionSection title="Page margin">
          <OptionButton
            active={isSameMargin(options.margin, PAGE_MARGINS.NONE)}
            onClick={() => updateMargin(PAGE_MARGINS.NONE)}
          >
            {PAGE_MARGIN_LABELS[PAGE_MARGINS.NONE]}
          </OptionButton>
          <OptionButton
            active={isSameMargin(options.margin, PAGE_MARGINS.MM_5)}
            onClick={() => updateMargin(PAGE_MARGINS.MM_5)}
          >
            {PAGE_MARGIN_LABELS[PAGE_MARGINS.MM_5]}
          </OptionButton>
          <OptionButton
            active={isSameMargin(options.margin, PAGE_MARGINS.MM_10)}
            onClick={() => updateMargin(PAGE_MARGINS.MM_10)}
          >
            {PAGE_MARGIN_LABELS[PAGE_MARGINS.MM_10]}
          </OptionButton>
          <OptionButton
            active={isSameMargin(options.margin, PAGE_MARGINS.MM_20)}
            onClick={() => updateMargin(PAGE_MARGINS.MM_20)}
          >
            {PAGE_MARGIN_LABELS[PAGE_MARGINS.MM_20]}
          </OptionButton>
          <div className="custom-margin-field">
            <label htmlFor="custom-margin">Custom margin</label>
            <div className="custom-margin-input">
              <input
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
      ) : null}

      {options.pageSize !== PAGE_SIZES.IMAGE ? (
        <OptionSection title="Image fit">
          <OptionButton
            active={options.imageFit === IMAGE_FITS.CONTAIN}
            onClick={() => onChangeOptions({ imageFit: IMAGE_FITS.CONTAIN })}
          >
            {IMAGE_FIT_LABELS[IMAGE_FITS.CONTAIN]}
          </OptionButton>
          <OptionButton
            active={options.imageFit === IMAGE_FITS.COVER}
            onClick={() => onChangeOptions({ imageFit: IMAGE_FITS.COVER })}
          >
            {IMAGE_FIT_LABELS[IMAGE_FITS.COVER]}
          </OptionButton>
        </OptionSection>
      ) : null}

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

function OptionSection({ children, title }: OptionSectionProps) {
  return (
    <div>
      <div className="option-section-title">{title}</div>
      <div className="option-row">{children}</div>
    </div>
  );
}

function OptionButton({ active, children, onClick }: OptionButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={`option-choice${active ? ' option-choice--active' : ''}`}
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
