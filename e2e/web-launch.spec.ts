import { expect, test } from '@playwright/test'

test('welcomes visitors and keeps public pages and installation metadata reachable', async ({ page, request }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Your people.*Your stories.*Your Nia/  })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('welcome.png'), fullPage: true })
  await page.getByRole('link', { name: 'Join Nia', exact: true }).click()
  await expect(page).toHaveURL(/\/signup$/)
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  for (const path of ['/help', '/privacy', '/terms', '/community-guidelines']) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    expect(response.headers()['location']).toBeUndefined()
  }
})

test('signup validation and a confirmation email can be retried without losing the email', async ({ page }) => {
  await page.route('**/auth/v1/signup*', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', email: 'launch@example.com', identities: [] }),
  }))
  await page.route('**/auth/v1/resend*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.goto('/signup')
  await page.getByLabel('Email', { exact: true }).fill('launch@example.com')
  await page.getByLabel('Password', { exact: true }).fill('a-test-password')
  await page.getByLabel('Confirm password').fill('different-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Passwords do not match' })).toBeVisible()
  await page.getByLabel('Confirm password').fill('a-test-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()
  await page.getByText('Need a new confirmation email?').click()
  await expect(page.getByLabel('Email address')).toHaveValue('launch@example.com')
  await page.getByRole('button', { name: 'Resend confirmation' }).click()
  await expect(page.getByRole('status')).toContainText('a new link is on its way')
  await expect(page.getByRole('button', { name: /Try again in/ })).toBeDisabled()
})

test('failed and incomplete email links provide a recovery path', async ({ page }) => {
  await page.goto('/auth/confirm?type=email')
  await expect(page.getByRole('alert').filter({ hasText: 'expired or was already used' })).toBeVisible()
  await expect(page.getByText('Need a new confirmation email?')).toBeVisible()
  await page.goto('/auth/callback')
  await expect(page.getByRole('alert').filter({ hasText: 'incomplete' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0)
})
