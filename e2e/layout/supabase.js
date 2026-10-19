const user = { id: 'viewer', email: 'viewer@example.test' }
export const creator = { id: 'creator', username: 'nairobicreatorwithaverylongusername', full_name: 'A very long creator name for layout checks', avatar_url: null, country: 'Kenya', is_private: false }
const created_at = '2026-10-17T18:00:00.000Z'
const rows = {
  profiles: [creator],
  messages: [
    { id: 'message3', sender_id: 'viewer', recipient_id: 'creator', content: 'Absolutely! See you there ✨', created_at: '2026-10-17T16:04:00Z', is_read: true },
    { id: 'message2', sender_id: 'creator', recipient_id: 'viewer', content: 'One long message to check wrapping: ' + 'word'.repeat(100), created_at: '2026-10-17T16:03:00Z', is_read: false },
    { id: 'message1', sender_id: 'creator', recipient_id: 'viewer', content: 'Hey! Are you joining us this weekend?', created_at: '2026-10-17T16:00:00Z', is_read: true },
  ],
  comments: [{ id: 'comment', content: 'A long comment '.repeat(25), created_at, profiles: creator }],
  notifications: [{ id: 'notification', type: 'like', message: 'liked your post', is_read: false, created_at, actor_id: 'creator', entity_id: '1', actor: creator }],
  message_requests: [{ other_id: 'creator', status: 'pending' }],
}
function query(data = []) {
  let single = false
  let result = data
  const chain = new Proxy({}, { get: (_, key) => {
    if (key === 'then') return resolve => Promise.resolve({ data: single ? result[0] ?? null : result, error: null, count: result.length }).then(resolve)
    return value => { if (key === 'insert') result = [{ ...value, created_at: new Date().toISOString(), is_read: false }]; if (key === 'single' || key === 'maybeSingle') single = true; return chain }
  } })
  return chain
}
const client = {
  auth: { getUser: async () => ({ data: { user } }), getSession: async () => ({ data: { session: { user } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) },
  from: table => { (window.__queries ??= []).push(table); return query(table === 'message_requests' && location.search.includes('chat') ? [] : rows[table] ?? []) },
  rpc: name => query(name === 'profile_card' ? [creator] : name === 'conversation_page' ? [{ other_id: 'creator', content: 'A message with a long preview '.repeat(12), created_at, is_read: false, sender_id: 'creator' }] : []),
  channel: () => query(), removeChannel: async () => {},
}
export const createClient = () => client
