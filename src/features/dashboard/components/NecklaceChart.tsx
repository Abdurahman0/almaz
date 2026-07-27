import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoneyShort } from '@/shared/lib/format';
import { useThemeColors } from '@/shared/hooks/useThemeColors';
import type { DayPoint } from '../hooks';

/** Modern gradient area chart of the week's revenue. */
export function NecklaceChart({ data }: { data: DayPoint[] }) {
  const colors = useThemeColors();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.28} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={colors.border}
          strokeDasharray="4 6"
        />
        <XAxis
          dataKey="label"
          stroke={colors.border}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={{ fill: colors.muted, fontSize: 12 }}
        />
        <YAxis hide domain={[0, 'dataMax + 1000000']} />
        <Tooltip
          cursor={{ stroke: colors.border, strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as DayPoint;
            return (
              <div className="float-panel px-3.5 py-2 text-sm">
                <p className="text-xs text-muted">{point.label}</p>
                <p className="tnum font-semibold text-accent-ink">{formatMoneyShort(point.revenue)}</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={colors.accent}
          strokeWidth={2.5}
          fill="url(#revFill)"
          dot={false}
          activeDot={{ r: 5, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }}
          isAnimationActive
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
