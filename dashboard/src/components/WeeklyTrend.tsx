import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { WeeklyEntry } from '../../../shared/src/types'

interface WeeklyTrendProps {
  entries: WeeklyEntry[]
}

const CHARACTER_COLORS: Record<string, string> = {
  Pip:     '#FF8C42',
  Bramble: '#6B8CBA',
  Flint:   '#C0392B',
  Luna:    '#9B59B6',
  Cleo:    '#F1C40F',
}

export function WeeklyTrend({ entries }: WeeklyTrendProps) {
  if (entries.length === 0) return null

  // Build a map of week → { week, Pip: n, Bramble: n, ... }
  const weekMap = new Map<string, Record<string, string | number>>()
  for (const entry of entries) {
    if (!weekMap.has(entry.week)) weekMap.set(entry.week, { week: entry.week })
    weekMap.get(entry.week)![entry.character] = entry.count
  }

  // Sort weeks ascending
  const data = Array.from(weekMap.values()).sort((a, b) =>
    String(a['week']).localeCompare(String(b['week'])),
  )

  // Only show weeks that have data; limit to last 8 weeks
  const visible = data.slice(-8)

  // Which characters appear in this data?
  const characters = [...new Set(entries.map((e) => e.character))]

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold text-purple-300 mb-2">Visits Over Time</h2>
      <p className="text-xs text-gray-500 mb-4">
        Number of conversations per character, by week.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={visible} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v: string) => v.replace(/^\d{4}-/, '')}  // show "W08" not "2026-W08"
          />
          <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
            labelFormatter={(v: string) => `Week ${v.replace(/^\d{4}-W/, '')}`}
            cursor={{ stroke: 'rgba(124,106,245,0.3)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '8px' }}
          />
          {characters.map((char) => (
            <Line
              key={char}
              type="monotone"
              dataKey={char}
              stroke={CHARACTER_COLORS[char] ?? '#7c6af5'}
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
