import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import type { Device, Topology } from '@/core/sim';
import { useEditor } from '../../editorStore';
import styles from '../Inspector.module.css';

const CELL_TEXT = {
  connected: 'Connected to the cell tower',
  outOfRange: 'Too far from the cell tower!',
  noTower: 'No cell tower anywhere!',
  none: '',
};

/** Phones choose between home WiFi and mobile data from a cell tower. */
export function PhoneSection({ device, topo }: { device: Device; topo: Topology }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const onCell = device.network === 'cell';
  const cell = topo.cellStatus(device.id);
  return (
    <section className={styles.section}>
      <h3>
        <Emoji code="1f4f6" /> Connect with
      </h3>
      <div className={styles.row}>
        <KidButton
          variant={onCell ? 'secondary' : 'primary'}
          onClick={() => updateDevice(device.id, { network: 'wifi' })}
        >
          WiFi
        </KidButton>
        <KidButton
          variant={onCell ? 'primary' : 'secondary'}
          onClick={() => updateDevice(device.id, { network: 'cell' })}
        >
          Mobile data
        </KidButton>
      </div>
      {onCell && (
        <p className={cell.state === 'connected' ? undefined : styles.warn}>{CELL_TEXT[cell.state]}</p>
      )}
    </section>
  );
}
