import { Emoji } from '@/components/Emoji';
import { Toggle } from '@/components/Toggle';
import type { Device, RouterConfig } from '@/core/sim';
import { useEditor } from '../../editorStore';
import { AdvancedSection } from '../AdvancedSection';
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

const GUEST_DEFAULT = { on: false, ssid: 'Guests', password: 'welcome1' };

/** Guest WiFi, and (once VLANs are taught) whether different teams may talk. */
export function RouterAdvanced({ device }: { device: Device }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const vlans = useEditor((s) => s.features.includes('vlans'));
  const config = device.router!;
  const guest = config.guest ?? GUEST_DEFAULT;
  const set = (patch: Partial<RouterConfig>) => updateDevice(device.id, { router: { ...config, ...patch } });
  const setGuest = (patch: Partial<typeof guest>) => set({ guest: { ...guest, ...patch } });

  return (
    <AdvancedSection feature="guestWifi" title="Advanced: Guest WiFi">
      <Toggle label="Guest WiFi" checked={guest.on} onChange={(on) => setGuest({ on })} />
      <p className={styles.hint}>
        A separate WiFi for visitors. Guests can use the Internet, but not your devices.
      </p>
      {guest.on && (
        <>
          <label className={styles.field}>
            Guest WiFi name
            <input
              type="text"
              value={guest.ssid}
              maxLength={20}
              onChange={(e) => setGuest({ ssid: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>
              <Emoji code="1f511" /> Guest password
            </span>
            <input
              type="text"
              value={guest.password}
              maxLength={20}
              autoCapitalize="off"
              autoComplete="off"
              onChange={(e) => setGuest({ password: e.target.value })}
            />
          </label>
          {guest.ssid === config.ssid && config.wifiOn && (
            <p className={styles.warn}>Give the Guest WiFi a different name from the main WiFi!</p>
          )}
        </>
      )}
      {vlans && (
        <>
          <Toggle
            label="Let teams talk"
            checked={config.vlanRouting ?? false}
            onChange={(vlanRouting) => set({ vlanRouting })}
          />
          <p className={styles.hint}>
            Lets devices on different team colours (VLANs) talk through the router.
          </p>
        </>
      )}
    </AdvancedSection>
  );
}
