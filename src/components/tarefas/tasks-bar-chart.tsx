import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BarDatum {
  nome: string;
  total: number;
  cor?: string;
}

export function TasksBarChart({ data, color = '#A8632F', height = 220 }: { data: BarDatum[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E7E2DA" />
        <XAxis
          dataKey="nome"
          tickLine={false}
          axisLine={{ stroke: '#C3C2B7' }}
          tick={{ fill: '#797264', fontSize: 12 }}
          interval={0}
          angle={data.length > 5 ? -20 : 0}
          textAnchor={data.length > 5 ? 'end' : 'middle'}
          height={data.length > 5 ? 40 : 24}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#797264', fontSize: 12 }} width={28} />
        <Tooltip
          cursor={{ fill: 'rgba(168, 99, 47, 0.06)' }}
          contentStyle={{ borderRadius: 8, border: '1px solid #E7E2DA', fontSize: 12 }}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={24}>
          <LabelList dataKey="total" position="top" style={{ fill: '#201B14', fontSize: 12 }} />
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.cor ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
