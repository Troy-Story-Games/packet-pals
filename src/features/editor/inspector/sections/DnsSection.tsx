import { useState } from 'react';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { DEVICE_SPECS, normaliseName, serverName, type Device } from '@/core/sim';
import { useEditor } from '../../editorStore';
import { AdvancedSection } from '../AdvancedSection';
import styles from '../Inspector.module.css';

const NAME_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** A DNS server's phone book, with custom names as an advanced unlock. */
export function DnsSection({ device }: { device: Device }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const say = useEditor((s) => s.say);
  const devices = useEditor((s) => s.network.devices);
  const entries = device.dns?.entries ?? [];
  const hosts = devices.filter((d) => DEVICE_SPECS[d.kind].isHost && d.kind !== 'dnsServer');
  const [name, setName] = useState('');
  const [target, setTarget] = useState(hosts.find((h) => h.kind === 'webServer')?.id ?? hosts[0]?.id ?? '');
  const clean = normaliseName(name);
  const valid = NAME_PATTERN.test(clean) && !entries.some((e) => normaliseName(e.name) === clean);
  const nameOf = (id: string) => devices.find((d) => d.id === id)?.name ?? '?';
  const builtIn = devices.map((d) => serverName(d)).filter((n): n is string => Boolean(n));

  return (
    <>
      <section className={styles.section}>
        <h3>
          <Emoji code="1f4d6" /> Phone book
        </h3>
        <p className={styles.hint}>Turns names into addresses, so you don't have to remember numbers.</p>
        <ul className={styles.status}>
          {[...new Set(builtIn)].map((n) => (
            <li key={n}>
              <strong>{n}</strong>
            </li>
          ))}
          {entries.map((e) => (
            <li key={e.name}>
              <strong>{e.name}</strong> → {nameOf(e.deviceId)}
            </li>
          ))}
        </ul>
      </section>
      <AdvancedSection feature="dnsNames" title="Advanced: Your own names">
        {entries.map((e) => (
          <div key={e.name} className={styles.door}>
            <span>
              {e.name} → {nameOf(e.deviceId)}
            </span>
            <KidButton
              variant="secondary"
              onClick={() => updateDevice(device.id, { dns: { entries: entries.filter((x) => x !== e) } })}
            >
              Remove
            </KidButton>
          </div>
        ))}
        <label className={styles.field}>
          Name
          <input
            type="text"
            value={name}
            placeholder="mysite.home"
            autoCapitalize="off"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Belongs to
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        {name && !NAME_PATTERN.test(clean) && (
          <p className={styles.warn}>Names look like word.word, e.g. mysite.home</p>
        )}
        <KidButton
          variant="good"
          disabled={!valid || !target}
          onClick={() => {
            updateDevice(device.id, { dns: { entries: [...entries, { name: clean, deviceId: target }] } });
            say(`${clean} is in the phone book now! It points to ${nameOf(target)}.`, 'excited');
            setName('');
          }}
        >
          Add name
        </KidButton>
      </AdvancedSection>
    </>
  );
}
