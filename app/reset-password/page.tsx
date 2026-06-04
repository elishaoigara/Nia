'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  /* Wait for the session to be set via the URL hash token */
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setReady(true);
      } else {
        /* If no session yet, try to wait briefly */
        const attempt = setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (d2?.session) setReady(true);
        }, 1500);

        return () => clearTimeout(attempt);
      }
    };

    checkSession();
  }, []); // eslint-disable-line

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
            Choose a new password
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
          {!ready ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#94A3B8', fontSize: 14 }}>
                Verifying reset link…
              </p>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid #334155',
                  borderTopColor: '#8B5CF6',
                  borderRadius: '50%',
                  margin: '16px auto 0',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <h2
                style={{
                  color: '#F1F5F9',
                  fontSize: 20,
                  fontWeight: 700,
                  margin: '0 0 24px',
                  textAlign: 'center',
                }}
              >
                Reset your password
              </h2>

              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: 'block',
                      color: '#94A3B8',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    New password
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
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

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: 'block',
                      color: '#94A3B8',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    Confirm new password
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
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
