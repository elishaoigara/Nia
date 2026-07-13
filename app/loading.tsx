export default function Loading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-0)',
      }}
    >
      <img
        src="/logo/nia-icon.svg"
        alt=""
        width={56}
        height={56}
        style={{ borderRadius: 16, animation: 'pulse-logo 1.1s ease-in-out infinite' }}
      />
      <style>{`
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.92); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}