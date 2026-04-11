import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WeeklyTrendProps {
  entries: { week: string; character: string; count: number }[]
}

const CHARACTER_COLORS: Record<string, string> = {
  Pip: '#e8904a',
  Bramble: '#6b8ec4',
  Flint: '#d06060',
  Luna: '#9b8ec4',
  Cleo: '#c4a830',
}

export function WeeklyTrend({ entries }: WeeklyTrendProps) {
  if (entries.length === 0) return null

  const weekMap = new Map<string, Record<string, string | number>>()
  for (const entry of entries) {
    if (!weekMap.has(entry.week)) weekMap.set(entry.week, { week: entry.week })
    weekMap.get(entry.week)![entry.character] = entry.count
  }

  const data = Array.from(weekMap.values()).sort((a, b) =>
    String(a['week']).localeCompare(String(b['week'])),
  )

  const visible = data.slice(-8)
  const characters = [...new Set(entries.map((e) => e.character))]

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      border: '1.5px solid #e8ddd4',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '18px', fontWeight: '600', color: '#2d2318', marginBottom: '6px' }}>
        Visits Over Time
      </h2>
      <p style={{ fontSize: '12px', color: '#9e8d80', marginBottom: '20px' }}>
        Number of conversations per companion, by week.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={visible} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: '#9e8d80', fontSize: 11, fontFamily: 'Inter' }}
            tickFormatter={(v: string) => v.replace(/^\d{4}-/, '')}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#9e8d80', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1.5px solid #e8ddd4',
              borderRadius: '12px',
              color: '#2d2318',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              fontSize: '13px',
            }}
            labelFormatter={(v: string) => `Week ${v.replace(/^\d{4}-W/, '')}`}
            cursor={{ stroke: 'rgba(155,142,196,0.2)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#6b5d4f', paddingTop: '8px' }}
          />
          {characters.map((char) => (
            <Line
              key={char}
              type="monotone"
              dataKey={char}
              stroke={CHARACTER_COLORS[char] ?? '#9b8ec4'}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
