import { useState } from 'react';
import { KidButton } from '@/components/KidButton';
import { APP_LABELS, DEVICE_SPECS, DOORS, isServer, type AppKind, type Device } from '@/core/sim';
import { useEditor } from '../../editorStore';
import { AdvancedSection } from '../AdvancedSection';
import styles from '../Inspector.module.css';

const DOOR_APPS: AppKind[] = ['chat', 'ping', 'game', 'web', 'video', 'print'];

/** Port forwarding: open a numbered door so one app can come in to one device. */
export function FirewallDoors({ device }: { device: Device }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const say = useEditor((s) => s.say);
  const devices = useEditor((s) => s.network.devices);
  const doorApps: AppKind[] = useEditor((s) => s.features.includes('vpn'))
    ? [...DOOR_APPS, 'vpn']
    : DOOR_APPS;
  // Servers that can live at home and be visited from outside: websites and VPNs.
  const visitable = (d: Device) => !isServer(d.kind) || d.kind === 'webServer' || d.kind === 'vpnServer';
  const hosts = devices.filter((d) => DEVICE_SPECS[d.kind].isHost && d.kind !== 'router' && visitable(d));
  const rules = device.firewall!;
  const doors = rules.doors ?? [];
  const [app, setApp] = useState<AppKind>('chat');
  const [target, setTarget] = useState(hosts[0]?.id ?? '');

  const setDoors = (next: typeof doors) => updateDevice(device.id, { firewall: { ...rules, doors: next } });
  const nameOf = (id: string) => devices.find((d) => d.id === id)?.name ?? '?';

  return (
    <AdvancedSection feature="doors" title="Advanced: Doors from the Internet">
      <p className={styles.hint}>
        Strangers from the Internet stay out, unless you open a door. Each app knocks on its own numbered door
        (a port).
      </p>
      {doors.length === 0 && <p className={styles.hint}>No doors are open.</p>}
      {doors.map((door) => (
        <div key={`${door.app}-${door.deviceId}`} className={styles.door}>
          <span className={styles.doorNumber}>{DOORS[door.app]}</span>
          <span>
            {APP_LABELS[door.app]} → {nameOf(door.deviceId)}
          </span>
          <KidButton
            variant="secondary"
            onClick={() => setDoors(doors.filter((d) => d !== door))}
            aria-label={`Close the ${APP_LABELS[door.app]} door`}
          >
            Close
          </KidButton>
        </div>
      ))}
      <label className={styles.field}>
        Let in
        <select value={app} onChange={(e) => setApp(e.target.value as AppKind)}>
          {doorApps.map((a) => (
            <option key={a} value={a}>
              {APP_LABELS[a]} (door {DOORS[a]})
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        To
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <KidButton
        variant="good"
        disabled={!target || doors.some((d) => d.app === app && d.deviceId === target)}
        onClick={() => {
          setDoors([...doors, { app, deviceId: target }]);
          say(
            `Door ${DOORS[app]} is open! ${APP_LABELS[app]} from the Internet can now reach ${nameOf(target)}.`,
            'excited',
          );
        }}
      >
        Open the door
      </KidButton>
    </AdvancedSection>
  );
}
