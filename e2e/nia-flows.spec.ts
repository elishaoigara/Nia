import { test as baseTest, expect } from '@playwright/test'
import { test as dbTest } from './fixtures/supabase'

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

baseTest.describe('mobile authentication recovery', () => {
  baseTest('preserves the protected destination when an unauthenticated user visits a protected route', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/login\?next=%2Fexplore/)
    await expect(page.getByPlaceholder('Email')).toBeVisible()
  })

  baseTest('recovers from an incomplete OAuth callback', async ({ page }) => {
    await page.goto('/auth/callback')
    await expect(page).toHaveURL(/\/login\?error=missing_auth_code/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  baseTest('shows a clear inline error for invalid credentials on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill('invalid@example.com')
    await page.getByPlaceholder('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(hasHorizontalOverflow).toBe(false)
  })
})

dbTest.describe('onboarding Circle selection', () => {
  dbTest('saves interests, presents recommended Circles, and enters Home after joining', async ({ page, testData }) => {
    await signIn(page, testData.onboardingUser.email, testData.onboardingUser.password)
    await expect(page).toHaveURL(/\/onboarding/)

    await page.getByPlaceholder('Amara Osei').fill('Nia Test User')
    await page.getByPlaceholder('amara').fill(testData.onboardingUser.username)
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
    await expect(options).toHaveCount(3)
    await options.first().click()
    await expect(options.first()).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: /Join 1 Circle/ }).click()
    await expect(page).toHaveURL('/')
  })
})

dbTest.describe('messaging and notifications', () => {
  dbTest('sends a message and exposes its notification deep link', async ({ page, testData }) => {
    await signIn(page, testData.sender.email, testData.sender.password)
    await page.goto(`/messages/${testData.recipient.id}`)

    const text = `Playwright message ${Date.now()}`
    await page.getByPlaceholder('Message…').fill(text)
    await page.getByPlaceholder('Message…').press('Enter')
    await expect(page.getByText(text)).toBeVisible()

    // Sign in as the recipient in a fresh context would require a second browser
    // context. The database fixture verifies the notification row independently
    // through the recipient session in the follow-up assertion below.
    const recipientContext = await page.context().browser()?.newContext()
    if (!recipientContext) throw new Error('Could not create recipient browser context')
    const recipientPage = await recipientContext.newPage()
    try {
      await signIn(recipientPage, testData.recipient.email, testData.recipient.password)
      await recipientPage.goto('/notifications')
      await recipientPage.getByRole('button', { name: 'Messages', exact: true }).click()
      await expect(recipientPage.getByText(/sent you a message/i).first()).toBeVisible()
      await recipientPage.getByText(/sent you a message/i).first().click()
      await expect(recipientPage).toHaveURL(new RegExp(`/messages/${testData.sender.id}`))
    } finally {
      await recipientContext.close()
    }
  })
})
