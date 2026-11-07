/**
 * Single-series line in LTR coordinates (time runs left to right in both languages, as on
 * market terminals; it is a chart of time, not text). Scaled to its own min/max.
 */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  strokeWidth = 2,
  fill = false,
  className = "",
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  fill?: boolean;
  className?: string;
}) {
  if (values.length < 2) {
    return <svg aria-hidden width={width} height={height} className={className} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = strokeWidth;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join("");
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      style={{ direction: "ltr" }}
    >
      {fill ? (
        <path d={`${line}L${width},${height}L0,${height}Z`} fill="currentColor" opacity={0.12} />
      ) : null}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
