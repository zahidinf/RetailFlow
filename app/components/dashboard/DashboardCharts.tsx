import React from "react";

export interface DonutChartItem {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#64748b", // slate
];

function defaultFormat(val: number, currency?: boolean, prefix?: string, suffix?: string): string {
  const formatted = val.toLocaleString("id-ID");
  if (currency) {
    return `Rp ${formatted}`;
  }
  return `${prefix || ""}${formatted}${suffix || ""}`;
}

export function DonutChart({
  items,
  totalLabel = "Total",
  size = 180,
  strokeWidth = 26,
  currency = false,
  prefix,
  suffix,
  valueFormatter,
}: {
  items: DonutChartItem[];
  totalLabel?: string;
  size?: number;
  strokeWidth?: number;
  currency?: boolean;
  prefix?: string;
  suffix?: string;
  valueFormatter?: (v: number) => string;
}) {
  const format = (v: number) => (valueFormatter ? valueFormatter(v) : defaultFormat(v, currency, prefix, suffix));
  const total = items.reduce((acc, i) => acc + i.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
        <svg
          className="w-12 h-12 mb-2 text-slate-300 dark:text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
        <span className="text-xs">No data for selected period</span>
      </div>
    );
  }

  const chartSlices = items.map((item, idx) => {
    const pct = item.value / total;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += pct;
    return {
      ...item,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {chartSlices.map((item, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={item.strokeDasharray}
              strokeDashoffset={item.strokeDashoffset}
              className="transition-all duration-300"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {totalLabel}
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {format(total)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-xs w-full">
        {chartSlices.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-300 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 font-medium shrink-0">
                <span className="text-slate-900 dark:text-white">{format(item.value)}</span>
                <span className="text-slate-400 text-[11px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface BarChartPoint {
  label: string;
  value: number;
  value2?: number;
  tooltipExtra?: string;
}

export function SimpleBarChart({
  points,
  height = 180,
  currency = false,
  prefix,
  suffix,
  valueFormatter,
  primaryColor = "bg-blue-600 dark:bg-blue-500",
  secondaryColor = "bg-slate-300 dark:bg-slate-700",
  primaryLabel = "Current",
  secondaryLabel = "Previous",
}: {
  points: BarChartPoint[];
  height?: number;
  currency?: boolean;
  prefix?: string;
  suffix?: string;
  valueFormatter?: (v: number) => string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const format = (v: number) => (valueFormatter ? valueFormatter(v) : defaultFormat(v, currency, prefix, suffix));
  const maxVal = Math.max(
    ...points.flatMap((p) => [p.value, p.value2 ?? 0]),
    1
  );

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
        <span className="text-xs">No records available</span>
      </div>
    );
  }

  const hasSecondary = points.some((p) => p.value2 !== undefined);

  return (
    <div className="space-y-3">
      {hasSecondary && (
        <div className="flex items-center justify-end gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-xs ${primaryColor}`} />
            <span>{primaryLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-xs ${secondaryColor}`} />
            <span>{secondaryLabel}</span>
          </div>
        </div>
      )}

      <div
        style={{ height }}
        className="flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-1 overflow-x-auto"
      >
        {points.map((pt, idx) => {
          const h1 = Math.max(pt.value > 0 ? Math.round((pt.value / maxVal) * 100) : 3, 3);
          const h2 =
            pt.value2 !== undefined
              ? Math.max(pt.value2 > 0 ? Math.round((pt.value2 / maxVal) * 100) : 3, 3)
              : null;

          return (
            <div
              key={idx}
              className="flex-1 min-w-[32px] sm:min-w-[40px] flex flex-col items-center gap-1.5 group h-full justify-end relative"
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-900 dark:bg-slate-800 text-white text-[11px] p-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                <div className="font-semibold">{pt.label}</div>
                <div>
                  {primaryLabel}: {format(pt.value)}
                </div>
                {pt.value2 !== undefined && (
                  <div className="text-slate-400">
                    {secondaryLabel}: {format(pt.value2)}
                  </div>
                )}
                {pt.tooltipExtra && (
                  <div className="text-slate-300 text-[10px] mt-0.5">{pt.tooltipExtra}</div>
                )}
              </div>

              {/* Bars */}
              <div className="w-full flex items-end justify-center gap-1 h-full">
                {h2 !== null && (
                  <div
                    style={{ height: `${h2}%` }}
                    className={`w-1/2 rounded-t-xs ${secondaryColor} transition-all`}
                  />
                )}
                <div
                  style={{ height: `${h1}%` }}
                  className={`${h2 !== null ? "w-1/2" : "w-full max-w-[28px]"} rounded-t-xs ${primaryColor} transition-all`}
                />
              </div>

              {/* Label */}
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">
                {pt.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SimpleAreaChart({
  points,
  height = 180,
  currency = false,
  prefix,
  suffix,
  valueFormatter,
}: {
  points: { label: string; value: number }[];
  height?: number;
  currency?: boolean;
  prefix?: string;
  suffix?: string;
  valueFormatter?: (v: number) => string;
}) {
  const _format = (v: number) => (valueFormatter ? valueFormatter(v) : defaultFormat(v, currency, prefix, suffix));
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
        <span className="text-xs">No trend data available</span>
      </div>
    );
  }

  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const width = 500;
  const paddingY = 20;
  const chartH = height - paddingY * 2;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * (width - 40) + 20;
    const y = height - paddingY - (p.value / maxVal) * chartH;
    return { x, y, ...p };
  });

  const pathD = coords.reduce(
    (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ""
  );

  const fillD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <div className="space-y-2">
      <div style={{ height }} className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill="url(#areaGradient)" />
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" />
          {coords.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r="3.5"
              className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
