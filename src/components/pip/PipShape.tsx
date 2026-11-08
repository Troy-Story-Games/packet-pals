export type PipMood = 'happy' | 'excited' | 'sad' | 'think' | 'surprised';

interface PipShapeProps {
  /** Body colour. */
  color?: string;
  mood?: PipMood;
}

/**
 * Pip the Packet, drawn procedurally: an envelope with a face. Fits a 100×80 box
 * centred on (0, 0) so it can be placed anywhere inside an SVG.
 */
export function PipShape({ color = '#38bdf8', mood = 'happy' }: PipShapeProps) {
  const eyeY = mood === 'sad' ? 4 : 0;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* feet */}
      <ellipse cx={-18} cy={38} rx={10} ry={5} fill="#1e2a4a" />
      <ellipse cx={18} cy={38} rx={10} ry={5} fill="#1e2a4a" />
      {/* body */}
      <rect x={-46} y={-30} width={92} height={66} rx={14} fill={color} stroke="#1e2a4a" strokeWidth={5} />
      {/* envelope flap */}
      <path d="M-42 -26 L0 6 L42 -26" fill="none" stroke="#1e2a4a" strokeWidth={4} opacity={0.35} />
      {/* cheeks */}
      <circle cx={-28} cy={16} r={6} fill="#ff8fab" opacity={0.7} />
      <circle cx={28} cy={16} r={6} fill="#ff8fab" opacity={0.7} />
      <Eyes mood={mood} y={eyeY} />
      <Mouth mood={mood} />
    </g>
  );
}

function Eyes({ mood, y }: { mood: PipMood; y: number }) {
  if (mood === 'happy' || mood === 'excited') {
    // Smiling "^ ^" eyes.
    return (
      <g fill="none" stroke="#1e2a4a" strokeWidth={5}>
        <path d={`M-24 ${y + 2} q8 -10 16 0`} />
        <path d={`M8 ${y + 2} q8 -10 16 0`} />
      </g>
    );
  }
  const r = mood === 'surprised' ? 10 : 9;
  const pupilShift = mood === 'think' ? -3 : 0;
  return (
    <g>
      <circle cx={-16} cy={y} r={r} fill="#fff" stroke="#1e2a4a" strokeWidth={3} />
      <circle cx={16} cy={y} r={r} fill="#fff" stroke="#1e2a4a" strokeWidth={3} />
      <circle cx={-16 + pupilShift} cy={y + pupilShift} r={4.5} fill="#1e2a4a" />
      <circle cx={16 + pupilShift} cy={y + pupilShift} r={4.5} fill="#1e2a4a" />
      {mood === 'sad' && (
        <g stroke="#1e2a4a" strokeWidth={3}>
          <path d={`M-26 ${y - 14} l14 4`} />
          <path d={`M26 ${y - 14} l-14 4`} />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: PipMood }) {
  switch (mood) {
    case 'excited':
      return <path d="M-12 14 q12 16 24 0 z" fill="#7f1d1d" stroke="#1e2a4a" strokeWidth={3} />;
    case 'sad':
      return <path d="M-10 22 q10 -8 20 0" fill="none" stroke="#1e2a4a" strokeWidth={4} />;
    case 'surprised':
      return <ellipse cx={0} cy={18} rx={6} ry={7} fill="#7f1d1d" stroke="#1e2a4a" strokeWidth={3} />;
    case 'think':
      return <path d="M-8 18 h14" stroke="#1e2a4a" strokeWidth={4} />;
    default:
      return <path d="M-10 14 q10 10 20 0" fill="none" stroke="#1e2a4a" strokeWidth={4} />;
  }
}
