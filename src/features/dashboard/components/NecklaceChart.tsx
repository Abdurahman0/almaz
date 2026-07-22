import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotProps,
} from 'recharts';
import { formatMoneyShort } from '@/shared/lib/format';
import { useThemeColors, type ThemeColors } from '@/shared/hooks/useThemeColors';
import type { DayPoint } from '../hooks';

interface NecklaceDotProps extends DotProps {
  payload?: DayPoint;
  maxRevenue: number;
  colors: ThemeColors;
}

/** Pearls on a chain, sized by revenue; the record day is a diamond. */
function NecklaceDot({ cx, cy, payload, maxRevenue, colors }: NecklaceDotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const t = maxRevenue > 0 ? payload.revenue / maxRevenue : 0;
  const r = 4 + t * 8;
  if (payload.isRecord && payload.revenue > 0) {
    const s = r + 4;
    return (
      <g>
        <path
          d={`M${cx} ${cy - s} L${cx + s * 0.8} ${cy} L${cx} ${cy + s} L${cx - s * 0.8} ${cy} Z`}
          fill={colors.accent}
          stroke={colors.accentStrong}
          strokeWidth="1.5"
        />
        <line
          x1={cx - s * 0.8}
          y1={cy}
          x2={cx + s * 0.8}
          y2={cy}
          stroke={colors.surface}
          strokeOpacity="0.7"
          strokeWidth="0.8"
        />
        <line
          x1={cx}
          y1={cy - s}
          x2={cx}
          y2={cy + s}
          stroke={colors.surface}
          strokeOpacity="0.7"
          strokeWidth="0.8"
        />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={colors.accent} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.3} fill={colors.surface} fillOpacity="0.5" />
    </g>
  );
}

export function NecklaceChart({ data }: { data: DayPoint[] }) {
  const colors = useThemeColors();
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 24, right: 24, bottom: 4, left: 8 }}>
        <XAxis
          dataKey="label"
          stroke={colors.border}
          tickLine={false}
          axisLine={false}
          tick={{ fill: colors.muted, fontSize: 12 }}
        />
        <YAxis hide domain={[0, 'dataMax + 1000000']} />
        <Tooltip
          cursor={{ stroke: colors.border }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as DayPoint;
            return (
              <div className="card-velvet px-4 py-2.5 text-sm">
                <p className="text-muted">{point.label}</p>
                <p className="font-semibold text-accent-ink">{formatMoneyShort(point.revenue)}</p>
              </div>
            );
          }}
        />
        <Line
          type="natural"
          dataKey="revenue"
          stroke={colors.accentStrong}
          strokeWidth={1.5}
          dot={(props) => {
            const { key, ...rest } = props as DotProps & { key?: string; payload?: DayPoint };
            return <NecklaceDot key={key} {...rest} maxRevenue={maxRevenue} colors={colors} />;
          }}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
