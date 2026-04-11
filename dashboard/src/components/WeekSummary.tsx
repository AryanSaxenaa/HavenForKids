interface WeekSummaryProps {
  visits: { character: string; count: number; avgTone: number }[]
}

export function WeekSummary({ visits }: WeekSummaryProps) {
  const totalConversations = visits.reduce((sum, v) => sum + v.count, 0)
  const avgTone = visits.length > 0
    ? visits.reduce((sum, v) => sum + v.avgTone * v.count, 0) / totalConversations
    : 0

  const toneLabel =
    avgTone <= 1.5 ? 'Bright and playful' :
      avgTone <= 2.5 ? 'Mostly light-hearted' :
        avgTone <= 3.5 ? 'A thoughtful mix' :
          avgTone <= 4.5 ? 'Some heavy feelings' :
            'A difficult week'

  const toneColor =
    avgTone <= 2.5 ? '#5a8c58' :
      avgTone <= 3.5 ? '#c08020' :
        '#c05050'

  const toneBg =
    avgTone <= 2.5 ? '#f0f9f0' :
      avgTone <= 3.5 ? '#fef8e2' :
        '#fde8e8'

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      border: '1.5px solid #e8ddd4',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '18px', fontWeight: '600', color: '#2d2318', marginBottom: '20px' }}>
        Activity This Week
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#f0f9f0', borderRadius: '14px', padding: '16px', textAlign: 'center', border: '1.5px solid #c8e8c6' }}>
          <p style={{ fontSize: '36px', fontWeight: '800', color: '#5a8c58', lineHeight: 1 }}>{totalConversations}</p>
          <p style={{ fontSize: '12px', color: '#7da87b', marginTop: '4px', fontWeight: '500' }}>Conversations</p>
        </div>
        <div style={{ background: toneBg, borderRadius: '14px', padding: '16px', textAlign: 'center', border: `1.5px solid ${toneColor}30` }}>
          <p style={{ fontSize: '15px', fontWeight: '700', color: toneColor, lineHeight: 1.2 }}>{toneLabel}</p>
          <p style={{ fontSize: '11px', color: '#9e8d80', marginTop: '6px' }}>Overall emotional tone</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visits.map((v) => (
          <div key={v.character} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#fafaf7', borderRadius: '12px', padding: '10px 14px',
            border: '1.5px solid #e8ddd4',
          }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2d2318' }}>{v.character}</span>
            <span style={{
              fontSize: '12px', color: '#6b5d4f', fontWeight: '600',
              background: 'white', padding: '3px 10px', borderRadius: '50px',
              border: '1.5px solid #e8ddd4',
            }}>
              {v.count} visit{v.count !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
