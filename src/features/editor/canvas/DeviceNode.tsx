import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { Emoji } from '@/components/Emoji';
import type { Device } from '@/core/sim';
import { ACTION_INFO, ART_CENTER_Y, NODE_WIDTH } from '../actions';
import { useEditor } from '../editorStore';
import styles from './DeviceNode.module.css';

export type DeviceNodeData = {
  device: Device;
  ip: string | null;
  /** Twemoji code for the device's mood face. */
  face: string;
  /** Signal ring: WiFi for routers, mobile data for cell towers. `color` is "r g b". */
  range: { radius: number; color: string } | null;
};
export type DeviceNodeType = Node<DeviceNodeData, 'device'>;

export function DeviceNode({ id, data }: NodeProps<DeviceNodeType>) {
  const { device, ip, face, range } = data;
  const selected = useEditor((s) => s.selectedId === id);
  const cableStart = useEditor((s) => s.cableFrom === id);
  const tool = useEditor((s) => s.tool);
  const reaction = useEditor((s) => (s.reaction?.deviceId === id ? s.reaction : null));

  const classes = [
    styles.node,
    selected && styles.selected,
    cableStart && styles.cableStart,
    !device.powered && styles.off,
    tool === 'erase' && !device.locked && styles.erasable,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={{ width: NODE_WIDTH }}>
      {range && (
        <div
          className={styles.wifiRange}
          style={
            {
              width: range.radius * 2,
              height: range.radius * 2,
              left: NODE_WIDTH / 2 - range.radius,
              top: ART_CENTER_Y - range.radius,
              '--ring': range.color,
            } as React.CSSProperties
          }
        >
          <span />
          <span />
          <span />
        </div>
      )}

      {/* One handle covering the whole device; only active with the cable tool. */}
      <Handle
        type="source"
        position={Position.Top}
        className={tool === 'cable' ? styles.handleActive : styles.handleHidden}
        isConnectable={tool === 'cable'}
      />

      <div className={styles.art}>
        <motion.div
          key={reaction?.token ?? 'idle'}
          animate={reaction ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : undefined}
          transition={{ duration: 0.6 }}
        >
          <DeviceArt kind={device.kind} size={68} />
        </motion.div>
        <span className={styles.face}>
          <Emoji code={face} size={28} />
        </span>
      </div>
      <div className={styles.name}>{device.name}</div>
      {ip && <div className={styles.ip}>{ip}</div>}
      {device.kind === 'router' && device.router?.wifiOn && device.router.ssid && (
        <div className={styles.ssid}>
          <Emoji code="1f4f6" size={16} /> {device.router.ssid}
        </div>
      )}
      {device.kind === 'router' && device.router?.guest?.on && device.router.guest.ssid && (
        <div className={`${styles.ssid} ${styles.guestSsid}`}>
          <Emoji code="1f465" size={16} /> {device.router.guest.ssid}
        </div>
      )}

      <AnimatePresence>
        {reaction && (
          <motion.div
            key={reaction.token}
            className={`${styles.pop} ${styles[reaction.outcome]}`}
            initial={{ y: 10, scale: 0, opacity: 0 }}
            animate={{ y: -10, scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Emoji
              code={
                reaction.outcome === 'delivered'
                  ? ACTION_INFO[reaction.action].emoji
                  : reaction.outcome === 'blocked'
                    ? '1f6d1'
                    : '1f635'
              }
              size={30}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
