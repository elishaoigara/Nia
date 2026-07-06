'use client'

import { Reply, Pencil, Trash2, Flag, Copy, X } from 'lucide-react'
import EmojiReactionBar from './EmojiReactionBar'

type Props = {
  isOwn: boolean
  hasText: boolean
  myReaction?: string | null
  onClose: () => void
  onReact: (emoji: string) => void
  onReply: () => void
  onCopy?: () => void
  onEdit?: () => void
  onUnsend?: () => void
  onReport?: () => void
}

export default function MessageActionSheet({
  isOwn, hasText, myReaction, onClose,
  onReact, onReply, onCopy, onEdit, onUnsend, onReport,
}: Props) {
  const actions = [
    { key: 'reply', label: 'Reply', icon: Reply, onClick: onReply, show: true, danger: false },
    { key: 'copy', label: 'Copy', icon: Copy, onClick: onCopy, show: hasText, danger: false },
    { key: 'edit', label: 'Edit', icon: Pencil, onClick: onEdit, show: isOwn && hasText, danger: false },
    { key: 'unsend', label: 'Unsend', icon: Trash2, onClick: onUnsend, show: isOwn, danger: true },
    { key: 'report', label: 'Report', icon: Flag, onClick: onReport, show: !isOwn, danger: true },
  ].filter(a => a.show)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--surface-1)',
          borderRadius: '20px 20px 0 0',
          padding: '10px 14px calc(14px + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp 0.16s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="tap-sm"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'var(--surface-3)', color: 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <EmojiReactionBar onPick={emoji => { onReact(emoji); onClose() }} myReaction={myReaction} />

        <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0 6px' }} />

        {actions.map(({ key, label, icon: Icon, onClick, danger }) => (
          <button
            key={key}
            onClick={() => { onClick?.(); onClose() }}
            className="tap-sm"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 8px', border: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              color: danger ? 'var(--nia-coral)' : 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}