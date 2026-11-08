import { useState } from 'react';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import type { Device, Topology } from '@/core/sim';
import { useEditor } from '../../editorStore';
import styles from '../Inspector.module.css';

const IP_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function validIp(ip: string): boolean {
  const m = IP_PATTERN.exec(ip.trim());
  return Boolean(m && m.slice(1).every((n) => Number(n) <= 255));
}

/** Automatic (DHCP) or a typed-in address. */
export function AddressSection({ device, topo }: { device: Device; topo: Topology }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const [draft, setDraft] = useState(device.staticIp ?? topo.address(device.id).ip ?? '192.168.1.50');
  const automatic = device.staticIp === undefined;

  return (
    <section className={styles.section}>
      <h3>
        <Emoji code="1f3e0" /> Address
      </h3>
      <p className={styles.hint}>An address is like a house number, so packets know where to go.</p>
      <div className={styles.row}>
        <KidButton
          variant={automatic ? 'primary' : 'secondary'}
          onClick={() => updateDevice(device.id, { staticIp: undefined })}
        >
          Automatic
        </KidButton>
        <KidButton
          variant={!automatic ? 'primary' : 'secondary'}
          onClick={() => validIp(draft) && updateDevice(device.id, { staticIp: draft.trim() })}
        >
          Type it in
        </KidButton>
      </div>
      {!automatic && (
        <label className={styles.field}>
          Address
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (validIp(e.target.value)) updateDevice(device.id, { staticIp: e.target.value.trim() });
            }}
          />
          {!validIp(draft) && (
            <span className={styles.warn}>Four numbers from 0 to 255, with dots between.</span>
          )}
        </label>
      )}
    </section>
  );
}
