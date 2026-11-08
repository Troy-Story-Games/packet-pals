import { Emoji } from '@/components/Emoji';
import { Toggle } from '@/components/Toggle';
import type { Device, RouterConfig } from '@/core/sim';
import { useEditor } from '../../editorStore';
import styles from '../Inspector.module.css';

/** WiFi name/password and address hand-out settings for a router. */
export function RouterSection({ device }: { device: Device }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const config = device.router!;
  const set = (patch: Partial<RouterConfig>) => updateDevice(device.id, { router: { ...config, ...patch } });

  return (
    <section className={styles.section}>
      <h3>
        <Emoji code="1f4f6" /> Router settings
      </h3>
      <Toggle label="WiFi" checked={config.wifiOn} onChange={(wifiOn) => set({ wifiOn })} />
      {config.wifiOn && (
        <>
          <label className={styles.field}>
            WiFi name
            <input
              type="text"
              value={config.ssid}
              maxLength={20}
              onChange={(e) => set({ ssid: e.target.value })}
              placeholder="Treehouse"
            />
          </label>
          <label className={styles.field}>
            <span>
              <Emoji code="1f511" /> WiFi password
            </span>
            <input
              type="text"
              value={config.password}
              maxLength={20}
              autoCapitalize="off"
              autoComplete="off"
              onChange={(e) => set({ password: e.target.value })}
            />
          </label>
          {config.password.length < 4 && <p className={styles.warn}>Short passwords are easy to guess!</p>}
        </>
      )}
      <Toggle label="Hand out addresses (DHCP)" checked={config.dhcp} onChange={(dhcp) => set({ dhcp })} />
    </section>
  );
}
