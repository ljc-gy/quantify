/**
 * Reusable loading placeholder for chart areas.
 * Shows a subtle pulse animation matching the dashboard aesthetic.
 */
export default function ChartLoader({ height = '100%', text = '加载中...' }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 6,
      }}
    >
      {/* Pulse ring */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          borderTopColor: '#8b5cf6',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.05em' }}>
        {text}
      </span>
    </div>
  );
}
