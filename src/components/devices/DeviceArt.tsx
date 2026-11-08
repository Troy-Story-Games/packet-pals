import type { DeviceKind } from '@/core/sim';
import { DEVICE_SPECS } from '@/core/sim';
import { emojiUrl } from '../emojiAssets';

/** Picture of a device: Twemoji where one exists, otherwise drawn in code. */
export function DeviceArt({ kind, size = 64 }: { kind: DeviceKind; size?: number }) {
  const emoji = DEVICE_SPECS[kind].emoji;
  if (emoji) {
    return (
      <img
        src={emojiUrl(emoji)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ display: 'block' }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      {kind === 'router' && <RouterArt />}
      {kind === 'switch' && <BoxArt body="#2563eb" ports={8} arrows />}
      {kind === 'hub' && <BoxArt body="#f97316" ports={4} />}
    </svg>
  );
}

function BoxArt({ body, ports, arrows = false }: { body: string; ports: number; arrows?: boolean }) {
  const portWidth = 44 / ports;
  return (
    <g>
      <rect x={4} y={22} width={56} height={30} rx={7} fill={body} stroke="#1e2a4a" strokeWidth={3} />
      <rect x={8} y={44} width={48} height={4} rx={2} fill="#1e2a4a" opacity={0.25} />
      {Array.from({ length: ports }, (_, i) => (
        <g key={i}>
          <rect x={10 + i * portWidth} y={34} width={portWidth - 2} height={7} rx={1.5} fill="#1e2a4a" />
          <circle
            cx={10 + i * portWidth + (portWidth - 2) / 2}
            cy={29}
            r={1.8}
            fill={i % 3 === 0 ? '#4ade80' : '#facc15'}
          />
        </g>
      ))}
      {arrows ? (
        <path
          d="M22 12 h20 m-5 -5 l5 5 l-5 5 M42 18 h-20"
          fill="none"
          stroke="#1e2a4a"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ) : (
        <g fill="none" stroke="#1e2a4a" strokeWidth={3} strokeLinecap="round">
          <path d="M32 6 v8" />
          <path d="M22 9 l4 6" />
          <path d="M42 9 l-4 6" />
        </g>
      )}
    </g>
  );
}

function RouterArt() {
  return (
    <g strokeLinecap="round">
      <path d="M16 30 L10 6" stroke="#1e2a4a" strokeWidth={4} />
      <path d="M48 30 L54 6" stroke="#1e2a4a" strokeWidth={4} />
      <circle cx={10} cy={6} r={3.5} fill="#ef4444" stroke="#1e2a4a" strokeWidth={2} />
      <circle cx={54} cy={6} r={3.5} fill="#ef4444" stroke="#1e2a4a" strokeWidth={2} />
      <rect x={4} y={28} width={56} height={26} rx={9} fill="#334155" stroke="#1e2a4a" strokeWidth={3} />
      <rect x={10} y={46} width={44} height={3} rx={1.5} fill="#0f172a" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={14 + i * 9} cy={37} r={2.6} fill={i === 0 ? '#38bdf8' : '#4ade80'} />
      ))}
    </g>
  );
}
