'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth-errors';
import UnityLine from '@/components/UnityLine';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get('error');
    if (!callbackError) return;

    const messages: Record<string, string> = {
      missing_auth_code: 'That sign-in link is incomplete. Please start again.',
      auth_callback_failed: 'We could not finish signing you in. Please try again.',
      profile_lookup_failed: 'You are signed in, but your profile could not be loaded. Please try again.',
    };
    const timer = window.setTimeout(() => {
      setError(messages[callbackError] ?? 'We could not finish signing you in. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(friendlyAuthError(signInError.message));
      setLoading(false);
      return;
    }

    router.push('/');
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(friendlyAuthError(oauthError.message));
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-0)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Faint pan-African flag-color mosaic — texture, not decoration */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.06,
          backgroundImage: `repeating-linear-gradient(115deg,
            #5B21B6 0px, #5B21B6 40px,
            #0F6E56 40px, #0F6E56 80px,
            #BA7517 80px, #BA7517 120px,
            #993C1D 120px, #993C1D 160px,
            #7C3AED 160px, #7C3AED 200px
          )`,
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 400,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <img src="/logo/nia-icon.svg" alt="" width={40} height={40} style={{ borderRadius: 12 }} />
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Nia
            </h1>
          </div>
          <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 14 }}>
            Africa connects here.
          </p>
          <UnityLine />
        </div>

        {/* Card — flat, matches app surfaces, no artificial elevation */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 32,
          }}
        >
          <h2
            style={{
              color: 'var(--text-primary)',
              fontSize: 20,
              fontWeight: 700,
              margin: '0 0 24px',
              textAlign: 'center',
            }}
          >
            Sign in
          </h2>

          {/* OAuth — Google only */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
                className="btn-ghost tap-sm"
              aria-label="Continue with Google"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 0',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface-0)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="login-email" className="visually-hidden">Email address</label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="login-password" className="visually-hidden">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="input"
              />
            </div>

            {error && (
              <p
                role="alert"
                aria-live="polite"
                style={{
                  color: 'var(--nia-coral)',
                  fontSize: 13,
                  margin: '0 0 12px',
                  textAlign: 'center',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary tap-sm"
              style={{
                width: '100%',
                borderRadius: 12,
                border: 'none',
                background: 'var(--grad-brand)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Links */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link
              href="/forgot-password"
              style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13 }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* New user CTA — separate, more visible than a small text link */}
        <div
          style={{
            marginTop: 16,
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px dashed var(--border)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-tertiary)' }}>
            New to Nia?
          </p>
          <Link
            href="/signup"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: 13.5 }}
          >
            Create your account →
          </Link>
        </div>
      </div>
    </div>
  );
}
