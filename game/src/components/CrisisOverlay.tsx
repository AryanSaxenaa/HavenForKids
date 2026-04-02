import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

interface CrisisOverlayProps {
  onDismiss: () => void
}

export function CrisisOverlay({ onDismiss }: CrisisOverlayProps) {
  // Block Escape key from dismissing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  function handleImOkay() {
    // VillageScene has already been resumed by ConversationScene's crisis path.
    // Just dismiss the overlay so the child can continue in the village.
    onDismiss()
  }

  function handleGetHelp() {
    window.open('https://www.childline.org.uk', '_blank', 'noopener,noreferrer')
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#fff1f2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        pointerEvents: 'all',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-heading"
    >
      <div
        aria-live="assertive"
        style={{ maxWidth: '480px', textAlign: 'center' }}
      >
        {/* Soft heart icon */}
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🌿</div>

        <h1
          id="crisis-heading"
          style={{
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#4a2040',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          It sounds like things are really hard right now.
        </h1>

        <p
          style={{
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#5c3060',
            marginBottom: '32px',
            lineHeight: 1.7,
          }}
        >
          You are not alone and you are safe.
        </p>

        <div
          style={{
            background: '#f0e4ff',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '32px',
          }}
        >
          <p style={{ fontFamily: 'monospace', fontSize: '14px', color: '#4a2040', margin: 0 }}>
            You can call Childline any time, day or night — it&apos;s free.
          </p>
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#6b21a8',
              margin: '8px 0 0',
            }}
          >
            0800 1111
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={handleImOkay}
            style={{
              padding: '12px 24px',
              background: '#e0f2fe',
              border: '2px solid #7c6af5',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#2d2d2d',
              cursor: 'pointer',
            }}
          >
            Go back to Haven
          </button>

          <button
            onClick={handleGetHelp}
            style={{
              padding: '12px 24px',
              background: '#6b21a8',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Get help
          </button>
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}
