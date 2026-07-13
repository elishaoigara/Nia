'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAppUrl } from '@/lib/app-url';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${getAppUrl()}/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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
      {/* Faint diagonal line pattern — matches login page */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(45deg, color-mix(in srgb, var(--nia-violet) 7%, transparent) 0px, color-mix(in srgb, var(--nia-violet) 7%, transparent) 1px, transparent 1px, transparent 34px)',
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
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Nia
            </h1>
          </div>
          <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 14 }}>
            Reset your password
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 32,
          }}
        >
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--nia-violet) 15%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--nia-violet)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
                Check your email
              </h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: '0 0 20px' }}>
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: '0 0 16px' }}>
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <Link
                href="/login"
                style={{ color: 'var(--nia-violet)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
                Forgot password?
              </h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 20 }}>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      background: 'var(--surface-0)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontSize: 15,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {error && (
                  <p style={{ color: 'var(--nia-coral)', fontSize: 13, margin: '0 0 12px', textAlign: 'center' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="tap-sm"
                  style={{
                    width: '100%',
                    padding: '12px 0',
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
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link href="/login" style={{ color: 'var(--nia-violet)', textDecoration: 'none', fontSize: 13 }}>
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}