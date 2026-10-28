const user = { id: 'viewer', email: 'viewer@example.test' }
export const creator = { id: 'creator', username: 'nairobicreatorwithaverylongusername', full_name: 'A very long creator name for layout checks', avatar_url: null, country: 'Kenya', is_private: false }
const created_at = '2026-10-17T18:00:00.000Z'
const rows = {
  profiles: [creator],
  comments: [{ id: 'comment', content: 'A long comment '.repeat(25), created_at, profiles: creator }],
  notifications: [{ id: 'notification', type: 'like', message: 'liked your post', is_read: false, created_at, actor_id: 'creator', entity_id: '1', actor: creator }],
  message_requests: [{ other_id: 'creator', status: 'pending' }],
}
function query(data = []) {
  let single = false
  const chain = new Proxy({}, { get: (_, key) => {
    if (key === 'then') return resolve => Promise.resolve({ data: single ? data[0] ?? null : data, error: null, count: data.length }).then(resolve)
    return () => { if (key === 'single' || key === 'maybeSingle') single = true; return chain }
  } })
  return chain
}
const client = {
  auth: { getUser: async () => ({ data: { user } }), getSession: async () => ({ data: { session: { user } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) },
  from: table => query(rows[table] ?? []),
  rpc: name => query(name === 'profile_card' ? [creator] : name === 'conversation_page' ? [{ other_id: 'creator', content: 'A message with a long preview '.repeat(12), created_at, is_read: false, sender_id: 'creator' }] : []),
  channel: () => query(), removeChannel: async () => {},
}
export const createClient = () => client
