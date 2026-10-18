// Read-only configuration checks. Does not print keys or contact production.
const failures = []
const env = process.env
if (env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') !== 'https://niaapp.app') failures.push('Set NEXT_PUBLIC_APP_URL=https://niaapp.app for production.')
try {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  if (url.protocol !== 'https:' || /placeholder|your-project|example/.test(url.hostname)) throw Error()
} catch { failures.push('Set the real production NEXT_PUBLIC_SUPABASE_URL.') }
const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
if (!publicKey || /your-|not-configured/.test(publicKey)) failures.push('Set the production Supabase public/anon key.')
if (publicKey.startsWith('sb_secret_')) failures.push('A secret Supabase key must NEVER be used as NEXT_PUBLIC_SUPABASE_ANON_KEY.')
if (publicKey.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString())
    if (payload.role !== 'anon') failures.push('The public Supabase JWT must use the anon role.')
  } catch { failures.push('The public Supabase JWT is malformed.') }
}
if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.startsWith('your-')) failures.push('Set server-only SUPABASE_SERVICE_ROLE_KEY for account deletion.')
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '')) failures.push('Configure a real monitored NEXT_PUBLIC_SUPPORT_EMAIL.')
if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.startsWith('your-')) console.warn('AI captions and translation need ANTHROPIC_API_KEY; these features are not verified.')
if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join('\n'))
  process.exitCode = 1
} else console.log('Configuration syntax checks passed. Complete live acceptance checks in docs/WEB_LAUNCH.md; this does not verify credentials, SMTP, DNS, or the database.')
