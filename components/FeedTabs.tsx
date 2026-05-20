import Link from 'next/link'

interface FeedTabsProps {
  currentTab: string
}

const TABS = [
  { key: 'africa',    label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'local',     label: 'Local'  },
]

export default function FeedTabs({ currentTab }: FeedTabsProps) {
  return (
    <nav 
      className="flex w-full border-b" 
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex w-full px-2">
        {TABS.map(tab => {
          const isActive = currentTab === tab.key

          return (
            <Link
              key={tab.key}
              href={`/?tab=${tab.key}`}
              className="relative flex-1 xs:flex-none text-center xs:px-6 py-3.5 text-sm font-bold transition-all duration-200 select-none tap-sm active:scale-95"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {tab.label}
              
              {/* Sliding Bottom Active Indicator Line */}
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.75 rounded-t-full"
                  style={{ background: 'var(--nia-violet)' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}