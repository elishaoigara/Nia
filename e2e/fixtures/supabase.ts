import { test as base, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type FixtureUser = {
  id: string
  email: string
  password: string
  username: string
}

type TestData = {
  onboardingUser: FixtureUser
  sender: FixtureUser
  recipient: FixtureUser
  circleIds: string[]
}

type SupabaseFixtures = {
  testData: TestData
}

function requireFixtureConfig() {
  const url = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
  const allowRemote = process.env.E2E_ALLOW_REMOTE === 'true'
  const isLocal = Boolean(url && /localhost|127\.0\.0\.1/.test(url))

  if (!url || !serviceRoleKey) {
    throw new Error('Set E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY to run database-backed Playwright tests.')
  }
  if (!isLocal && !allowRemote) {
    throw new Error('Refusing to mutate a remote Supabase project. Set E2E_ALLOW_REMOTE=true only for an isolated staging project.')
  }

  return { url, serviceRoleKey }
}

async function createAuthUser(
  admin: SupabaseClient,
  suffix: string,
  withProfile: boolean,
): Promise<FixtureUser> {
  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const username = `e2e_${suffix}_${token.slice(-8)}`.slice(0, 30).replace(/[^a-z0-9_]/g, '_')
  const email = `nia-e2e-${suffix}-${token}@example.test`
  const password = 'E2E_Test_Pass_123!'
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  expect(error, `Could not create fixture user ${suffix}`).toBeNull()
  if (!data.user) throw new Error(`Supabase did not return fixture user ${suffix}`)

  if (withProfile) {
    const { error: profileError } = await admin.from('profiles').insert({
      id: data.user.id,
      username,
      full_name: `Nia E2E ${suffix}`,
      bio: 'Disposable Playwright fixture profile',
      country: 'Kenya',
      city: 'Nairobi',
      language: 'English',
      languages: ['English', 'Swahili'],
      interests: ['music', 'tech', 'community'],
    })
    expect(profileError, `Could not create fixture profile ${suffix}`).toBeNull()
  }

  return { id: data.user.id, email, password, username }
}

async function cleanup(admin: SupabaseClient, data: TestData) {
  const userIds = [data.onboardingUser.id, data.sender.id, data.recipient.id]
  await admin.from('notifications').delete().in('user_id', userIds)
  await admin.from('messages').delete().or(`sender_id.in.(${userIds.join(',')}),recipient_id.in.(${userIds.join(',')})`)
  await admin.from('message_requests').delete().or(`user_id.in.(${userIds.join(',')}),other_id.in.(${userIds.join(',')})`)
  if (data.circleIds.length > 0) {
    await admin.from('circle_members').delete().in('circle_id', data.circleIds)
    await admin.from('circle_join_requests').delete().in('circle_id', data.circleIds)
    await admin.from('circles').delete().in('id', data.circleIds)
  }
  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) console.warn(`[e2e] fixture cleanup failed for ${userId}: ${error.message}`)
  }
}

export const test = base.extend<SupabaseFixtures>({
  testData: async ({}, apply) => {
    const { url, serviceRoleKey } = requireFixtureConfig()
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const onboardingUser = await createAuthUser(admin, 'onboarding', false)
    const sender = await createAuthUser(admin, 'sender', true)
    const recipient = await createAuthUser(admin, 'recipient', true)

    const circleIds: string[] = []
    for (const [name, category] of [['Nairobi Music Circle', 'music'], ['Kenya Tech Circle', 'tech'], ['Young Creators Kenya', 'community']] as const) {
      const { data: circle, error } = await admin.from('circles').insert({
        created_by: recipient.id,
        name,
        slug: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: `Disposable ${category} Circle for Playwright`,
        country: 'Kenya',
        category,
        is_private: false,
      }).select('id').single()
      expect(error, `Could not create fixture Circle ${name}`).toBeNull()
      if (circle?.id) circleIds.push(circle.id)
    }

    const data = { onboardingUser, sender, recipient, circleIds }
    try {
      await apply(data)
    } finally {
      await cleanup(admin, data)
    }
  },
})

export { expect }
