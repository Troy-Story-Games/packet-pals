import type { CSSProperties } from 'react';
import { BaseEdge, useInternalNode, type Edge, type EdgeProps } from '@xyflow/react';
import type { Via } from '@/core/sim';
import { ACTION_INFO, ART_CENTER_Y, STEP_MS } from '../actions';
import { useEditor } from '../editorStore';
import { PacketCritter } from './PacketCritter';
import styles from './NetworkEdge.module.css';

export type NetworkEdgeData = {
  via: Via;
  linkId?: string;
  /** Team (VLAN) colour, for painted switch sockets and Guest WiFi. */
  team?: string;
};

/** Packet colours for helper packets; the real packet uses its action's colour. */
const HELPER_COLORS = { lookup: '#14b8a6', arp: '#f59e0b' } as const;
export type NetworkEdgeType = Edge<NetworkEdgeData, 'network'>;

function useCentre(id: string): { x: number; y: number } | null {
  const node = useInternalNode(id);
  if (!node) return null;
  const width = node.measured.width ?? 0;
  return {
    x: node.internals.positionAbsolute.x + width / 2,
    y: node.internals.positionAbsolute.y + ART_CENTER_Y,
  };
}

/** A cable (solid) or WiFi link (dashed radio waves) between device centres, with packets riding on it. */
export function NetworkEdge({ id, source, target, data }: EdgeProps<NetworkEdgeType>) {
  const s = useCentre(source);
  const t = useCentre(target);
  const playback = useEditor((st) => st.playback);
  const tool = useEditor((st) => st.tool);
  if (!s || !t || !data) return null;

  const path = `M${s.x} ${s.y} L${t.x} ${t.y}`;
  const wifi = data.via === 'wifi';
  const cell = data.via === 'cell';

  const steps = playback
    ? playback.phase === 'forward'
      ? playback.journey.steps
      : playback.journey.replySteps
    : [];
  const moves = playback
    ? (steps[playback.step]?.moves ?? []).filter(
        (m) =>
          m.via === data.via &&
          ((m.from === source && m.to === target) || (m.from === target && m.to === source)),
      )
    : [];
  const step = steps[playback?.step ?? 0];
  const helper = step?.packet === 'lookup' || step?.packet === 'arp' ? step.packet : undefined;
  const color = helper
    ? HELPER_COLORS[helper]
    : playback
      ? ACTION_INFO[playback.journey.action].color
      : '#fff';

  return (
    <>
      {/* Wide invisible stroke so cables are easy to tap with a finger. */}
      <path
        d={path}
        className={styles.hitArea}
        data-erase={tool === 'erase' && !wifi && !cell ? 'true' : undefined}
      />
      {wifi || cell ? (
        <BaseEdge
          id={id}
          path={path}
          className={cell ? styles.cell : styles.wifi}
          style={data.team ? ({ '--team': data.team } as CSSProperties) : undefined}
        />
      ) : (
        <>
          <path d={path} className={styles.cableShadow} />
          <BaseEdge
            id={id}
            path={path}
            className={`${styles.cable} ${tool === 'erase' ? styles.erasable : ''}`}
            style={data.team && tool !== 'erase' ? ({ '--team': data.team } as CSSProperties) : undefined}
          />
        </>
      )}
      {moves.map((m, i) => (
        <PacketCritter
          key={`${playback!.token}-${playback!.phase}-${playback!.step}-${i}`}
          path={path}
          reverse={m.from !== source}
          color={color}
          fate={m.fate}
          tunnel={step?.packet === 'tunnel'}
          durationMs={STEP_MS * 0.92}
        />
      ))}
    </>
  );
}
