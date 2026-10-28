import { expect, test } from '@playwright/test'

test('post, composer and discussion stay in flow at all screen sizes', async ({ page }) => {
  await page.goto('/?screen=post-detail')
  const post = page.locator('.post-detail-page .post-row')
  const composer = page.locator('.post-reply-composer')
  const input = page.getByRole('textbox', { name: 'Write a comment' })
  await expect(input).toBeVisible()
  const postBox = await post.boundingBox()
  const composerBox = await composer.boundingBox()
  expect(postBox && composerBox && composerBox.y >= postBox.y + postBox.height).toBeTruthy()
  expect(await composer.evaluate(el => getComputedStyle(el).position)).not.toBe('fixed')
  await input.fill('A thoughtful comment')
  await expect(page.getByRole('button', { name: 'Send reply' })).toBeEnabled()
  for (const name of ['Add image', 'Add video', 'Add GIF']) await expect(page.getByRole('button', { name })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
