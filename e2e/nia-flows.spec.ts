import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const dmTargetId = process.env.E2E_DM_TARGET_ID
const onboardingEmail = process.env.E2E_ONBOARDING_EMAIL
const onboardingPassword = process.env.E2E_ONBOARDING_PASSWORD

async function signIn(page: import('@playwright/test').Page, userEmail = email, userPassword = password) {
  test.skip(!userEmail || !userPassword, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flows')
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(userEmail!)
  await page.getByPlaceholder('Password').fill(userPassword!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test.describe('mobile authentication recovery', () => {
  test('preserves the protected destination when an unauthenticated user visits a protected route', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/login\?next=%2Fexplore/)
    await expect(page.getByPlaceholder('Email')).toBeVisible()
  })

  test('recovers from an incomplete OAuth callback', async ({ page }) => {
    await page.goto('/auth/callback')
    await expect(page).toHaveURL(/\/login\?error=missing_auth_code/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('shows a clear inline error for invalid credentials on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill('invalid@example.com')
    await page.getByPlaceholder('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(/invalid|incorrect|credentials|password/i)).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(hasHorizontalOverflow).toBe(false)
  })
})

test.describe('onboarding Circle selection', () => {
  test('saves interests, presents recommended Circles, and enters Home after joining', async ({ page }) => {
    test.skip(!onboardingEmail || !onboardingPassword, 'Set E2E_ONBOARDING_EMAIL and E2E_ONBOARDING_PASSWORD for a disposable onboarding account')
    await signIn(page, onboardingEmail, onboardingPassword)
    await expect(page).toHaveURL(/\/onboarding/)

    await page.getByPlaceholder('Amara Osei').fill('Nia Test User')
    await page.getByPlaceholder('amara').fill(`nia_test_${Date.now()}`)
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByPlaceholder('Search country…').fill('Kenya')
    await page.getByRole('button', { name: /Kenya/ }).first().click()
    await page.getByRole('button', { name: 'Continue' }).click()

    for (const interest of ['Music', 'Tech', 'Community']) {
      await page.getByRole('button', { name: interest, exact: true }).click()
    }
    await page.getByRole('button', { name: /Let's go!/ }).click()
    await expect(page.getByTestId('onboarding-circles-step')).toBeVisible()

    const options = page.locator('[data-testid^="circle-option-"]')
    if (await options.count() > 0) {
      await options.first().click()
      await expect(options.first()).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: /Join 1 Circle/ }).click()
    } else {
      await page.getByRole('button', { name: 'Skip for now' }).click()
    }

    await expect(page).toHaveURL('/')
  })
})

test.describe('messaging and notifications', () => {
  test('sends a message and exposes its notification deep link', async ({ page }) => {
    test.skip(!email || !password || !dmTargetId, 'Set E2E_EMAIL, E2E_PASSWORD, and E2E_DM_TARGET_ID for messaging flows')
    await signIn(page)
    await page.goto(`/messages/${dmTargetId}`)

    const text = `Playwright message ${Date.now()}`
    await page.getByPlaceholder('Message…').fill(text)
    await page.getByPlaceholder('Message…').press('Enter')
    await expect(page.getByText(text)).toBeVisible()

    await page.goto('/notifications')
    await page.getByRole('button', { name: 'Messages', exact: true }).click()
    await expect(page.getByText(/sent you a message/i).first()).toBeVisible()
    await page.getByText(/sent you a message/i).first().click()
    await expect(page).toHaveURL(new RegExp(`/messages/${dmTargetId}`))
  })
})
