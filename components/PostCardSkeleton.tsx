export default function PostCardSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div className="skeleton-violet" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-violet" style={{ width: '40%', height: 12 }} />
        <div className="skeleton-violet" style={{ width: '90%', height: 12 }} />
        <div className="skeleton-violet" style={{ width: '70%', height: 12 }} />
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <div className="skeleton-violet" style={{ width: 40, height: 10 }} />
          <div className="skeleton-violet" style={{ width: 40, height: 10 }} />
          <div className="skeleton-violet" style={{ width: 40, height: 10 }} />
        </div>
      </div>
    </div>
  )
}