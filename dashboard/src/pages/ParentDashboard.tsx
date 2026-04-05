import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, AlertCircle, AlertTriangle, Clock, MessageSquare, ShieldCheck } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'
import { WeekSummary } from '../components/WeekSummary'
import { CharacterChart } from '../components/CharacterChart'
import { ToneBreakdown } from '../components/ToneBreakdown'
import { WeeklyTrend } from '../components/WeeklyTrend'
import { Suggestion } from '../components/Suggestion'

function formatLastActive(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Render a 6-box family code input
function FamilyCodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const chars = value.toUpperCase().split('').slice(0, 6)
  while (chars.length < 6) chars.push('')

  const handleInput = (i: number, char: string) => {
    const arr = value.toUpperCase().split('').slice(0, 6)
    while (arr.length < 6) arr.push('')
    arr[i] = char.toUpperCase().slice(-1)
    onChange(arr.join('').replace(/ /g, ''))
    // focus next box
    const next = document.getElementById(`fc-${i + 1}`)
    if (char && next) (next as HTMLInputElement).focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const arr = value.toUpperCase().split('').slice(0, 6)
      while (arr.length < 6) arr.push('')
      arr[i] = ''
      onChange(arr.join('').trimEnd())
      if (i > 0) (document.getElementById(`fc-${i - 1}`) as HTMLInputElement)?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {chars.map((c, i) => (
        <input
          key={i}
          id={`fc-${i}`}
          type="text"
          maxLength={1}
          value={c}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-10 h-12 text-center text-xl font-bold font-mono rounded-xl border-2 border-purple-700 bg-gray-900 text-white uppercase focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
        />
      ))}
    </div>
  )
}

export function ParentDashboard() {
  const [inputCode, setInputCode] = useState('')
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const { data, status, error, childName, refetch } = useDashboardData(activeCode)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (code.length !== 6) return
    setActiveCode(code)
  }

  const distressFlags = (data as any)?.distressFlags as string[] | undefined
  const lastActive = (data as any)?.lastActive as number | null | undefined
  const totalMessages = (data as any)?.totalMessages as number | undefined
  const hasDistress = distressFlags && distressFlags.length > 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-purple-300 tracking-widest">HAVEN</h1>
            <p className="text-xs text-gray-500">Parent Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {childName && (
              <span className="text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                Viewing: <strong className="text-white">{childName}</strong>
              </span>
            )}
            {activeCode && (
              <button
                onClick={refetch}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Live
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Family code input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <label className="text-sm font-bold text-gray-300">Enter your Family Code</label>
            </div>
            <p className="text-xs text-gray-600">
              Your child received this 6-character code when they created their HAVEN account
            </p>
          </div>
          <FamilyCodeInput value={inputCode} onChange={setInputCode} />
          <button
            type="submit"
            disabled={inputCode.replace(/[^A-Z0-9]/g, '').length !== 6}
            className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
          >
            View My Child&apos;s Dashboard
          </button>
          <p className="text-xs text-gray-700 text-center">
            🔒 Only the holder of this code can view this child&apos;s activity
          </p>
        </form>

        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center py-12 text-gray-500 text-sm animate-pulse">
            Finding your child's activity...
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex items-start gap-3 bg-rose-950 border border-rose-800 rounded-xl p-4">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-rose-300 font-bold">
                {activeCode && !childName ? 'Family Code not found' : 'No activity yet'}
              </p>
              <p className="text-xs text-rose-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard data */}
        <AnimatePresence>
          {status === 'success' && data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* ── Stats bar ── */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>Last active: <strong className="text-gray-200">{formatLastActive(lastActive ?? null)}</strong></span>
                </div>
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400">
                  <MessageSquare className="w-3 h-3 text-purple-400" />
                  <span>Messages sent: <strong className="text-gray-200">{totalMessages ?? 0}</strong></span>
                </div>
              </div>

              {/* ── Distress alert ── */}
              {hasDistress && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 bg-amber-950 border border-amber-600 rounded-xl p-4"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-300">⚠️ Attention may be needed</p>
                    <p className="text-xs text-amber-400 mt-1">
                      Some messages from {childName} contained words that may signal distress.
                      Consider checking in with them in person today.
                    </p>
                    <p className="text-xs text-amber-600 mt-2 italic">
                      Keywords detected: {distressFlags!.join(', ')}
                    </p>
                  </div>
                </motion.div>
              )}

              {data.characterVisits.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <p className="text-4xl">🌿</p>
                  <p className="text-gray-400 font-bold">No conversations yet</p>
                  <p className="text-gray-600 text-sm">
                    Once {childName} chats with a companion in HAVEN, their activity will appear here — automatically and in real time.
                  </p>
                </div>
              ) : (
                <>
                  <WeekSummary visits={data.characterVisits} />
                  <CharacterChart visits={data.characterVisits} />
                  <ToneBreakdown visits={data.characterVisits} />
                  {data.weeklyTrend.length > 0 && (
                    <WeeklyTrend entries={data.weeklyTrend} />
                  )}
                  <Suggestion text={data.suggestion} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16 px-6 py-4 text-center space-y-1">
        <p className="text-xs text-gray-600">
          HAVEN stores conversation patterns and message text to generate these insights.
        </p>
        <p className="text-xs text-gray-700">
          All data is held securely in your private Convex project and is never shared with third parties.
        </p>
      </footer>
    </div>
  )
}
