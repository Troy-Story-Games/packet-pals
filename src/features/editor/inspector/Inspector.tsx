import { useMemo } from 'react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { GameIcon } from '@/components/GameIcon';
import { KidButton } from '@/components/KidButton';
import { Toggle } from '@/components/Toggle';
import { DEVICE_SPECS, isServer, Topology } from '@/core/sim';
import { useEditor } from '../editorStore';
import styles from './Inspector.module.css';
import { BuildingInspector } from './BuildingInspector';
import { AddressSection } from './sections/AddressSection';
import { DnsSection } from './sections/DnsSection';
import { FirewallSection } from './sections/FirewallSection';
import { PhoneSection } from './sections/PhoneSection';
import { RouterSection } from './sections/RouterSection';
import { SendSection } from './sections/SendSection';
import { StatusSection } from './sections/StatusSection';
import { WifiSection } from './sections/WifiSection';

/** Settings and actions for the selected device. */
export function Inspector() {
  const selectedId = useEditor((s) => s.selectedId);
  const selectedBuildingId = useEditor((s) => s.selectedBuildingId);
  const network = useEditor((s) => s.network);
  const { updateDevice, removeDevice, select } = useEditor.getState();
  const topo = useMemo(() => new Topology(network), [network]);
  const device = network.devices.find((d) => d.id === selectedId);
  const building = network.decorations?.find((b) => b.id === selectedBuildingId);
  if (building) return <BuildingInspector building={building} />;

  if (!device) {
    return (
      <aside className={`${styles.inspector} ${styles.empty}`}>
        <p>Tap a device to see what it can do!</p>
      </aside>
    );
  }

  const spec = DEVICE_SPECS[device.kind];
  const canSend = spec.isHost && device.kind !== 'router' && !isServer(device.kind);

  return (
    // Keyed by device so per-device form state resets when the selection changes.
    <aside key={device.id} className={styles.inspector} aria-label={`${device.name} settings`}>
      <header className={styles.header}>
        <DeviceArt kind={device.kind} size={52} />
        <input
          className={styles.name}
          value={device.name}
          maxLength={24}
          aria-label="Name"
          onChange={(e) => updateDevice(device.id, { name: e.target.value })}
        />
        <KidButton size="icon" variant="secondary" aria-label="Close" onClick={() => select(null)}>
          <GameIcon name="cross" dark />
        </KidButton>
      </header>
      <p className={styles.blurb}>{spec.blurb}.</p>

      {canSend && device.powered && <SendSection device={device} topo={topo} />}

      <StatusSection device={device} topo={topo} />
      {spec.canCell && device.powered && <PhoneSection device={device} topo={topo} />}
      {spec.canWifi && device.powered && device.network !== 'cell' && (
        <WifiSection device={device} topo={topo} />
      )}
      {device.kind === 'router' && <RouterSection device={device} />}
      {device.kind === 'firewall' && <FirewallSection device={device} />}
      {device.kind === 'dnsServer' && <DnsSection device={device} />}
      {spec.isHost && device.kind !== 'router' && !isServer(device.kind) && (
        <AddressSection device={device} topo={topo} />
      )}

      <section className={styles.section}>
        <Toggle
          label="Power"
          checked={device.powered}
          onChange={(powered) => updateDevice(device.id, { powered })}
        />
        {!device.locked && (
          <KidButton variant="danger" onClick={() => removeDevice(device.id)}>
            <GameIcon name="trashcan" /> Remove {device.name}
          </KidButton>
        )}
      </section>
    </aside>
  );
}
