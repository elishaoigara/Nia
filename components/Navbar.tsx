'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Users, User, PlusSquare } from 'lucide-react'

const links = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/discover', icon: Compass, label: 'Discover' },
  { href: '/circles', icon: Users, label: 'Circles' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar — desktop */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 px-4 h-14 flex items-center justify-between max-w-screen-sm mx-auto w-full">
        <Link href="/" className="text-xl font-bold tracking-tight">Nia</Link>
        <Link
          href="/post/new"
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <PlusSquare size={15} />
          Post
        </Link>
      </header>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-around px-2 h-16 sm:hidden">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
                active
                  ? 'text-purple-600'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Side nav — desktop */}
      <aside className="hidden sm:flex fixed left-0 top-0 h-full w-56 flex-col px-4 pt-20 pb-6 border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-50 dark:bg-purple-950 text-purple-600'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </aside>
    </>
  )
}