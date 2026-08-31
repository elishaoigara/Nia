'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import UnityLine from '@/components/UnityLine';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  /* Wait for the session to be set via the URL hash token */
  useEffect(() => {
    let cancelled = false;
    let attempt: ReturnType<typeof setTimeout> | undefined;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) {
        setReady(true);
        setInvalidLink(false);
      }
    });

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session) {
        setReady(true);
        return;
      }

      attempt = setTimeout(async () => {
        const { data: retryData } = await supabase.auth.getSession();
        if (cancelled) return;
        if (retryData?.session) setReady(true);
        else setInvalidLink(true);
      }, 2500);
    };

    void checkSession();
    return () => {
      cancelled = true;
      if (attempt) clearTimeout(attempt);
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    /* Password updated — sign out and redirect to login */
    await supabase.auth.signOut();
    router.push('/login');
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
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Nia
            </h1>
          </div>
          <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 14 }}>
            Choose a new password
          </p>
          <UnityLine />
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
          {invalidLink ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>
                This reset link is no longer valid
              </h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 18 }}>
                It may have expired or already been used. Request a fresh link to continue.
              </p>
              <Link href="/forgot-password" className="btn-primary" style={{ textDecoration: 'none' }}>
                Request a new link
              </Link>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                Verifying reset link…
              </p>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--nia-violet)',
                  borderRadius: '50%',
                  margin: '16px auto 0',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: '0 0 24px', textAlign: 'center' }}>
                Reset your password
              </h2>

              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 6 }}>
                    New password
                  </label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
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

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 6 }}>
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={8}
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
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
