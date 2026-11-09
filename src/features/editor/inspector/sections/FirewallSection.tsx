import { Emoji } from '@/components/Emoji';
import { Toggle } from '@/components/Toggle';
import { APP_LABELS, DEVICE_SPECS, DOMAINS, type AppKind, type Device } from '@/core/sim';
import { useEditor } from '../../editorStore';
import { FirewallDoors } from './FirewallDoors';
import styles from '../Inspector.module.css';

const APPS: AppKind[] = ['game', 'video', 'web', 'chat', 'ping'];

/** Rules: which apps and which devices the firewall stops. */
export function FirewallSection({ device }: { device: Device }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const devices = useEditor((s) => s.network.devices);
  const rules = device.firewall!;
  const hosts = devices.filter((d) => DEVICE_SPECS[d.kind].isHost && d.kind !== 'router' && !DOMAINS[d.kind]);

  const toggle = <K extends 'blockedApps' | 'blockedDevices'>(key: K, value: string, on: boolean) => {
    const list = rules[key] as string[];
    updateDevice(device.id, {
      firewall: { ...rules, [key]: on ? [...list, value] : list.filter((v) => v !== value) },
    });
  };

  return (
    <>
      <section className={styles.section}>
        <h3>
          <Emoji code="1f6e1" /> Firewall rules
        </h3>
        <p className={styles.hint}>Switch on what to BLOCK.</p>
        {APPS.map((app) => (
          <Toggle
            key={app}
            label={`Block ${APP_LABELS[app]}`}
            checked={rules.blockedApps.includes(app)}
            onChange={(on) => toggle('blockedApps', app, on)}
          />
        ))}
        {hosts.length > 0 && <p className={styles.hint}>Block everything from or to a device:</p>}
        {hosts.map((h) => (
          <Toggle
            key={h.id}
            label={`Block ${h.name}`}
            checked={rules.blockedDevices.includes(h.id)}
            onChange={(on) => toggle('blockedDevices', h.id, on)}
          />
        ))}
      </section>
      <FirewallDoors device={device} />
    </>
  );
}
