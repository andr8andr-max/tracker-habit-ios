import type { TodayStatus } from '../../api/types';
import { formatDate } from '../../lib/format';

interface LinePoint {
  date: string;
  status: TodayStatus;
}

interface HabitLineChartProps {
  points: LinePoint[];
}

const WIDTH = 600;
const HEIGHT = 180;
const PAD_LEFT = 14;
const PAD_RIGHT = 14;
const TOP = 22;
const BOTTOM = 132;

const STATUS_VALUE: Record<TodayStatus, number | null> = {
  done: 1,
  pending: 0.5,
  skipped: 0,
  none: null,
  off: null,
};

const STATUS_LABEL: Record<TodayStatus, string> = {
  done: 'выполнено',
  pending: 'не выполнено',
  skipped: 'пропущено',
  none: 'вне расписания',
  off: 'вне расписания',
};

const DOT_STYLE: Record<TodayStatus, string> = {
  done: 'fill-brand-600',
  pending: 'fill-amber-400',
  skipped: 'fill-rose-500',
  none: 'fill-slate-300',
  off: 'fill-slate-300',
};

function valueToY(value: number): number {
  return BOTTOM - value * (BOTTOM - TOP);
}

export function HabitLineChart({ points }: HabitLineChartProps) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Нет данных за период</p>;
  }

  const step =
    points.length > 1 ? (WIDTH - PAD_LEFT - PAD_RIGHT) / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    ...point,
    x: PAD_LEFT + index * step,
    y: valueToY(STATUS_VALUE[point.status] ?? 0),
    value: STATUS_VALUE[point.status],
  }));

  const valuedPoints = coords
    .filter((coord) => coord.value !== null)
    .map((coord) => ({ x: coord.x, y: coord.y }));
  const segments: { x: number; y: number }[][] =
    valuedPoints.length > 0 ? [valuedPoints] : [];

  const middleIndex = Math.floor(coords.length / 2);
  const labels = [coords[0], coords[middleIndex], coords[coords.length - 1]];

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="График выполнения привычки за 30 дней"
      >
        {[1, 0.5, 0].map((value) => (
          <g key={value}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={valueToY(value)}
              y2={valueToY(value)}
              stroke="#e2e8f0"
              strokeDasharray={value === 0 ? '0' : '4 4'}
            />
          </g>
        ))}
        <text x={PAD_LEFT} y={TOP - 8} className="fill-slate-400" fontSize="10">
          выполнено
        </text>
        <text x={PAD_LEFT} y={BOTTOM + 14} className="fill-slate-400" fontSize="10">
          не выполнено
        </text>

        {segments.map((segment, index) => (
          <polyline
            key={index}
            points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke="#1f64f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {coords.map((coord) => (
          <g key={coord.date}>
            {coord.value === null ? (
              <line
                x1={coord.x}
                x2={coord.x}
                y1={BOTTOM - 4}
                y2={BOTTOM + 6}
                stroke="#cbd5e1"
                strokeWidth="2"
              />
            ) : null}
            <circle
              cx={coord.x}
              cy={coord.y}
              r={coord.value === null ? 0 : 4}
              className={DOT_STYLE[coord.status]}
            >
              <title>{`${formatDate(coord.date)} — ${STATUS_LABEL[coord.status]}`}</title>
            </circle>
          </g>
        ))}

        {labels.map((label, index) => (
          <text
            key={`${label.date}-${index}`}
            x={label.x}
            y={HEIGHT - 12}
            fontSize="10"
            className="fill-slate-400"
            textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
          >
            {formatDate(label.date)}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Выполнено
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Не выполнено
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Пропущено
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-slate-300" /> Вне расписания
        </span>
      </div>
    </div>
  );
}
