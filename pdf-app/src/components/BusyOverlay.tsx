interface BusyOverlayProps {
  busy: boolean;
  progress?: {
    current: number;
    total: number;
  };
}

export default function BusyOverlay({ busy, progress }: BusyOverlayProps) {
  if (!busy) {
    return null;
  }

  const text = progress?.total
    ? `Generating PDF (${progress.current}/${progress.total}), Please wait...`
    : 'Generating PDF, Please wait...';

  return <div className="busy">{text}</div>;
}
