'use client'

import { useState, useEffect } from 'react'
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
  user_vote: string | null
  ends_at: string
}

interface PollCardProps {
  poll: Poll
  currentUserId: string
  onVoted?: () => void
}

export default function PollCard({ poll, currentUserId, onVoted }: PollCardProps) {
  const supabase = createClient()
  const [localPoll, setLocalPoll] = useState(poll)
  const [voting, setVoting] = useState(false)
  
  const isExpired = new Date(poll.ends_at) < new Date()

  // Sync state if incoming server component props or feed arrays shift
  useEffect(() => {
    setLocalPoll(poll)
  }, [poll])

  async function vote(optionId: string) {
    if (localPoll.user_vote || voting || isExpired) return
    setVoting(true)
    
    try {
      await supabase.from('poll_votes').insert({ 
        poll_id: poll.id, 
        option_id: optionId, 
        user_id: currentUserId 
      })

      // Optimistic layout mutation handler
      setLocalPoll(prev => ({
        ...prev,
        user_vote: optionId,
        total_votes: prev.total_votes + 1,
        options: prev.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o),
      }))
      
      onVoted?.()
    } catch (err) {
      console.error('Failed to submit vote:', err)
    } finally {
      setVoting(false)
    }
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
    <div className="mx-4 mb-3 space-y-2 select-none">
      <p className="font-bold text-sm text-(--text-primary)">
        📊 {localPoll.question}
      </p>

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
              className="w-full text-left relative overflow-hidden rounded-2xl transition-all active:scale-[0.99] border-2 disabled:active:scale-100 bg-(--surface-1)"
              style={{
                borderColor: isVoted ? 'var(--nia-violet)' : 'var(--border)',
              }}
            >
              {/* Progress fill — background variables clean-up */}
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: isWinner
                      ? 'linear-gradient(90deg, rgba(168,85,247,0.15), rgba(255,107,107,0.1))'
                      : 'var(--surface-2)',
                  }}
                />
              )}
              
              <div className="relative flex items-center justify-between px-4 py-3 pointer-events-none">
                <span 
                  className="text-sm font-bold flex items-center gap-1" 
                  style={{ color: isVoted ? 'var(--nia-violet)' : 'var(--text-primary)' }}
                >
                  {isVoted && <span className="text-xs font-black">✓</span>}
                  {option.text}
                </span>
                
                {showResults && (
                  <span 
                    className="text-sm font-black tabular-nums" 
                    style={{ color: isWinner ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}
                  >
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-(--text-tertiary)">
        <span>
          {localPoll.total_votes} vote{localPoll.total_votes !== 1 ? 's' : ''}
        </span>
        <span 
          className="font-bold" 
          style={isExpired ? { color: '#ef4444' } : {}}
        >
          {timeLeft()}
        </span>
      </div>
    </div>
  )
}