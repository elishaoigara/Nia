import { test as dbTest, expect } from './fixtures/supabase'
import type { Page } from '@playwright/test'

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

dbTest.describe('concurrent authenticated sessions', () => {
  dbTest('delivers a new direct-message notification to an already-open recipient session', async ({ page, testData }) => {
    const browser = page.context().browser()
    if (!browser) throw new Error('Could not access the Playwright browser')

    const senderContext = await browser.newContext()
    const recipientContext = await browser.newContext()
    const senderPage = await senderContext.newPage()
    const recipientPage = await recipientContext.newPage()

    try {
      await Promise.all([
        signIn(senderPage, testData.sender.email, testData.sender.password),
        signIn(recipientPage, testData.recipient.email, testData.recipient.password),
      ])

      await recipientPage.goto('/notifications')
      await recipientPage.getByRole('button', { name: 'Messages', exact: true }).click()
      await expect(recipientPage.getByText('No messages yet.')).toBeVisible()

      await senderPage.goto(`/messages/${testData.recipient.id}`)
      const text = `Concurrent Playwright message ${Date.now()}`
      await senderPage.getByPlaceholder('Message…').fill(text)
      await senderPage.getByPlaceholder('Message…').press('Enter')
      await expect(senderPage.getByText(text)).toBeVisible()

      await expect(recipientPage.getByText(/sent you a message/i).first()).toBeVisible()
      await recipientPage.getByText(/sent you a message/i).first().click()
      await expect(recipientPage).toHaveURL(new RegExp(`/messages/${testData.sender.id}`))
      await expect(recipientPage.getByText(text)).toBeVisible()
    } finally {
      await Promise.all([senderContext.close(), recipientContext.close()])
    }
  })
})

export { expect }

