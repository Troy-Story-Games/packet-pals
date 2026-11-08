import { useState } from 'react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { Emoji } from '@/components/Emoji';
import { DEVICE_SPECS, DOMAINS, type Action, type Device, type Topology } from '@/core/sim';
import { playSound } from '@/services/audio/sfx';
import { ACTION_INFO, ACTIONS } from '../../actions';
import { useEditor } from '../../editorStore';
import styles from '../Inspector.module.css';

/** "Send a packet": pick an action, then (if needed) who to send it to. */
export function SendSection({ device, topo }: { device: Device; topo: Topology }) {
  const send = useEditor((s) => s.send);
  const busy = useEditor((s) => s.playback !== null);
  const [pending, setPending] = useState<Action | null>(null);

  const targets = (action: Action) =>
    topo.network.devices.filter((d) => {
      if (d.id === device.id) return false;
      if (action === 'print') return d.kind === 'printer';
      return DEVICE_SPECS[d.kind].isHost && !DOMAINS[d.kind];
    });

  const choose = (action: Action) => {
    if (!ACTION_INFO[action].needsTarget) {
      setPending(null);
      send(device.id, action);
      return;
    }
    playSound('tap');
    setPending(pending === action ? null : action);
  };

  return (
    <section className={styles.section}>
      <h3>
        <Emoji code="1f4e8" /> Send a packet
      </h3>
      <div className={styles.actions}>
        {ACTIONS.map((action) => (
          <button
            key={action}
            className={`${styles.action} ${pending === action ? styles.actionActive : ''}`}
            style={{ '--action': ACTION_INFO[action].color } as React.CSSProperties}
            disabled={busy}
            onClick={() => choose(action)}
          >
            <Emoji code={ACTION_INFO[action].emoji} size={30} />
            {ACTION_INFO[action].label}
          </button>
        ))}
      </div>
      {pending && (
        <>
          <p className={styles.hint}>Send it to...</p>
          <div className={styles.targets}>
            {targets(pending).length === 0 && (
              <p className={styles.warn}>
                {pending === 'print' ? 'There is no printer yet!' : 'There is nobody to send to yet!'}
              </p>
            )}
            {targets(pending).map((t) => (
              <button
                key={t.id}
                className={styles.target}
                disabled={busy}
                onClick={() => {
                  send(device.id, pending, t.id);
                  setPending(null);
                }}
              >
                <DeviceArt kind={t.kind} size={36} />
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
