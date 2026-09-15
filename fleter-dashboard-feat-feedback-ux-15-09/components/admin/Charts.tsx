"use client";

import { fmtDate } from "@/lib/utils";

interface Series {
  name: string;
  colorVar: string; // ej. "var(--accent)"
}

interface DayPoint {
  fecha: string;
  values: number[];
}

/**
 * Gráfico de barras nativo (SVG, sin dependencias). Soporta 1 o 2 series
 * agrupadas por día. Escala automática al máximo. Usa tokens del design system.
 */
export function BarChart({
  points,
  series,
  height = 140,
}: {
  points: DayPoint[];
  series: Series[];
  height?: number;
}) {
  const max = Math.max(1, ...points.flatMap((p) => p.values));
  const n = points.length;
  const groupW = 100 / n; // en %
  const barGap = 0.15; // fracción del ancho de grupo
  const innerW = groupW * (1 - barGap);
  const barW = innerW / series.length;

  // etiquetas de eje: mostrar ~5 fechas espaciadas
  const labelStep = Math.max(1, Math.ceil(n / 5));

  return (
    <div className="admin-chart">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="admin-chart__svg"
        style={{ height }}
        role="img"
      >
        {points.map((p, i) => {
          const gx = i * groupW + (groupW * barGap) / 2;
          return series.map((s, si) => {
            const v = p.values[si] ?? 0;
            const h = (v / max) * (height - 4);
            const x = gx + si * barW;
            return (
              <rect
                key={`${i}-${si}`}
                x={x}
                y={height - h}
                width={barW * 0.85}
                height={h}
                rx={0.6}
                fill={s.colorVar}
              >
                <title>{`${fmtDate(p.fecha)} · ${s.name}: ${v}`}</title>
              </rect>
            );
          });
        })}
      </svg>
      <div className="admin-chart__axis">
        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <span key={i} className="admin-chart__tick">{fmtDate(p.fecha)}</span>
          ) : null
        )}
      </div>
      {series.length > 1 && (
        <div className="admin-chart__legend">
          {series.map((s) => (
            <span key={s.name} className="admin-chart__legend-item">
              <span className="admin-chart__swatch" style={{ background: s.colorVar }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Distribución horizontal (barras) para conteos por categoría
 * (por_estado, por_rol). Cada fila = label + barra proporcional + valor.
 */
export function DistributionBars({
  data,
  colorVar = "var(--accent)",
}: {
  data: { label: string; value: number }[];
  colorVar?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="admin-dist">
      {data.map((d) => (
        <div key={d.label} className="admin-dist__row">
          <span className="admin-dist__label">{d.label}</span>
          <span className="admin-dist__track">
            <span
              className="admin-dist__fill"
              style={{ width: `${(d.value / max) * 100}%`, background: colorVar }}
            />
          </span>
          <span className="admin-dist__value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
