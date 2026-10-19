const router = { push: url => { window.__navigation = url }, replace: () => {}, refresh: () => {}, back: () => {} }
export const useRouter = () => router
export const usePathname = () => ({ inbox: '/messages', flicks: '/flicks', settings: '/settings', notifications: '/notifications' })[new URLSearchParams(location.search).get('screen')] ?? '/'
export const useSearchParams = () => new URLSearchParams(location.search)
export const useParams = () => ({ userId: 'creator' })
