interface ActionBarProps {
  busy: boolean;
  fileName: string;
  imageSummary: string;
  pdfSize?: string;
  canUndo: boolean;
  optionsOpen: boolean;
  onUndo: () => void;
  onAddPage: () => void;
  onChangeFileName: (fileName: string) => void;
  onGeneratePdf: () => void;
  onShowAbout: () => void;
  onShowOptions: () => void;
}

export default function ActionBar({
  busy,
  fileName,
  imageSummary,
  pdfSize,
  canUndo,
  optionsOpen,
  onUndo,
  onAddPage,
  onChangeFileName,
  onGeneratePdf,
  onShowAbout,
  onShowOptions,
}: ActionBarProps) {
  return (
    <div className="actions">
      <div className="left-actions">
        <button id="open-pdf-options" aria-controls="pdf-options" aria-expanded={optionsOpen} onClick={onShowOptions} className="option-btn button button--secondary" type="button">
          PDF Options
        </button>
        <button onClick={onAddPage} className="button button--secondary" type="button">
          Add page
        </button>
        <button onClick={onUndo} disabled={!canUndo} className="button button--secondary" type="button">Undo page edit</button>
        <div className="image-summary">{imageSummary}</div>
        {pdfSize ? <div role="status">Last PDF: {pdfSize}</div> : null}
      </div>
      <div className="right-actions">
        <label className="pdf-name-field">
          <span>PDF name</span>
          <input
            aria-label="PDF name"
            onChange={(event) => onChangeFileName(event.target.value)}
            type="text"
            value={fileName}
          />
        </label>
        <button disabled={busy} onClick={onGeneratePdf} className="button" type="button">
          Generate PDF
        </button>
        <button
          aria-label="About this app"
          className="about-button"
          onClick={onShowAbout}
          title="About this app"
          type="button"
        >
          <i aria-hidden="true" className="fa fa-info-circle" />
        </button>
      </div>
    </div>
  );
}
