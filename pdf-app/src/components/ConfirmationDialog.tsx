interface ConfirmationDialogProps {
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export default function ConfirmationDialog({
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-labelledby="confirmation-dialog-title" aria-modal="true" className="dialog" role="dialog">
        <div className="dialog-title" id="confirmation-dialog-title">{title}</div>
        <div className="dialog-body">{body}</div>
        <div className="dialog-actions">
          <button className="plain-dialog-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="danger-dialog-button" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
