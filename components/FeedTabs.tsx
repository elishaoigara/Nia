import Link from 'next/link'

interface FeedTabsProps {
  currentTab: string
}

const TABS = [
  { key: 'africa',    label: 'Latest'    },
  { key: 'following', label: 'Following'  },
  { key: 'local',     label: 'Local'      },
]

export default function FeedTabs({ currentTab }: FeedTabsProps) {
  return (
    <nav className="feed-tabs" aria-label="Feed filters">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`/?tab=${tab.key}`}
          aria-current={currentTab === tab.key ? 'page' : undefined}
          className={`feed-tab${currentTab === tab.key ? ' active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}