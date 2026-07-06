'use client'

export const REACTION_EMOJIS = ['❤️', '😂', '🔥', '😮', '😢', '👍']

export default function EmojiReactionBar({
  onPick,
  myReaction,
}: {
  onPick: (emoji: string) => void
  myReaction?: string | null
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px' }}>
      {REACTION_EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="tap-sm"
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none',
            background: myReaction === emoji ? 'var(--surface-3)' : 'transparent',
            fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}