'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Compass, HeartHandshake, Plus, Sparkles, Users } from 'lucide-react'
import CreatePost from '@/components/CreatePost'

export type HomeCircleSummary = {
  id: string
  name: string
  slug: string
  category: string | null
}

export type CirclePulseItem = {
  id: string
  circleId: string
  circleName: string
  circleSlug: string
  authorName: string
  authorAvatar: string | null
  content: string
  createdAt: string
  mode: 'ask' | 'offer' | 'update' | 'opportunity' | 'reflection'
  type: 'update' | 'conversation'
}

export function HomeHeader({
  displayName,
  activeCircleCount,
}: {
  displayName: string
  activeCircleCount: number
}) {
  const welcomeNotes = [
    'A little room for big ideas.',
    'The good conversations are already warming up.',
    'Bring your curiosity. Leave with a new perspective.',
    'Someone in your Circle might have the missing piece.',
    'Small sparks can travel a long way.',
    'Your people are closer than you think.',
    'No big performance needed. Just come as you are.',
  ]
  const welcomeNote = welcomeNotes[activeCircleCount % welcomeNotes.length]

  return (
    <section className="home-welcome" aria-labelledby="home-welcome-heading">
      <div>
        <p className="home-eyebrow">A good place to start</p>
        <h1 id="home-welcome-heading">Hey {displayName}, what are we getting into?</h1>
        <p className="home-welcome-copy">
          {activeCircleCount > 0
            ? `${activeCircleCount} Circle${activeCircleCount === 1 ? '' : 's'} in your orbit.`
            : 'Find a Circle connected to what you want to learn, make, laugh about, or share.'}
        </p>
        <p className="home-welcome-note">{welcomeNote}</p>
      </div>
      <div className="home-welcome-mark" aria-hidden="true"><HeartHandshake size={22} /></div>
    </section>
  )
}

export function NextStepCard({
  circle,
  hasActivity,
}: {
  circle: HomeCircleSummary | null
  hasActivity: boolean
}) {
  if (!circle) {
    return (
      <section className="home-next-step home-next-step--discover" aria-labelledby="home-next-step-heading">
        <div className="home-next-step-icon"><Compass size={20} /></div>
        <div className="home-next-step-body">
          <p className="home-eyebrow">A gentle nudge</p>
          <h2 id="home-next-step-heading">Find your kind of people</h2>
          <p>There is a Circle for your current curiosity, side quest, big idea, or random obsession.</p>
          <Link className="btn-primary home-next-step-action" href="/circles">Take a look <ArrowRight size={15} /></Link>
        </div>
      </section>
    )
  }

  return (
    <section className="home-next-step" aria-labelledby="home-next-step-heading">
      <div className="home-next-step-icon"><Sparkles size={20} /></div>
      <div className="home-next-step-body">
        <p className="home-eyebrow">A little nudge · {circle.name}</p>
        <h2 id="home-next-step-heading">{hasActivity ? 'Someone started something' : 'Drop into your Circle'}</h2>
        <p>{hasActivity ? 'There is a fresh thought, question, or small win waiting for your take.' : 'See what your people are chatting about and add your voice when it feels right.'}</p>
        <Link className="btn-primary home-next-step-action" href={`/circles/${circle.slug}`}>
          {hasActivity ? 'See what’s up' : 'Drop in'} <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}

export function CircleShelf({ circles }: { circles: HomeCircleSummary[] }) {
  return (
    <section className="home-section" aria-labelledby="home-circles-heading">
      <div className="home-section-heading">
        <div><p className="home-eyebrow">Your little corners of the internet</p><h2 id="home-circles-heading">Your Circles</h2></div>
        <Link href="/circles" className="home-see-all">See all <ArrowRight size={14} /></Link>
      </div>
      <div className="home-circle-shelf hidden-scrollbar">
        {circles.map(circle => (
          <Link key={circle.id} href={`/circles/${circle.slug}`} className="home-circle-tile tap-sm">
            <span className="home-circle-avatar"><Users size={17} /></span>
            <span className="home-circle-tile-copy"><strong>{circle.name}</strong><small>{circle.category ?? 'Community'} · Open Circle</small></span>
            <ArrowRight size={14} className="home-circle-arrow" />
          </Link>
        ))}
        <Link href="/circles" className="home-circle-tile home-circle-tile--add tap-sm">
          <span className="home-circle-avatar"><Plus size={17} /></span>
          <span className="home-circle-tile-copy"><strong>Find another Circle</strong><small>Discover a new space</small></span>
          <ArrowRight size={14} className="home-circle-arrow" />
        </Link>
      </div>
    </section>
  )
}

const PURPOSE_LABELS: Record<CirclePulseItem['mode'], string> = {
  ask: 'asked the room',
  offer: 'said “I’ve got you”',
  update: 'shared a small win',
  opportunity: 'passed something on',
  reflection: 'shared a thought',
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function CirclePulseFeed({ items }: { items: CirclePulseItem[] }) {
  return (
    <section className="home-section" aria-labelledby="home-pulse-heading">
      <div className="home-section-heading">
        <div><p className="home-eyebrow">A quick look around</p><h2 id="home-pulse-heading">What’s happening</h2></div>
        <span className="home-live-label"><span /> Fresh from your Circles</span>
      </div>
      {items.length === 0 ? (
        <div className="home-empty-card">
          <CheckCircle2 size={20} />
          <div><strong>Your Circles are ready for your first contribution.</strong><p>Ask a question, share an idea, or post a small progress update.</p></div>
        </div>
      ) : (
        <div className="home-pulse-list">
          {items.map(item => (
            <Link key={item.id} href={`/circles/${item.circleSlug}`} className="home-pulse-card tap-sm">
              <div className="home-pulse-avatar">{item.authorAvatar ? <img src={item.authorAvatar} alt="" /> : item.authorName.slice(0, 1).toUpperCase()}</div>
              <div className="home-pulse-content">
                <div className="home-pulse-meta"><strong>{item.circleName}</strong><span>{relativeTime(item.createdAt)}</span></div>
                <p><b>{item.authorName}</b> {PURPOSE_LABELS[item.mode]}.</p>
                <p className="home-pulse-text">{item.content}</p>
                <span className="home-pulse-action">Join the moment <ArrowRight size={13} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export type PurposeMode = 'ask' | 'offer' | 'update' | 'opportunity' | 'reflection'

const PURPOSE_MODES: Array<{ id: PurposeMode; label: string; hint: string }> = [
  { id: 'ask', label: 'Help me think', hint: 'What are you trying to figure out?' },
  { id: 'offer', label: 'I’ve got you', hint: 'What shortcut, skill, or kindness can you share?' },
  { id: 'update', label: 'Small win', hint: 'What moved forward, even a little?' },
  { id: 'opportunity', label: 'Pass it on', hint: 'What good thing should someone here know about?' },
  { id: 'reflection', label: 'A thought', hint: 'What did you learn, notice, or keep thinking about?' },
]

export function PurposeComposer({ userId, circles }: { userId: string; circles: HomeCircleSummary[] }) {
  return <PurposeComposerInner userId={userId} circles={circles} />
}

function PurposeComposerInner({ userId, circles }: { userId: string; circles: HomeCircleSummary[] }) {
  const [mode, setMode] = React.useState<PurposeMode>('update')
  const [circleId, setCircleId] = React.useState<string | null>(circles[0]?.id ?? null)
  const current = PURPOSE_MODES.find(item => item.id === mode) ?? PURPOSE_MODES[2]

  return (
    <section id="compose" className="home-section home-composer-section" aria-labelledby="home-composer-heading">
      <div className="home-section-heading"><div><p className="home-eyebrow">Your turn, if you feel like it</p><h2 id="home-composer-heading">Drop something here</h2></div></div>
      <div className="purpose-mode-row" role="group" aria-label="Ways to join in">
        {PURPOSE_MODES.map(item => <button key={item.id} type="button" className={`purpose-mode${mode === item.id ? ' is-selected' : ''}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>)}
      </div>
      <p className="purpose-mode-hint">{current.hint}</p>
      {circles.length > 0 && <label className="purpose-circle-select">Drop it in <select value={circleId ?? ''} onChange={event => setCircleId(event.target.value || null)}><option value="">All Africa</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label>}
      <CreatePost userId={userId} circleId={circleId} purposeMode={mode} />
    </section>
    )
}
