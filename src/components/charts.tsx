import * as React from "react";

/** Minigráfico de linha (sparkline) em SVG puro. values: números >= 0. */
export const Sparkline: React.FC<{
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  id?: string;
}> = ({ values, width = 120, height = 36, stroke = "var(--primary)", id }) => {
  const gid = React.useId().replace(/:/g, '');
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={`${id ?? 'sp'}-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id ?? 'sp'}-${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Gráfico de linha com eixo e pontos (desempenho). */
export const TrendChart: React.FC<{
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
}> = ({ labels, series, height = 190 }) => {
  const W = 640;
  const H = height;
  const PAD_L = 34;
  const PAD_B = 22;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1);
  const x = (i: number) => PAD_L + (i * (W - PAD_L - 8)) / Math.max(labels.length - 1, 1);
  const y = (v: number) => 8 + (H - PAD_B - 14) * (1 - v / max);
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const gid = React.useId().replace(/:/g, '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="Gráfico de desempenho">
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`tr-${gid}-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - 4} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" opacity="0.6" />
          <text x={2} y={y(t) + 3} fontSize="9" fill="var(--text-secondary)">{t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}</text>
        </g>
      ))}
      {series.map((s, si) => {
        const line = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        return (
          <g key={si}>
            <path d={`${line} L${x(s.values.length - 1).toFixed(1)},${H - PAD_B} L${x(0).toFixed(1)},${H - PAD_B} Z`} fill={`url(#tr-${gid}-${si})`} />
            <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={s.color} />
            ))}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="var(--text-secondary)" textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
};

/** Barras verticais simples. */
export const MiniBars: React.FC<{
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}> = ({ values, color = "var(--primary)", width = 120, height = 36 }) => {
  const max = Math.max(...values, 1);
  const bw = values.length ? width / values.length : width;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        return (
          <rect
            key={i}
            x={(i * bw + bw * 0.22).toFixed(1)}
            y={(height - h).toFixed(1)}
            width={Math.max(2, bw * 0.56).toFixed(1)}
            height={h.toFixed(1)}
            rx="2"
            fill={color}
            opacity={0.35 + 0.65 * (v / max)}
          />
        );
      })}
    </svg>
  );
};
