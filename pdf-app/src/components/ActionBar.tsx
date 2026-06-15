interface ActionBarProps {
  busy: boolean;
  fileName: string;
  imageSummary: string;
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
  onAddPage,
  onChangeFileName,
  onGeneratePdf,
  onShowAbout,
  onShowOptions,
}: ActionBarProps) {
  return (
    <div className="actions">
      <div className="left-actions">
        <button onClick={onShowOptions} className="option-btn button" type="button">
          PDF Options
        </button>
        <button onClick={onAddPage} className="button" type="button">
          Add page
        </button>
        <div className="image-summary">{imageSummary}</div>
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
