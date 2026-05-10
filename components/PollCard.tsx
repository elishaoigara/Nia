'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PollOption {
  id: string
  text: string
  votes: number
}

interface Poll {
  id: string
  post_id: string
  question: string
  options: PollOption[]
  total_votes: number
  user_vote: string | null // option_id the current user voted for
  ends_at: string
}

export default function PollCard({ poll, currentUserId, onVoted }: { poll: Poll; currentUserId: string; onVoted?: () => void }) {
  const supabase = createClient()
  const [localPoll, setLocalPoll] = useState(poll)
  const [voting, setVoting] = useState(false)
  const isExpired = new Date(poll.ends_at) < new Date()

  async function vote(optionId: string) {
    if (localPoll.user_vote || voting || isExpired) return
    setVoting(true)
    await supabase.from('poll_votes').insert({ poll_id: poll.id, option_id: optionId, user_id: currentUserId })
    // Optimistic update
    setLocalPoll(prev => ({
      ...prev,
      user_vote: optionId,
      total_votes: prev.total_votes + 1,
      options: prev.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o),
    }))
    setVoting(false)
    onVoted?.()
  }

  const showResults = !!localPoll.user_vote || isExpired
  const maxVotes = Math.max(...localPoll.options.map(o => o.votes), 1)

  const timeLeft = () => {
    const diff = new Date(poll.ends_at).getTime() - Date.now()
    if (diff <= 0) return 'Ended'
    const h = Math.floor(diff / 3600000)
    if (h > 24) return `${Math.floor(h / 24)}d left`
    if (h > 0) return `${h}h left`
    return `${Math.floor(diff / 60000)}m left`
  }

  return (
    <div className="mx-4 mb-3 space-y-2">
      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>📊 {localPoll.question}</p>

      <div className="space-y-2">
        {localPoll.options.map(option => {
          const pct = localPoll.total_votes > 0 ? Math.round((option.votes / localPoll.total_votes) * 100) : 0
          const isWinner = showResults && option.votes === maxVotes && option.votes > 0
          const isVoted = localPoll.user_vote === option.id

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={showResults || voting}
              className="w-full text-left relative overflow-hidden rounded-2xl transition-all active:scale-[0.98]"
              style={{
                border: isVoted ? '2px solid var(--nia-violet)' : '2px solid var(--border)',
                background: 'var(--surface-1)',
              }}
            >
              {/* Progress fill */}
              {showResults && (
                <div
                  className="absolute inset-0 rounded-[14px] transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isWinner
                      ? 'linear-gradient(90deg,rgba(168,85,247,0.15),rgba(255,107,107,0.1))'
                      : 'var(--surface-2)',
                  }}
                />
              )}
              <div className="relative flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold" style={{ color: isVoted ? 'var(--nia-violet)' : 'var(--text-primary)' }}>
                  {isVoted && '✓ '}{option.text}
                </span>
                {showResults && (
                  <span className="text-sm font-extrabold" style={{ color: isWinner ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {localPoll.total_votes} vote{localPoll.total_votes !== 1 ? 's' : ''}
        </span>
        <span className="text-xs font-semibold" style={{ color: isExpired ? '#ef4444' : 'var(--text-tertiary)' }}>
          {timeLeft()}
        </span>
      </div>
    </div>
  )
}
