import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CHARACTER_COLORS: Record<string, string> = {
  Pip: '#e8904a',
  Bramble: '#6b8ec4',
  Flint: '#d06060',
  Luna: '#9b8ec4',
  Cleo: '#c4a830',
}

interface CharacterChartProps {
  visits: { character: string; count: number; avgTone: number }[]
}

export function CharacterChart({ visits }: CharacterChartProps) {
  const data = visits.map((v) => ({
    name: v.character,
    visits: v.count,
    avgTone: Number(v.avgTone.toFixed(1)),
  }))

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      border: '1.5px solid #e8ddd4',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '18px', fontWeight: '600', color: '#2d2318', marginBottom: '20px' }}>
        Companion Visits
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: '#9e8d80', fontSize: 12, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9e8d80', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
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
            cursor={{ fill: 'rgba(155,142,196,0.07)' }}
            formatter={(value: number, name: string, props: { payload?: { avgTone?: number } }) => {
              if (name === 'visits') {
                const tone = props.payload?.avgTone
                const toneStr = tone !== undefined ? ` · avg weight ${tone}/5` : ''
                return [`${value} visit${value !== 1 ? 's' : ''}${toneStr}`, 'Visits']
              }
              return [value, name]
            }}
          />
          <Bar dataKey="visits" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={CHARACTER_COLORS[entry.name] ?? '#9b8ec4'} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
