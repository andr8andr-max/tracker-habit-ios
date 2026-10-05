import { formatDate } from '../../lib/format';

export interface BarDatum {
  label: string;
  value: number;
  title?: string;
}

interface HabitBarChartProps {
  data: BarDatum[];
  ariaLabel?: string;
}

const WIDTH = 600;
const HEIGHT = 170;
const PAD_LEFT = 14;
const PAD_RIGHT = 14;
const TOP = 16;
const BOTTOM = 128;

export function HabitBarChart({ data, ariaLabel = 'Столбчатая статистика' }: HabitBarChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Нет данных за период</p>;
  }

  const areaWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const slot = areaWidth / data.length;
  const barWidth = Math.max(3, Math.min(16, slot - 3));
  const usableHeight = BOTTOM - TOP;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={BOTTOM}
          y2={BOTTOM}
          stroke="#e2e8f0"
        />
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={TOP + usableHeight / 2}
          y2={TOP + usableHeight / 2}
          stroke="#e2e8f0"
          strokeDasharray="4 4"
        />
        <text x={PAD_LEFT} y={TOP - 4} fontSize="10" className="fill-slate-400">
          100%
        </text>

        {data.map((datum, index) => {
          const clamped = Math.max(0, Math.min(1, datum.value));
          const height = Math.max(clamped > 0 ? 4 : 2, clamped * usableHeight);
          const x = PAD_LEFT + index * slot + (slot - barWidth) / 2;
          const y = BOTTOM - height;
          return (
            <rect
              key={`${datum.label}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx={Math.min(3, barWidth / 2)}
              fill={clamped > 0 ? '#1f64f1' : '#e2e8f0'}
            >
              <title>{datum.title ?? `${formatDate(datum.label)} — ${Math.round(clamped * 100)}%`}</title>
            </rect>
          );
        })}

        {[0, Math.floor(data.length / 2), data.length - 1].map((index, position) => (
          <text
            key={index}
            x={PAD_LEFT + index * slot + slot / 2}
            y={HEIGHT - 14}
            fontSize="10"
            className="fill-slate-400"
            textAnchor={position === 0 ? 'start' : position === 2 ? 'end' : 'middle'}
          >
            {formatDate(data[index].label)}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-center text-xs text-slate-400">Последние 30 дней</p>
    </div>
  );
}
