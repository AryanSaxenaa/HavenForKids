import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface ToneBreakdownProps {
  visits: { character: string; count: number; avgTone: number }[]
}

const CHARACTER_ZONE: Record<string, string> = {
  Pip: 'Worry',
  Bramble: 'Sadness',
  Flint: 'Anger',
  Luna: 'Loneliness',
  Cleo: 'Joy',
}

const CHARACTER_COLORS: Record<string, string> = {
  Pip: '#e8904a',
  Bramble: '#6b8ec4',
  Flint: '#d06060',
  Luna: '#9b8ec4',
  Cleo: '#c4a830',
}

export function ToneBreakdown({ visits }: ToneBreakdownProps) {
  const data = visits.map((v) => ({
    name: v.character,
    tone: Number(v.avgTone.toFixed(1)),
    zone: CHARACTER_ZONE[v.character] ?? '',
  }))

  const toneLabel = (score: number) => {
    if (score <= 1.5) return 'Very light'
    if (score <= 2.5) return 'Light'
    if (score <= 3.5) return 'Balanced'
    if (score <= 4.5) return 'Heavy'
    return 'Very heavy'
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      border: '1.5px solid #e8ddd4',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '18px', fontWeight: '600', color: '#2d2318', marginBottom: '6px' }}>
        Emotional Weight
      </h2>
      <p style={{ fontSize: '12px', color: '#9e8d80', marginBottom: '20px', lineHeight: 1.5 }}>
        Average emotional weight per companion (1 = very light, 5 = very heavy). The dashed line marks the midpoint.
      </p>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#9e8d80', fontSize: 12, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 5]} tick={{ fill: '#9e8d80', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1.5px solid #e8ddd4',
              borderRadius: '12px',
              color: '#2d2318',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              fontSize: '13px',
            }}
            formatter={(value: number, _name: string, props: { payload?: { zone?: string } }) => {
              const zone = props.payload?.zone ? ` (${props.payload.zone})` : ''
              return [`${value} — ${toneLabel(value)}${zone}`, 'Avg weight']
            }}
            cursor={{ fill: 'rgba(155,142,196,0.08)' }}
          />
          <ReferenceLine y={3} stroke="#e8ddd4" strokeDasharray="4 4" />
          <Bar dataKey="tone" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={CHARACTER_COLORS[entry.name] ?? '#9b8ec4'} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '14px', borderTop: '1px solid #f0eae0', paddingTop: '14px' }}>
        {data.map((entry) => (
          <span key={entry.name} style={{ fontSize: '12px', color: '#6b5d4f', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: CHARACTER_COLORS[entry.name] ?? '#9b8ec4', opacity: 0.85 }} />
            {entry.name} — {entry.zone}
          </span>
        ))}
      </div>
    </div>
  )
}
