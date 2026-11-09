import { useEffect, useRef } from 'react';
import { PipShape } from '@/components/pip/PipShape';
import type { Move } from '@/core/sim';

interface PacketCritterProps {
  /** SVG path from the edge's source to its target. */
  path: string;
  /** Travel from target to source instead. */
  reverse: boolean;
  color: string;
  fate: Move['fate'];
  /** Travelling inside a VPN tunnel: drawn inside a glowing bubble. */
  tunnel?: boolean;
  durationMs: number;
}

/**
 * A tiny Pip that runs along a cable. Uses SVG SMIL animation so it stays smooth
 * without re-rendering React every frame.
 */
export function PacketCritter({ path, reverse, color, fate, tunnel, durationMs }: PacketCritterProps) {
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const fadeRef = useRef<SVGAnimateElement>(null);

  useEffect(() => {
    // Elements added after page load must be started by hand.
    motionRef.current?.beginElement();
    fadeRef.current?.beginElement();
  }, []);

  const from = reverse ? 1 : 0;
  const to = reverse ? 0 : 1;
  const blocked = fate === 'blocked';
  const keyPoints = blocked
    ? `${from};${from + (to - from) * 0.78};${from + (to - from) * 0.5}`
    : `${from};${to}`;
  const keyTimes = blocked ? '0;0.7;1' : '0;1';
  const ignored = fate === 'ignored';

  return (
    <g pointerEvents="none">
      {tunnel && (
        <circle r={26} fill="rgb(168 85 247 / 0.28)" stroke="#a855f7" strokeWidth={3} strokeDasharray="6 4" />
      )}
      <g transform="scale(0.42)">
        <PipShape
          color={ignored ? '#cbd5e1' : color}
          mood={blocked ? 'sad' : ignored ? 'surprised' : 'excited'}
        />
      </g>
      <animateMotion
        ref={motionRef}
        path={path}
        begin="indefinite"
        dur={`${durationMs}ms`}
        keyPoints={keyPoints}
        keyTimes={keyTimes}
        calcMode="linear"
        fill="freeze"
      />
      {(ignored || blocked) && (
        <animate
          ref={fadeRef}
          attributeName="opacity"
          values="1;1;0"
          keyTimes="0;0.85;1"
          begin="indefinite"
          dur={`${durationMs}ms`}
          fill="freeze"
        />
      )}
    </g>
  );
}
