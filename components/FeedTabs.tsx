'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Globe2, MapPin, Users } from 'lucide-react'

export default function FeedTabs({ currentTab = 'africa' }: { currentTab?: string }) {
  useSearchParams() // needed for Suspense boundary

  const tabs = [
    { id: 'africa',    label: 'All Africa', icon: Globe2,  desc: 'Everyone across the continent' },
    { id: 'local',     label: 'Local',      icon: MapPin,  desc: 'People from your country' },
    { id: 'following', label: 'Following',  icon: Users,   desc: 'People you follow' },
  ]

  return (
    <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = currentTab === tab.id
        return (
          <Link
            key={tab.id}
            href={`/?tab=${tab.id}`}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-semibold transition-all relative"
            style={{ color: isActive ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{tab.label}</span>
            {isActive && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: 'var(--nia-violet)' }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
