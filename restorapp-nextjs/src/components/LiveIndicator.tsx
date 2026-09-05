'use client';

export default function LiveIndicator({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        marginLeft: 12,
        fontSize: 12,
        fontWeight: 600,
        color: '#B45309',
        background: '#FEF3C7',
        padding: '3px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B45309', display: 'inline-block' }} />
      Sin conexión en vivo
    </span>
  );
}