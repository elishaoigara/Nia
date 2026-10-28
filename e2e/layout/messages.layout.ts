import { expect, test } from '@playwright/test'

test('inbox search and requests remain usable across screen sizes', async ({ page }) => {
 await page.goto('/?screen=inbox')
 await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
 await expect(page.getByRole('link', { name: 'Start a new message' })).toBeVisible()
 const search = page.getByRole('searchbox', { name: 'Search loaded conversations' })
 await search.fill('no-such-conversation')
 await expect(page.getByText('No loaded conversations match your search.')).toBeVisible()
 await search.clear()
 await expect(page.locator('.inbox-conversation').first()).toBeVisible()
 await page.getByRole('button', { name: /Requests/ }).click()
 await expect(page.getByRole('button', { name: 'Accept request' })).toBeVisible()
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
