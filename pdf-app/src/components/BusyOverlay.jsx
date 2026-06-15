export default function BusyOverlay({ busy, progress }) {
  if (!busy) {
    return null;
  }

  const text = progress?.total
    ? `Generating PDF (${progress.current}/${progress.total}), Please wait...`
    : 'Generating PDF, Please wait...';

  return <div className="busy">{text}</div>;
}
