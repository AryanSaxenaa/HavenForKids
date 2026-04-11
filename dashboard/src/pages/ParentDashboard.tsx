import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

function FamilyCodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const chars = value.toUpperCase().split('').slice(0, 6)
  while (chars.length < 6) chars.push('')

  const handleInput = (i: number, char: string) => {
    const arr = value.toUpperCase().split('').slice(0, 6)
    while (arr.length < 6) arr.push('')
    arr[i] = char.toUpperCase().slice(-1)
    onChange(arr.join('').replace(/ /g, ''))
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
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
      {chars.map((c, i) => (
        <input
          key={i}
          id={`fc-${i}`}
          type="text"
          maxLength={1}
          value={c}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          style={{
            width: '48px',
            height: '56px',
            textAlign: 'center',
            fontSize: '22px',
            fontWeight: '700',
            fontFamily: 'Inter, monospace',
            textTransform: 'uppercase',
            border: c ? '2px solid #7da87b' : '2px solid #e8ddd4',
            borderRadius: '14px',
            background: c ? '#f4fbf4' : '#ffffff',
            color: '#2d2318',
            outline: 'none',
            boxShadow: c ? '0 0 0 3px rgba(125,168,123,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#7da87b'
            e.target.style.boxShadow = '0 0 0 3px rgba(125,168,123,0.2)'
          }}
          onBlur={(e) => {
            if (!e.target.value) {
              e.target.style.borderColor = '#e8ddd4'
              e.target.style.boxShadow = 'none'
            }
          }}
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
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1.5px solid #e8ddd4',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#2d2318', letterSpacing: '-0.3px' }}>HAVEN</div>
            <div style={{ fontSize: '11px', color: '#9e8d80', marginTop: '-2px' }}>Family Dashboard</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {childName && (
              <span style={{
                fontSize: '12px', color: '#6b5d4f', fontWeight: '500',
                background: '#f0edf9', border: '1.5px solid #c5bce8',
                borderRadius: '50px', padding: '5px 14px',
              }}>
                Viewing <strong style={{ color: '#2d2318' }}>{childName}</strong>
              </span>
            )}
            {activeCode && (
              <button
                onClick={refetch}
                style={{
                  background: 'none', border: '1.5px solid #e8ddd4', cursor: 'pointer',
                  fontSize: '12px', color: '#9e8d80', padding: '5px 12px', borderRadius: '8px',
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#2d2318')}
                onMouseOut={e => (e.currentTarget.style.color = '#9e8d80')}
              >
                Refresh
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Hero entry card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'linear-gradient(135deg, #f0f9f0 0%, #f0edf9 50%, #fef0e6 100%)',
            border: '1.5px solid #e8ddd4',
            borderRadius: '24px',
            padding: '40px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '26px', fontWeight: '600', color: '#2d2318', marginBottom: '8px', lineHeight: 1.3 }}>
            Welcome, caring grown-up
          </h1>
          <p style={{ fontSize: '14px', color: '#6b5d4f', marginBottom: '32px', maxWidth: '380px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Enter the Family Code your child received when they joined HAVEN to see how they&apos;ve been doing.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b5d4f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Family Code
            </span>
            <FamilyCodeInput value={inputCode} onChange={setInputCode} />
            <button
              type="submit"
              disabled={inputCode.replace(/[^A-Z0-9]/g, '').length !== 6}
              style={{
                marginTop: '4px',
                padding: '13px 32px',
                background: 'linear-gradient(135deg, #7da87b, #5a8c58)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: inputCode.replace(/[^A-Z0-9]/g, '').length !== 6 ? 'not-allowed' : 'pointer',
                opacity: inputCode.replace(/[^A-Z0-9]/g, '').length !== 6 ? 0.45 : 1,
                boxShadow: '0 4px 16px rgba(125,168,123,0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              View My Child&apos;s Activity
            </button>
            <p style={{ fontSize: '11px', color: '#b0a090' }}>
              Only the holder of this code can view this child&apos;s activity
            </p>
          </form>
        </motion.div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9e8d80', fontSize: '14px' }}>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              Looking for {childName || 'your child'}&apos;s activity...
            </motion.div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#fde8e8', border: '1.5px solid #f4c0c0',
              borderRadius: '16px', padding: '18px 20px',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#c05050', marginBottom: '4px' }}>
              {activeCode && !childName ? 'Family Code not found' : 'Nothing here yet'}
            </p>
            <p style={{ fontSize: '13px', color: '#b06060' }}>{error}</p>
          </motion.div>
        )}

        {/* Dashboard data */}
        <AnimatePresence>
          {status === 'success' && data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Stats */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{
                  background: '#ffffff', border: '1.5px solid #e8ddd4', borderRadius: '50px',
                  padding: '8px 16px', fontSize: '13px', color: '#6b5d4f',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  Last active: <strong style={{ color: '#2d2318' }}>{formatLastActive(lastActive ?? null)}</strong>
                </div>
                <div style={{
                  background: '#ffffff', border: '1.5px solid #e8ddd4', borderRadius: '50px',
                  padding: '8px 16px', fontSize: '13px', color: '#6b5d4f',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  Messages: <strong style={{ color: '#2d2318' }}>{totalMessages ?? 0}</strong>
                </div>
              </div>

              {/* Distress alert */}
              {hasDistress && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: '#fef3e2', border: '1.5px solid #f0c070',
                    borderRadius: '20px', padding: '20px 22px',
                    boxShadow: '0 2px 12px rgba(212,137,42,0.1)',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#8a5010', marginBottom: '6px' }}>
                    A gentle heads up
                  </p>
                  <p style={{ fontSize: '13px', color: '#7a6030', lineHeight: 1.6 }}>
                    Some of {childName}&apos;s recent messages contained words that may signal they&apos;re going through something difficult. A warm check-in today could mean a lot.
                  </p>
                  <p style={{ fontSize: '11px', color: '#b09050', marginTop: '8px', fontStyle: 'italic' }}>
                    Words noticed: {distressFlags!.join(', ')}
                  </p>
                </motion.div>
              )}

              {/* Empty state */}
              {data.characterVisits.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    textAlign: 'center', padding: '60px 24px',
                    background: 'white', borderRadius: '24px',
                    border: '1.5px solid #e8ddd4',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  <p style={{ fontFamily: 'Lora, serif', fontSize: '18px', fontWeight: '600', color: '#2d2318', marginBottom: '10px' }}>
                    The journey is just beginning
                  </p>
                  <p style={{ fontSize: '13px', color: '#9e8d80', maxWidth: '300px', margin: '0 auto', lineHeight: 1.7 }}>
                    Once {childName} starts chatting with a companion in HAVEN, their activity will appear here automatically.
                  </p>
                </motion.div>
              ) : (
                <>
                  <WeekSummary visits={data.characterVisits} />
                  <CharacterChart visits={data.characterVisits} />
                  <ToneBreakdown visits={data.characterVisits} />
                  {data.weeklyTrend.length > 0 && <WeeklyTrend entries={data.weeklyTrend} />}
                  <Suggestion text={data.suggestion} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #e8ddd4', padding: '24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', color: '#9e8d80', fontWeight: '500', marginBottom: '4px' }}>HAVEN</p>
          <p style={{ fontSize: '11px', color: '#b0a090' }}>
            Conversation patterns are stored to generate these insights. Text is held securely and never shared with third parties.
          </p>
        </div>
      </footer>
    </div>
  )
}
