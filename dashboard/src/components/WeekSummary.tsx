import type { CharacterVisit } from '../../../shared/src/types'

interface WeekSummaryProps {
  visits: CharacterVisit[]
}

const CHARACTER_EMOJI: Record<string, string> = {
  Pip: '🦊',
  Bramble: '🐻',
  Flint: '🐺',
  Luna: '🦉',
  Cleo: '🐰',
}

export function WeekSummary({ visits }: WeekSummaryProps) {
  const totalConversations = visits.reduce((sum, v) => sum + v.count, 0)
  const avgTone = visits.length > 0
    ? visits.reduce((sum, v) => sum + v.avgTone * v.count, 0) / totalConversations
    : 0

  const toneLabel =
    avgTone <= 1.5 ? 'Very light and playful' :
    avgTone <= 2.5 ? 'Mostly light' :
    avgTone <= 3.5 ? 'A balanced mix' :
    avgTone <= 4.5 ? 'Some heavier feelings' :
    'Very heavy this week'

  const toneColor =
    avgTone <= 2.5 ? 'text-green-400' :
    avgTone <= 3.5 ? 'text-yellow-400' :
    'text-rose-400'

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold text-purple-300 mb-4">This Week</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{totalConversations}</p>
          <p className="text-xs text-gray-400 mt-1">Conversations</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className={`text-sm font-semibold mt-1 ${toneColor}`}>{toneLabel}</p>
          <p className="text-xs text-gray-400 mt-1">Overall Tone</p>
          <p className="text-xs text-gray-600 mt-0.5">1 light → 5 heavy</p>
        </div>
      </div>

      <div className="space-y-2">
        {visits.map((v) => (
          <div key={v.character} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
            <span className="text-sm">
              {CHARACTER_EMOJI[v.character] ?? '🐾'} <span className="text-gray-200">{v.character}</span>
            </span>
            <span className="text-xs text-gray-400">{v.count} visit{v.count !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
