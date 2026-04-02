import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createSession } from '../api/client'
import { saveSession } from '../store/session'
import type { Character } from '../../../shared/src/types'

interface OnboardingOverlayProps {
  onComplete: () => void
}

const CHARACTERS: Array<{ name: Character; emoji: string; color: string }> = [
  { name: 'Pip',     emoji: '🦊', color: '#FF8C42' },
  { name: 'Bramble', emoji: '🐻', color: '#6B8CBA' },
  { name: 'Flint',   emoji: '🐺', color: '#C0392B' },
  { name: 'Luna',    emoji: '🦉', color: '#9B59B6' },
  { name: 'Cleo',    emoji: '🐰', color: '#F1C40F' },
]

type Step = 0 | 1 | 2 | 3

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState(9)
  const [character, setCharacter] = useState<Character>('Cleo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const submittingRef = useRef(false)   // prevents double-fire on fast taps

  async function handleComplete() {
    if (!name.trim() || submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const { sessionId: newId } = await createSession({
        childName: name.trim(),
        age,
        preferredCharacter: character,
      })
      saveSession({ sessionId: newId, childName: name.trim(), age, preferredCharacter: character })
      setSessionId(newId)
      setStep(3)  // show session-ID screen
    } catch {
      setError('Something went wrong. Please try again.')
      submittingRef.current = false  // allow retry
    } finally {
      setLoading(false)
    }
  }

  function handleCopyId() {
    if (!sessionId) return
    void navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const stepContent = [
    // Step 0: Name
    <motion.div key="step-0" {...stepAnim}>
      <div style={stepStyle}>
      <p style={labelStyle}>What&apos;s your name?</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder="Your first name"
        maxLength={20}
        style={inputStyle}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(1)}
      />
      <button
        style={{ ...btnStyle, opacity: name.trim() ? 1 : 0.5 }}
        disabled={!name.trim()}
        onClick={() => setStep(1)}
      >
        Next →
      </button>
      </div>
    </motion.div>,

    // Step 1: Age
    <motion.div key="step-1" {...stepAnim}>
      <div style={stepStyle}>
      <p style={labelStyle}>How old are you?</p>
      <p style={{ fontFamily: 'monospace', fontSize: '40px', color: '#6b21a8', margin: '16px 0' }}>{age}</p>
      <input
        type="range"
        min={7}
        max={12}
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
        style={{ width: '200px', accentColor: '#7c6af5' }}
      />
      <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888', marginTop: '8px' }}>ages 7 to 12</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }} onClick={() => setStep(0)}>← Back</button>
        <button style={btnStyle} onClick={() => setStep(2)}>Next →</button>
      </div>
      </div>
    </motion.div>,

    // Step 2: Character
    <motion.div key="step-2" {...stepAnim}>
      <div style={stepStyle}>
      <p style={labelStyle}>Who do you want to meet first?</p>
      <div style={{ display: 'flex', gap: '12px', margin: '24px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
        {CHARACTERS.map((c) => (
          <button
            key={c.name}
            onClick={() => setCharacter(c.name)}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              border: `3px solid ${character === c.name ? c.color : '#e5e7eb'}`,
              background: character === c.name ? `${c.color}22` : '#fff',
              fontSize: '32px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            {c.emoji}
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#2d2d2d' }}>{c.name}</span>
          </button>
        ))}
      </div>
      {error && <p style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: '12px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }} onClick={() => setStep(1)}>← Back</button>
        <button style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleComplete}>
          {loading ? 'Starting...' : 'Enter Haven ✨'}
        </button>
      </div>
      </div>
    </motion.div>,

    // Step 3: Session ID — shown to parent before child enters
    <motion.div key="step-3" {...stepAnim}>
      <div style={stepStyle}>
      <p style={{ ...labelStyle, fontSize: '16px' }}>One thing for the grown-up 👋</p>
      <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a0a0c0', textAlign: 'center', marginBottom: '16px', lineHeight: 1.6 }}>
        Save this ID — you&apos;ll need it to see your child&apos;s weekly report on the Parent Dashboard.
      </p>
      <div
        style={{
          background: '#0f0f2a',
          border: '2px solid #7c6af5',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '8px',
          width: '100%',
          maxWidth: '320px',
          wordBreak: 'break-all',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#c4b5fd',
          textAlign: 'center',
          letterSpacing: '0.5px',
        }}
      >
        {sessionId}
      </div>
      <button
        onClick={handleCopyId}
        style={{ ...btnStyle, background: copied ? '#16a34a' : '#374151', marginBottom: '24px', fontSize: '12px', padding: '8px 20px' }}
      >
        {copied ? '✓ Copied!' : 'Copy ID'}
      </button>
      <button style={btnStyle} onClick={onComplete}>
        Enter Haven ✨
      </button>
      </div>
    </motion.div>,
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
      }}
    >
      {/* Logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ textAlign: 'center', marginBottom: '40px' }}
      >
        <h1 style={{ fontFamily: 'monospace', fontSize: '36px', color: '#c4b5fd', letterSpacing: '8px' }}>
          HAVEN
        </h1>
        <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#7c6af5', marginTop: '4px' }}>
          a village that listens
        </p>
      </motion.div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i === step ? '#7c6af5' : '#374151',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: '360px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {stepContent[step]}
        </AnimatePresence>
      </div>
    </div>
  )
}

const stepAnim = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.25 },
} as const

const stepStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  padding: '0 24px',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '20px',
  color: '#e2e8f0',
  marginBottom: '16px',
  textAlign: 'center',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '240px',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '2px solid #7c6af5',
  background: '#1e1e3f',
  color: '#e2e8f0',
  fontFamily: 'monospace',
  fontSize: '16px',
  outline: 'none',
  marginBottom: '16px',
  textAlign: 'center',
}

const btnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#7c6af5',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontFamily: 'monospace',
  fontSize: '14px',
  cursor: 'pointer',
}
