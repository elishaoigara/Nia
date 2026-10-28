import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MessageBubble, { type ChatMessage } from '@/components/messages/MessageBubble'

const message: ChatMessage = { id: 'one', sender_id: 'me', recipient_id: 'other', content: 'Voice message', media_url: 'https://example.test/audio.webm', media_type: 'audio', file_name: null, view_once: false, viewed_at: null, reply_to: null, is_read: false, created_at: '2026-10-28T08:00:00Z', reactions: {}, edited_at: null, deleted_at: null }
const noop = () => {}
function render(msg: ChatMessage) {
 return renderToStaticMarkup(createElement(MessageBubble, { msg, isOwn: true, currentUserId: 'me', recipient: null, isViewOnceRevealed: false, onRevealViewOnce: noop, playingAudio: null, audioProgress: 0, audioDuration: 30, onToggleAudio: noop, onSeekAudio: noop, onSwipeReply: noop, onLongPress: noop, onDoubleTapReact: noop, onJumpReply: noop }))
}
describe('message controls', () => {
 it('exposes voice playback, seeking and message actions without a repeated voice caption', () => {
  const html = render(message)
  expect(html).toContain('aria-label="Play voice message"')
  expect(html).toContain('aria-label="Voice message position"')
  expect(html).toContain('aria-label="Message actions"')
  expect(html).not.toContain('>Voice message</p>')
  expect(html).toContain('aria-label="Sent"')
 })
 it('labels optimistic messages as sending rather than sent', () => {
  const html = render({ ...message, id: 'temp-test', media_type: null, media_url: null, content: 'Hello' })
  expect(html).toContain('aria-label="Sending"')
  expect(html).not.toContain('aria-label="Sent"')
 })
})
