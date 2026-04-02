import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface SuggestionProps {
  text: string
}

export function Suggestion({ text }: SuggestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="bg-purple-950 border border-purple-800 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-bold text-purple-300">Gentle Suggestion</h2>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
      <p className="text-xs text-gray-600 mt-4">
        Generated from visit patterns only — no conversation text is ever stored or shared.
      </p>
    </motion.div>
  )
}
