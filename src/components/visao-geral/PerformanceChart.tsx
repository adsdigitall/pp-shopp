import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import { formatBRL } from '@/services/dashboard';

interface Point {
  key: string;
  label: string;
  commission: number;
  sales: number;
  sends: number;
}

const H = 260;
const PAD = { left: 52, right: 36, top: 16, bottom: 30 };

function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value) ?? 10;
  return step * magnitude;
}

// Curva suave (Catmull-Rom → Bézier) presa ao topo/base para não "passar" do eixo.
function smoothPath(points: [number, number][], top: number, bottom: number) {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  const clamp = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function PerformanceChart({ data }: { data: Point[] }) {
  const gid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Desenha na largura real do container: escalar um SVG fixo deixava o texto ilegível no celular.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    const maxCommission = niceMax(Math.max(...data.map((p) => p.commission), 0));
    const maxSales = niceMax(Math.max(...data.map((p) => p.sales), 0));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const bottom = PAD.top + innerH;
    const x = (i: number) => PAD.left + (data.length > 1 ? (i * innerW) / (data.length - 1) : innerW / 2);
    const yC = (v: number) => bottom - (v / maxCommission) * innerH;
    const yS = (v: number) => bottom - (v / maxSales) * innerH;
    const commissionPts = data.map((p, i) => [x(i), yC(p.commission)] as [number, number]);
    const salesPts = data.map((p, i) => [x(i), yS(p.sales)] as [number, number]);
    const commissionLine = smoothPath(commissionPts, PAD.top, bottom);
    const area = commissionPts.length
      ? `${commissionLine} L${commissionPts.at(-1)![0]},${bottom} L${commissionPts[0][0]},${bottom} Z`
      : '';
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64))));
    return { maxCommission, maxSales, x, yC, yS, bottom, innerW, commissionLine, salesLine: smoothPath(salesPts, PAD.top, bottom), area, ticks, labelEvery, commissionPts, salesPts };
  }, [data, W]);

  // Ponteiro cobre mouse e toque (no celular o tooltip abre ao tocar).
  const pickPoint = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round(((relative - PAD.left) / chart.innerW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, index)));
  };

  const active = hover !== null ? data[hover] : null;
  const tooltipLeft = hover !== null ? (chart.x(hover) / W) * 100 : 0;

  return (
    <div ref={wrapRef} className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
        role="img"
        aria-label="Gráfico de comissão e vendas no período"
        onPointerLeave={() => setHover(null)}
        onPointerMove={pickPoint}
        onPointerDown={pickPoint}
      >
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {chart.ticks.map((t) => {
          const y = chart.bottom - t * (chart.bottom - PAD.top);
          const money = chart.maxCommission * t;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray={t === 0 ? undefined : '3 5'} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                {money >= 1000 ? `R$ ${(money / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `R$ ${money.toLocaleString('pt-BR', { maximumFractionDigits: money < 10 ? 1 : 0 })}`}
              </text>
              <text x={W - PAD.right + 8} y={y + 4} fontSize="11" fill="var(--text-muted)">
                {Number((chart.maxSales * t).toFixed(1)).toLocaleString('pt-BR')}
              </text>
            </g>
          );
        })}
        <path d={chart.area} fill={`url(#area-${gid})`} />
        <path d={chart.salesLine} fill="none" stroke="var(--ink-300)" strokeWidth="2" strokeLinecap="round" />
        <path d={chart.commissionLine} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" strokeLinecap="round" />
        {data.map((p, i) => (i % chart.labelEvery === 0 || i === data.length - 1) && (
          <text key={p.key} x={chart.x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{p.label}</text>
        ))}
        {hover !== null && (
          <g>
            <line x1={chart.x(hover)} x2={chart.x(hover)} y1={PAD.top} y2={chart.bottom} stroke="var(--border-strong)" strokeDasharray="3 4" />
            <circle cx={chart.salesPts[hover][0]} cy={chart.salesPts[hover][1]} r="4.5" fill="var(--ink-200)" stroke="var(--surface-card)" strokeWidth="2" />
            <circle cx={chart.commissionPts[hover][0]} cy={chart.commissionPts[hover][1]} r="4.5" fill="var(--brand-500)" stroke="var(--surface-card)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[170px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-card-raised)] px-3 py-2.5 text-xs shadow-[var(--shadow-pop)]"
          style={{ left: `${tooltipLeft}%`, transform: tooltipLeft > 60 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
        >
          <p className="mb-1.5 text-[var(--text-secondary)]">{active.label}</p>
          <p className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-[var(--text-body)]"><span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" />Comissão</span><strong className="rdo-num text-[var(--text-title)]">{formatBRL(active.commission)}</strong></p>
          <p className="mt-1 flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-[var(--text-body)]"><span className="h-2 w-2 rounded-full bg-[var(--ink-300)]" />Vendas</span><strong className="rdo-num text-[var(--text-title)]">{active.sales}</strong></p>
          <p className="mt-1 flex items-center justify-between gap-4"><span className="text-[var(--text-muted)]">Ofertas enviadas</span><span className="rdo-num text-[var(--text-secondary)]">{active.sends}</span></p>
        </div>
      )}
      <div className="mt-1 flex items-center justify-center gap-5 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-500)]" />Comissão</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-300)]" />Vendas (escala à direita)</span>
      </div>
    </div>
  );
}
