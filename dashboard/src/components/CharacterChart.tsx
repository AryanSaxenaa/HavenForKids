import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { CharacterVisit } from '../../../shared/src/types'

const CHARACTER_COLORS: Record<string, string> = {
  Pip:     '#FF8C42',
  Bramble: '#6B8CBA',
  Flint:   '#C0392B',
  Luna:    '#9B59B6',
  Cleo:    '#F1C40F',
}

interface CharacterChartProps {
  visits: CharacterVisit[]
}

export function CharacterChart({ visits }: CharacterChartProps) {
  const data = visits.map((v) => ({
    name: v.character,
    visits: v.count,
    avgTone: Number(v.avgTone.toFixed(1)),
  }))

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold text-purple-300 mb-4">Character Visits</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
            cursor={{ fill: 'rgba(124,106,245,0.1)' }}
            formatter={(value: number, name: string, props: { payload?: { avgTone?: number } }) => {
              if (name === 'visits') {
                const tone = props.payload?.avgTone
                const toneStr = tone !== undefined ? ` · avg tone ${tone}/5` : ''
                return [`${value} visit${value !== 1 ? 's' : ''}${toneStr}`, 'Visits']
              }
              return [value, name]
            }}
          />
          <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={CHARACTER_COLORS[entry.name] ?? '#7c6af5'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
