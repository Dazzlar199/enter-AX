/** Shared pieces for the dance/vocal comparison panels. */

export function MetricBar({ label, value, hint, missing = "측정할 수 없어요" }: { label: string; value: number | null; hint: string; missing?: string }) {
  if (value === null) {
    return (
      <div className="an-metric">
        <div className="an-metric__head"><span>{label}</span><span className="ap-muted">{missing}</span></div>
      </div>
    );
  }
  const pct = Math.round(value * 100);
  return (
    <div className="an-metric">
      <div className="an-metric__head"><span>{label}</span><strong>{pct}%</strong></div>
      <div aria-hidden="true" className="an-metric__bar"><i style={{ width: `${pct}%` }} /></div>
      <p>{hint}</p>
    </div>
  );
}

/** File picker styled as a field: shows the chosen file name instead of the browser's raw control. */
export function FileField({
  label,
  accept,
  file,
  disabled,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="an-file" data-filled={file ? "" : undefined}>
      <span className="an-file__label">{label}</span>
      <span className="an-file__value">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V4m0 0-4 4m4-4 4 4M5 16v3h14v-3" /></svg>
        {file ? file.name : "파일 선택"}
      </span>
      <input accept={accept} className="sr-only" disabled={disabled} type="file" onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
    </label>
  );
}
