import { Emoji } from '@/components/Emoji';
import { DOMAINS, macOf, vlanInfo, type Device, type Topology } from '@/core/sim';
import { useSettings } from '@/services/settings';
import { useEditor } from '../../editorStore';
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
  const showTeams = useEditor((s) => s.features.includes('vlans') || s.features.includes('guestWifi'));
  const arpTaught = useEditor((s) => s.features.includes('arp'));
  const helpers = useSettings((s) => s.helpers);
  const showMac = arpTaught && helpers;
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
  // Teams only matter on a switch socket or the Guest WiFi, so don't show Blue everywhere.
  const onSwitch = links.some((e) => topo.device(topo.other(e, device.id)).kind === 'switch');

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
      {showTeams && address.vlan !== undefined && (address.vlan !== 1 || onSwitch) && (
        <p>
          Team: <span className={styles.teamDot} style={{ background: vlanInfo(address.vlan).color }} />{' '}
          <strong>{vlanInfo(address.vlan).name}</strong>
        </p>
      )}
      {showMac && address.ip && (
        <p>
          Hardware address (MAC): <span className={styles.mono}>{macOf(device.id)}</span>
        </p>
      )}
      {device.vpn && topo.devices.has(device.vpn) && (
        <p>
          <Emoji code="1f510" /> Using the VPN: <strong>{topo.device(device.vpn).name}</strong>
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
      {domain && <ServerName device={device} topo={topo} />}
    </section>
  );
}

const NAME_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** A server's website name, which kids can change (e.g. to have two video sites). */
function ServerName({ device, topo }: { device: Device; topo: Topology }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const name = device.domain ?? DOMAINS[device.kind] ?? '';
  const clean = name.trim().toLowerCase();
  const valid = NAME_PATTERN.test(clean);
  const clash = topo.network.devices.some(
    (d) => d.id !== device.id && (d.domain ?? DOMAINS[d.kind])?.toLowerCase() === clean,
  );
  return (
    <label className={styles.field}>
      Website name
      <input
        type="text"
        value={name}
        maxLength={40}
        autoCapitalize="off"
        aria-label="Website name"
        onChange={(e) => updateDevice(device.id, { domain: e.target.value.toLowerCase().replace(/\s/g, '') })}
      />
      {!valid && <span className={styles.warn}>Names look like word.word, e.g. dinos.fun</span>}
      {valid && clash && <span className={styles.warn}>Another server already has this name!</span>}
    </label>
  );
}
