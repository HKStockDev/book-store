"use client";

import { cn } from "@/lib/utils";
import type { ActivityHistory } from "@/lib/types";

const SERIES = [
  { key: "reading" as const, label: "Lecturas", color: "var(--primary)" },
  { key: "reviews" as const, label: "Reseñas", color: "#8d6e63" },
  { key: "purchases" as const, label: "Compras", color: "#a1887f" },
];

export function ActivityChart({ data, className }: { data: ActivityHistory; className?: string }) {
  const totals = data.months.map((_, i) =>
    SERIES.reduce((sum, s) => sum + data[s.key][i], 0),
  );
  const maxTotal = Math.max(...totals, 1);
  const chartHeight = 140;
  const barGap = 8;
  const barWidth = Math.min(36, Math.max(18, (320 - barGap * (data.months.length - 1)) / data.months.length));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-3 text-xs">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${data.months.length * (barWidth + barGap)} ${chartHeight + 28}`}
          className="min-w-full"
          role="img"
          aria-label="Gráfico de actividad mensual"
        >
          {data.months.map((month, i) => {
            const x = i * (barWidth + barGap);
            let cumulative = 0;

            return (
              <g key={month}>
                {SERIES.map((s) => {
                  const value = data[s.key][i];
                  const height = (value / maxTotal) * chartHeight;
                  const y = chartHeight - cumulative - height;
                  cumulative += height;
                  if (value === 0) return null;
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx={3}
                      fill={s.color}
                    >
                      <title>{`${s.label}: ${value} (${month})`}</title>
                    </rect>
                  );
                })}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {totals.every((t) => t === 0) && (
        <p className="text-sm text-muted-foreground">
          Aún no hay actividad registrada. Empieza a leer, reseñar o comprar contenido.
        </p>
      )}
    </div>
  );
}
