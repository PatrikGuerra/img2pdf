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

  const text = progress?.current && progress.total
    ? `Processing ${progress.current} of ${progress.total}`
    : 'Preparing PDF...';

  return <div aria-live="polite" className="busy">{text}</div>;
}
