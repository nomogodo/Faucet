import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type PortfolioPoint = { time: string; value: number }

export default function PortfolioChart({ data }: { data: PortfolioPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6eafff" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#6eafff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ffffff0c" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#85877f', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={10} />
        <YAxis hide domain={['dataMin - 300', 'dataMax + 200']} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#85877f55', strokeDasharray: '3 4' }} />
        <Area type="monotone" dataKey="value" stroke="#6eafff" strokeWidth={2} fill="url(#portfolioFill)" activeDot={{ r: 4, fill: '#6eafff', stroke: '#101a2a', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span>{label}</span><strong>${payload[0].value.toLocaleString('en-US')}</strong></div>
}