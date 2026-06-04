'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
        redirectTo: `${window.location.origin}/reset-password`,
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
        background: 'linear-gradient(135deg, #0B1120 0%, #1E293B 100%)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated particles */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.3)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `fade-in ${2 + Math.random() * 3}s ease ${Math.random() * 2}s infinite alternate`,
            }}
          />
        ))}
      </div>

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
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #8B5CF6, #FF6B6B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}
          >
            Nia
          </h1>
          <p style={{ color: '#94A3B8', marginTop: 8, fontSize: 14 }}>
            Reset your password
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#1E293B',
            border: '1px solid #334155',
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
                  background: 'rgba(139, 92, 246, 0.15)',
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
                  stroke="#8B5CF6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <h2
                style={{
                  color: '#F1F5F9',
                  fontSize: 18,
                  fontWeight: 700,
                  margin: '0 0 8px',
                }}
              >
                Check your email
              </h2>
              <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 20px' }}>
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
              </p>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px' }}>
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <Link
                href="/login"
                style={{
                  color: '#8B5CF6',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2
                style={{
                  color: '#F1F5F9',
                  fontSize: 20,
                  fontWeight: 700,
                  margin: '0 0 8px',
                  textAlign: 'center',
                }}
              >
                Forgot password?
              </h2>
              <p
                style={{
                  color: '#94A3B8',
                  fontSize: 14,
                  margin: '0 0 24px',
                  textAlign: 'center',
                }}
              >
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 20 }}>
                  <input
                    className="input"
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      background: '#0F172A',
                      border: '1px solid #334155',
                      color: '#F1F5F9',
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
                  <p
                    style={{
                      color: '#FF6B6B',
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
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8B5CF6, #FF6B6B)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link
                  href="/login"
                  style={{ color: '#8B5CF6', textDecoration: 'none', fontSize: 13 }}
                >
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
