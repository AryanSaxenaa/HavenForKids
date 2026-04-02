import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { CharacterVisit } from '../../../shared/src/types'

interface ToneBreakdownProps {
  visits: CharacterVisit[]
}

const CHARACTER_ZONE: Record<string, string> = {
  Pip:     'Worry',
  Bramble: 'Sadness',
  Flint:   'Anger',
  Luna:    'Loneliness',
  Cleo:    'Joy',
}

const CHARACTER_COLORS: Record<string, string> = {
  Pip:     '#FF8C42',
  Bramble: '#6B8CBA',
  Flint:   '#C0392B',
  Luna:    '#9B59B6',
  Cleo:    '#F1C40F',
}

export function ToneBreakdown({ visits }: ToneBreakdownProps) {
  const data = visits.map((v) => ({
    name: v.character,
    tone: Number(v.avgTone.toFixed(1)),
    zone: CHARACTER_ZONE[v.character] ?? '',
  }))

  const toneDescription = (score: number) => {
    if (score <= 1.5) return 'Very light'
    if (score <= 2.5) return 'Light'
    if (score <= 3.5) return 'Balanced'
    if (score <= 4.5) return 'Heavy'
    return 'Very heavy'
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold text-purple-300 mb-2">Emotional Weight</h2>
      <p className="text-xs text-gray-500 mb-4">
        Average tone per character (1 = very light, 5 = very heavy). Dashed line = balanced midpoint.
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
            formatter={(value: number, _name: string, props: { payload?: { zone?: string } }) => {
              const zone = props.payload?.zone ? ` (${props.payload.zone})` : ''
              return [`${value} — ${toneDescription(value)}${zone}`, 'Avg tone']
            }}
            cursor={{ fill: 'rgba(124,106,245,0.1)' }}
          />
          <ReferenceLine y={3} stroke="#4b5563" strokeDasharray="3 3" />
          <Bar dataKey="tone" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={CHARACTER_COLORS[entry.name] ?? '#7c6af5'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Character legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {data.map((entry) => (
          <span key={entry.name} className="text-xs text-gray-500">
            <span style={{ color: CHARACTER_COLORS[entry.name] ?? '#7c6af5' }}>■</span>{' '}
            {entry.name} = {entry.zone}
          </span>
        ))}
      </div>
    </div>
  )
}
