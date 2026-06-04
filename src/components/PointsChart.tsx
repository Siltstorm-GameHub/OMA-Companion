"use client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface DataPoint {
  date: string;   // "DD.MM"
  points: number; // kumulierte Punkte
}

interface Props {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs border border-white/10 shadow-xl">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-amber-400 font-bold">{payload[0].value.toLocaleString("de-DE")} Pts</p>
    </div>
  );
}

export function PointsChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-gray-600">
        Noch nicht genug Daten für ein Diagramm
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#4b5563" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#4b5563" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(244,63,94,0.2)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="points"
          stroke="#f43f5e"
          strokeWidth={2}
          fill="url(#pointsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#f43f5e", stroke: "#080c18", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
