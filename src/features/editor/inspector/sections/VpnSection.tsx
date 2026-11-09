import { KidButton } from '@/components/KidButton';
import type { Device } from '@/core/sim';
import { useEditor } from '../../editorStore';
import { AdvancedSection } from '../AdvancedSection';
import styles from '../Inspector.module.css';

/** Send everything through a secret tunnel to a VPN server. */
export function VpnSection({ device }: { device: Device }) {
  const updateDevice = useEditor((s) => s.updateDevice);
  const say = useEditor((s) => s.say);
  const devices = useEditor((s) => s.network.devices);
  const servers = devices.filter((d) => d.kind === 'vpnServer');

  const choose = (vpn: Device | undefined) => {
    updateDevice(device.id, { vpn: vpn?.id });
    say(
      vpn
        ? `All of ${device.name}'s packets now travel through a secret tunnel to ${vpn.name}!`
        : `VPN off. ${device.name}'s packets go the normal way again.`,
      vpn ? 'excited' : 'happy',
    );
  };

  return (
    <AdvancedSection feature="vpn" title="Advanced: VPN">
      {servers.length === 0 ? (
        <p className={styles.hint}>There is no VPN server to connect to yet.</p>
      ) : (
        <>
          <p className={styles.hint}>Connect to a VPN server. Everything will travel inside its tunnel.</p>
          <div className={styles.row}>
            <KidButton variant={device.vpn ? 'secondary' : 'primary'} onClick={() => choose(undefined)}>
              Off
            </KidButton>
            {servers.map((s) => (
              <KidButton
                key={s.id}
                variant={device.vpn === s.id ? 'primary' : 'secondary'}
                onClick={() => choose(s)}
              >
                {s.name}
              </KidButton>
            ))}
          </div>
        </>
      )}
    </AdvancedSection>
  );
}
