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
  type: 'update' | 'conversation'
}

export function HomeHeader({
  displayName,
  activeCircleCount,
  needsResponseCount,
}: {
  displayName: string
  activeCircleCount: number
  needsResponseCount: number
}) {
  return (
    <section className="home-welcome" aria-labelledby="home-welcome-heading">
      <div>
        <p className="home-eyebrow">Your community space</p>
        <h1 id="home-welcome-heading">Good morning, {displayName}</h1>
        <p className="home-welcome-copy">
          {activeCircleCount > 0
            ? `${activeCircleCount} Circle${activeCircleCount === 1 ? '' : 's'} are part of your journey${needsResponseCount > 0 ? ` · ${needsResponseCount} need${needsResponseCount === 1 ? 's' : ''} your response` : ''}.`
            : 'Find a Circle connected to what you want to learn, build, or share.'}
        </p>
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
          <p className="home-eyebrow">Your next step</p>
          <h2 id="home-next-step-heading">Find your people and purpose</h2>
          <p>Explore Circles where you can learn, build, find opportunities, and contribute.</p>
          <Link className="btn-primary home-next-step-action" href="/circles">Find a Circle <ArrowRight size={15} /></Link>
        </div>
      </section>
    )
  }

  return (
    <section className="home-next-step" aria-labelledby="home-next-step-heading">
      <div className="home-next-step-icon"><Sparkles size={20} /></div>
      <div className="home-next-step-body">
        <p className="home-eyebrow">Your next step · {circle.name}</p>
        <h2 id="home-next-step-heading">{hasActivity ? 'Continue the conversation' : 'Step into your Circle'}</h2>
        <p>{hasActivity ? 'There is fresh activity waiting for your perspective.' : 'Start by seeing what your Circle is working on together.'}</p>
        <Link className="btn-primary home-next-step-action" href={`/circles/${circle.slug}`}>
          {hasActivity ? 'Open Circle' : 'Visit Circle'} <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}

export function CircleShelf({ circles }: { circles: HomeCircleSummary[] }) {
  return (
    <section className="home-section" aria-labelledby="home-circles-heading">
      <div className="home-section-heading">
        <div><p className="home-eyebrow">Your spaces</p><h2 id="home-circles-heading">Circles you are part of</h2></div>
        <Link href="/circles" className="home-see-all">See all <ArrowRight size={14} /></Link>
      </div>
      <div className="home-circle-shelf hidden-scrollbar">
        {circles.map(circle => (
          <Link key={circle.id} href={`/circles/${circle.slug}`} className="home-circle-tile tap-sm">
            <span className="home-circle-avatar"><Users size={17} /></span>
            <span className="home-circle-tile-copy"><strong>{circle.name}</strong><small>{circle.category ?? 'Community'} · Open space</small></span>
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
        <div><p className="home-eyebrow">Stay connected</p><h2 id="home-pulse-heading">What is happening</h2></div>
        <span className="home-live-label"><span /> Live pulse</span>
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
                <p><b>{item.authorName}</b> shared a {item.type === 'update' ? 'progress update' : 'conversation'}.</p>
                <p className="home-pulse-text">{item.content}</p>
                <span className="home-pulse-action">Open Circle <ArrowRight size={13} /></span>
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
  { id: 'ask', label: 'Ask', hint: 'What are you trying to figure out?' },
  { id: 'offer', label: 'Offer help', hint: 'What can you help someone with?' },
  { id: 'update', label: 'Progress update', hint: 'What moved forward this week?' },
  { id: 'opportunity', label: 'Opportunity', hint: 'What opportunity should the community know about?' },
  { id: 'reflection', label: 'Reflection', hint: 'What did you learn or notice?' },
]

export function PurposeComposer({ userId, circles }: { userId: string; circles: HomeCircleSummary[] }) {
  return <PurposeComposerInner userId={userId} circles={circles} />
}

function PurposeComposerInner({ userId, circles }: { userId: string; circles: HomeCircleSummary[] }) {
  const [mode, setMode] = React.useState<PurposeMode>('update')
  const [circleId, setCircleId] = React.useState<string | null>(circles[0]?.id ?? null)
  const current = PURPOSE_MODES.find(item => item.id === mode) ?? PURPOSE_MODES[2]

  return (
    <section className="home-section home-composer-section" aria-labelledby="home-composer-heading">
      <div className="home-section-heading"><div><p className="home-eyebrow">Add something useful</p><h2 id="home-composer-heading">Share with intention</h2></div></div>
      <div className="purpose-mode-row" role="group" aria-label="Contribution type">
        {PURPOSE_MODES.map(item => <button key={item.id} type="button" className={`purpose-mode${mode === item.id ? ' is-selected' : ''}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>)}
      </div>
      <p className="purpose-mode-hint">{current.hint}</p>
      {circles.length > 0 && <label className="purpose-circle-select">Share in <select value={circleId ?? ''} onChange={event => setCircleId(event.target.value || null)}><option value="">All Africa</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label>}
      <CreatePost userId={userId} circleId={circleId} purposeMode={mode} />
    </section>
    )
}

