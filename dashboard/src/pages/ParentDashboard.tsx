import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'
import { WeekSummary } from '../components/WeekSummary'
import { CharacterChart } from '../components/CharacterChart'
import { ToneBreakdown } from '../components/ToneBreakdown'
import { WeeklyTrend } from '../components/WeeklyTrend'
import { Suggestion } from '../components/Suggestion'

export function ParentDashboard() {
  const [inputId, setInputId] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data, status, error, refetch } = useDashboardData(activeId)

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputId.trim()
    if (!trimmed) return
    if (!UUID_RE.test(trimmed)) {
      setInputError('That doesn\'t look like a valid session ID — it should look like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
      return
    }
    setInputError(null)
    setActiveId(trimmed)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-purple-300 tracking-widest">HAVEN</h1>
            <p className="text-xs text-gray-500">Parent Dashboard</p>
          </div>
          {activeId && (
            <button
              onClick={refetch}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Session ID input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm text-gray-400">
            Enter your child&apos;s session ID
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputId}
              onChange={(e) => { setInputId(e.target.value); setInputError(null) }}
              placeholder="e.g. 3f2a9b1c-..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={!inputId.trim()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              View
            </button>
          </div>
          {inputError ? (
            <p className="text-xs text-rose-400">{inputError}</p>
          ) : (
            <p className="text-xs text-gray-600">
              The session ID was shown at the end of setup on your child&apos;s device — tap &quot;Copy ID&quot; to save it.
            </p>
          )}
        </form>

        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex items-start gap-3 bg-rose-950 border border-rose-800 rounded-xl p-4">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
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
              {data.characterVisits.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No conversations yet. Check back after your child has visited Haven.
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

      {/* Privacy footer */}
      <footer className="border-t border-gray-800 mt-16 px-6 py-4 text-center">
        <p className="text-xs text-gray-600">
          HAVEN never stores conversation text. This dashboard shows patterns only — no words, ever.
        </p>
      </footer>
    </div>
  )
}
