'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function FeedTabs({ currentTab = 'foryou' }: { currentTab?: string }) {
  const searchParams = useSearchParams()
  
  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(name, value)
    return params.toString()
  }

  const tabs = [
    { id: 'foryou', label: 'For You', href: '/?tab=foryou' },
    { id: 'following', label: 'Following', href: '/?tab=following' },
  ]

  return (
    <div className="flex border-b border-[var(--border)] mb-4">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex-1 text-center py-3 font-semibold text-sm transition-all relative ${isActive 
              ? 'text-[var(--nia-violet)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-10 bg-[var(--nia-violet)] rounded" />
            )}
          </Link>
        )
      })}
    </div>
  )
}