import { useState } from 'react';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import type { Device, Topology } from '@/core/sim';
import { useEditor } from '../../editorStore';
import styles from '../Inspector.module.css';

const STATE_TEXT = {
  connected: 'Connected',
  wrongPassword: 'Wrong password!',
  outOfRange: 'Too far from the router!',
  noSuchNetwork: "Can't find that WiFi",
  none: 'Not on WiFi',
};

/** Pick a WiFi network in range and type its password. */
export function WifiSection({ device, topo }: { device: Device; topo: Topology }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const status = topo.wifiStatus(device.id);
  const inRange = topo
    .networksInRange(device)
    .map((r) => r.router!.ssid)
    .filter(Boolean);
  const ssids = [...new Set(inRange)];
  const [ssid, setSsid] = useState(device.wifi?.ssid ?? ssids[0] ?? '');
  const [password, setPassword] = useState(device.wifi?.password ?? '');

  return (
    <section className={styles.section}>
      <h3>
        <Emoji code="1f4f6" /> WiFi
      </h3>
      <p className={status.state === 'connected' ? undefined : styles.warn}>
        {STATE_TEXT[status.state]}
        {device.wifi && status.state !== 'none' && ` (${device.wifi.ssid})`}
      </p>
      {ssids.length === 0 ? (
        <p className={styles.hint}>
          No WiFi networks nearby. Is there a router with WiFi switched on close by?
        </p>
      ) : (
        <>
          <p className={styles.hint}>WiFi networks nearby:</p>
          <div className={styles.row}>
            {ssids.map((name) => (
              <KidButton
                key={name}
                variant={ssid === name ? 'primary' : 'secondary'}
                onClick={() => setSsid(name)}
              >
                {name}
              </KidButton>
            ))}
          </div>
          <label className={styles.field}>
            Password
            <input
              type="text"
              value={password}
              autoCapitalize="off"
              autoComplete="off"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className={styles.row}>
            <KidButton
              variant="good"
              disabled={!ssid}
              onClick={() => updateDevice(device.id, { wifi: { ssid, password } })}
              sound={null}
            >
              Join WiFi
            </KidButton>
            {device.wifi && (
              <KidButton variant="secondary" onClick={() => updateDevice(device.id, { wifi: undefined })}>
                Leave
              </KidButton>
            )}
          </div>
        </>
      )}
    </section>
  );
}
