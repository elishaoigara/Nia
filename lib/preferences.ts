export const DEFAULT_PREFERENCES = {
 data_saver: true, autoplay: false, interface_language: 'en', content_languages: [] as string[],
 dm_policy: 'requests', show_presence: false, read_receipts: false,
 notify_replies: true, notify_messages: true, notify_circles: true, digest: false,
 quiet_start: null as string | null, quiet_end: null as string | null, timezone: 'Africa/Nairobi',
}
export type Preferences = typeof DEFAULT_PREFERENCES
export const TRANSLATIONS: Record<string, Record<string, string>> = {
 sw: { Home: 'Nyumbani', Circles: 'Vikundi', Discover: 'Gundua', Messages: 'Ujumbe', Me: 'Mimi', Settings: 'Mipangilio', Post: 'Chapisha', Search: 'Tafuta', Save: 'Hifadhi', Cancel: 'Ghairi', 'Load more': 'Onyesha zaidi', 'Data saver': 'Okoa data', Autoplay: 'Cheza kiotomatiki', 'Your preferences': 'Mapendeleo yako', 'Save settings': 'Hifadhi mipangilio', 'Settings saved': 'Mipangilio imehifadhiwa' },
}
