import { motion } from 'framer-motion'

interface SuggestionProps {
  text: string
}

export function Suggestion({ text }: SuggestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      style={{
        background: 'linear-gradient(135deg, #f0edf9, #e8f4e8)',
        border: '1.5px solid #c5bce8',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(155,142,196,0.12)',
      }}
    >
      <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '16px', fontWeight: '600', color: '#2d2318', marginBottom: '14px' }}>
        A gentle suggestion
      </h2>
      <p style={{ fontSize: '14px', color: '#4a3d30', lineHeight: 1.75, fontFamily: 'Lora, Georgia, serif', fontStyle: 'italic' }}>
        &ldquo;{text}&rdquo;
      </p>
      <p style={{ fontSize: '11px', color: '#9e8d80', marginTop: '16px', borderTop: '1px solid #ddd6f0', paddingTop: '12px' }}>
        Generated from visit patterns only. No conversation text is stored or shared.
      </p>
    </motion.div>
  )
}
