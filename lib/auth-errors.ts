export function friendlyAuthError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('invalid login credentials') || text.includes('invalid credentials')) {
    return 'Email or password is incorrect. Check both fields and try again.'
  }
  if (text.includes('email not confirmed')) {
    return 'Confirm your email from the link we sent before signing in.'
  }
  if (text.includes('already registered') || text.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.'
  }
  if (text.includes('network') || text.includes('fetch')) {
    return 'We could not reach Nia. Check your connection and try again.'
  }
  return 'We could not complete that request. Please try again.'
}
