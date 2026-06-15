interface ActionBarProps {
  busy: boolean;
  onAddPage: () => void;
  onGeneratePdf: () => void;
  onShowOptions: () => void;
}

export default function ActionBar({ busy, onAddPage, onGeneratePdf, onShowOptions }: ActionBarProps) {
  return (
    <div className="actions">
      <div className="left-actions">
        <button onClick={onShowOptions} className="option-btn button" type="button">
          PDF Options
        </button>
        <button onClick={onAddPage} className="button" type="button">
          Add page
        </button>
      </div>
      <button disabled={busy} onClick={onGeneratePdf} className="button" type="button">
        Generate PDF
      </button>
    </div>
  );
}
