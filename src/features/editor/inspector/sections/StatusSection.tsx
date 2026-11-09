import { Emoji } from '@/components/Emoji';
import { DOMAINS, type Device, type Topology } from '@/core/sim';
import styles from '../Inspector.module.css';

const SOURCE_TEXT = {
  dhcp: 'given by the router',
  static: 'typed in by hand',
  self: 'made up by itself (no router is handing out addresses)',
  public: 'an Internet address',
  carrier: 'from the phone company',
  none: '',
};

/** What this device is connected to and its address, in plain words. */
export function StatusSection({ device, topo }: { device: Device; topo: Topology }) {
  if (!device.powered) {
    return (
      <section className={styles.section}>
        <p className={styles.warn}>
          <Emoji code="1f634" /> {device.name} is switched off.
        </p>
      </section>
    );
  }

  const links = topo.neighbours(device.id);
  const address = topo.address(device.id);
  const domain = DOMAINS[device.kind];

  return (
    <section className={styles.section}>
      <h3>
        <Emoji code="1f50d" /> Connections
      </h3>
      {links.length === 0 ? (
        <p className={styles.warn}>Not connected to anything yet.</p>
      ) : (
        <ul className={styles.status}>
          {links.map((e) => (
            <li key={`${e.via}-${e.linkId ?? topo.other(e, device.id)}`}>
              {e.via === 'wifi' ? 'WiFi' : e.via === 'cell' ? 'Mobile data' : 'Cable'} to{' '}
              <strong>{topo.device(topo.other(e, device.id)).name}</strong>
            </li>
          ))}
        </ul>
      )}
      {address.ip && (
        <p>
          Address: <span className={styles.mono}>{address.ip}</span>
          {SOURCE_TEXT[address.source] && (
            <span className={styles.hint}> ({SOURCE_TEXT[address.source]})</span>
          )}
        </p>
      )}
      {topo.frontDoor(device.id) && (
        <p>
          Internet address (front door): <span className={styles.mono}>{topo.frontDoor(device.id)}</span>
        </p>
      )}
      {device.kind === 'cellTower' && (
        <p className={styles.hint}>Gives phones on Mobile data a signal from far away.</p>
      )}
      {domain && (
        <p>
          Website name: <span className={styles.mono}>{domain}</span>
        </p>
      )}
    </section>
  );
}
