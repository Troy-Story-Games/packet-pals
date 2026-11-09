import { useState } from 'react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { Emoji } from '@/components/Emoji';
import {
  canTarget,
  DEVICE_SPECS,
  DOMAINS,
  isServer,
  knownNames,
  resolveName,
  SERVER_FOR_ACTION,
  serverName,
  type Action,
  type Device,
  type Topology,
} from '@/core/sim';
import { playSound } from '@/services/audio/sfx';
import { ACTION_INFO, ACTIONS } from '../../actions';
import { useEditor } from '../../editorStore';
import styles from '../Inspector.module.css';

/** "Send a packet": pick an action, then (if needed) who to send it to. */
export function SendSection({ device, topo }: { device: Device; topo: Topology }) {
  const send = useEditor((s) => s.send);
  const busy = useEditor((s) => s.playback !== null);
  const [pending, setPending] = useState<Action | null>(null);

  const hostGames = useEditor((s) => s.features.includes('hostGames'));

  /** Where an action can go: devices, or names from the phone book. */
  const options = (action: Action): Array<{ to: string; label: string; device?: Device }> => {
    const devices = (pred: (d: Device) => boolean) =>
      topo.network.devices
        .filter((d) => d.id !== device.id && pred(d))
        .map((d) => ({ to: d.id, label: d.name, device: d }));
    const serverKind = SERVER_FOR_ACTION[action];
    const serverNames = topo.network.devices
      .map((d) => serverName(d)?.toLowerCase())
      .filter((n): n is string => Boolean(n));
    const names = (): Array<{ to: string; label: string }> => {
      // Every server of the right kind, by its website name (there can be several).
      const own = topo.network.devices
        .filter((d) => d.kind === serverKind)
        .map((d) => serverName(d)!.toLowerCase());
      const custom = knownNames(topo, device.id).filter((n) => !serverNames.includes(n));
      const list = [...new Set([...own, ...(action === 'web' ? custom : [])])];
      // No server yet: still offer the usual name so the kid finds out one is missing.
      if (list.length === 0 && serverKind) list.push(DOMAINS[serverKind]!);
      return list.map((n) => ({ to: n, label: n }));
    };
    switch (action) {
      case 'print':
        return devices((d) => d.kind === 'printer');
      case 'video':
        return [...names(), ...devices((d) => Boolean(DEVICE_SPECS[d.kind].isCamera))];
      case 'game':
        return [
          ...names(),
          ...(hostGames ? devices((d) => d.kind === 'console' && canTarget('game', d)) : []),
        ];
      case 'web':
        return names();
      case 'ping': {
        // Like the terminal: things with a name (videos.fun) are offered by name only.
        const allNames = knownNames(topo, device.id);
        const named = new Set(allNames.map((n) => resolveName(topo, device.id, n).deviceId));
        return [
          ...devices((d) => DEVICE_SPECS[d.kind].isHost && !named.has(d.id)),
          ...allNames.map((n) => ({ to: n, label: n })),
        ];
      }
      default:
        return devices((d) => DEVICE_SPECS[d.kind].isHost && !isServer(d.kind));
    }
  };

  const choose = (action: Action) => {
    const opts = options(action);
    // One obvious place to go (like videos.fun): just send it.
    if (!ACTION_INFO[action].needsTarget && opts.length <= 1) {
      setPending(null);
      send(device.id, action, opts[0]?.to);
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
            {options(pending).length === 0 && (
              <p className={styles.warn}>
                {pending === 'print' ? 'There is no printer yet!' : 'There is nobody to send to yet!'}
              </p>
            )}
            {options(pending).map((t) => (
              <button
                key={t.to}
                className={styles.target}
                disabled={busy}
                onClick={() => {
                  send(device.id, pending, t.to);
                  setPending(null);
                }}
              >
                {t.device ? <DeviceArt kind={t.device.kind} size={36} /> : <Emoji code="1f310" size={30} />}
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
