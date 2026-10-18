import { expect, test } from '@playwright/test'

test('Flicks scrolls, snaps and keeps controls separate from captions', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?screen=flicks')
  const feed = page.getByRole('region', { name: 'Flicks video feed' })
  await expect(feed).toBeVisible()
  await expect(page.locator('.flick-slide[data-active=true]')).toHaveCount(1)
  const firstVideo = page.locator('.flick-slide').first().locator('video')
  await page.locator('.flick-slide').first().getByRole('button', { name: 'Play flick', exact: true }).click()
  await expect.poll(() => firstVideo.evaluate((video: HTMLVideoElement) => !video.paused && video.currentTime > 0)).toBe(true)
  await page.getByRole('button', { name: 'Next flick', exact: true }).click()
  await expect(page.locator('.flick-slide').nth(1)).toHaveAttribute('data-active', 'true')
  await expect.poll(() => firstVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true)
  await feed.evaluate(el => { el.scrollTop = el.clientHeight * 3 })
  await expect(page.locator('.flick-slide').nth(3)).toHaveAttribute('data-active', 'true')
  await expect(page.getByRole('button', { name: 'Next flick', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous flick', exact: true }).click()
  await expect(page.locator('.flick-slide').nth(2)).toHaveAttribute('data-active', 'true')
  await feed.evaluate(el => el.focus({ preventScroll: true }))
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('.flick-slide').nth(1)).toHaveAttribute('data-active', 'true')
  const active = page.locator('.flick-slide[data-active=true]')
  const info = await active.locator('.flick-info').boundingBox()
  const rail = await active.locator('.flick-action-rail').boundingBox()
  expect(info && rail && (info.x + info.width <= rail.x || info.y + info.height <= rail.y)).toBeTruthy()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('flicks.png') })
  await active.getByRole('button', { name: /Open comments/ }).click()
  await expect(page.getByRole('dialog', { name: 'Flick comments' })).toBeVisible()
  await expect(page.locator('.flick-slide[data-active=true]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close comments' }).click()
  await expect(page.getByRole('dialog', { name: 'Flick comments' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('long captions and main app screens fit the viewport', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?screen=flicks')
  await page.locator('.flick-slide').first().locator('.flick-caption-button').click()
  await expect(page.locator('.flick-caption-button').first()).toHaveAttribute('aria-expanded', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const screen of ['inbox', 'feed', 'settings', 'notifications']) {
    await page.goto('/?screen=' + screen)
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true }).or(page.locator('main'))).toBeVisible()
    if (screen === 'inbox') await expect(page.locator('.inbox-conversation')).toBeVisible()
    if (screen === 'feed') {
      const caption = page.getByRole('button', { name: 'Read more', exact: true })
      await caption.click()
      await expect(page.getByRole('button', { name: 'Show less', exact: true })).toHaveAttribute('aria-expanded', 'true')
      await page.getByRole('button', { name: 'Show less', exact: true }).click()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), screen).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(screen + '.png'), fullPage: true })
  }
  expect(errors).toEqual([])
})

test('Watch player fits, seeks, and opens comments above the video', async ({ page }, testInfo) => {
  await page.goto('/?screen=flicks')
  await page.getByRole('button', { name: 'Watch', exact: true }).click()
  await page.locator('.flick-library-scroll [role=button]').first().click()
  const dialog = page.getByRole('dialog', { name: 'Watch video', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.locator('.nia-video-controls').getByRole('button', { name: 'Play video', exact: true }).click()
  await expect.poll(() => dialog.locator('video').evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2)).toBe(true)
  await dialog.getByRole('slider', { name: 'Video position' }).fill('1')
  const player = await dialog.locator('.nia-video-stage').boundingBox()
  const controls = await dialog.locator('.nia-video-controls').boundingBox()
  expect(player && controls && controls.y >= player.y + player.height - 1).toBeTruthy()
  await dialog.locator('.flick-watch-actions button').nth(1).click()
  const comments = page.getByRole('dialog', { name: 'Flick comments' })
  await expect(comments).toBeVisible()
  await expect.poll(() => dialog.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  await comments.getByRole('button', { name: 'Close comments' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('watch.png') })
  await dialog.getByRole('button', { name: 'Close video', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})

test('touch swiping advances to the next Flick', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Real touch sequence is exercised by the touch-enabled phone project')
  await page.goto('/?screen=flicks')
  const feed = page.getByRole('region', { name: 'Flicks video feed' })
  const box = (await feed.boundingBox())!
  const cdp = await page.context().newCDPSession(page)
  const x = box.x + box.width / 2
  const start = box.y + box.height * 0.65
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] })
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start - box.height * 0.55 * i / 8 }] })
    await page.waitForTimeout(30)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('.flick-slide').nth(1)).toHaveAttribute('data-active', 'true')
})
