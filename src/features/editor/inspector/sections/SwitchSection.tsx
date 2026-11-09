import { VLANS, GUEST_VLAN, vlanInfo, type Device } from '@/core/sim';
import { useEditor } from '../../editorStore';
import { AdvancedSection } from '../AdvancedSection';
import styles from '../Inspector.module.css';

/** Teams a switch socket can be painted (Guests belong to the router's Guest WiFi). */
const TEAMS = VLANS.filter((v) => v.id !== GUEST_VLAN);
/** Cables to these carry every team, like real "trunk" ports. */
const ALL_TEAMS_KINDS = new Set(['switch', 'router', 'firewall']);

/** VLANs: paint each switch socket a team colour. */
export function SwitchSection({ device }: { device: Device }) {
  const network = useEditor((s) => s.network);
  const setLinkTeam = useEditor((s) => s.setLinkTeam);
  const links = network.links.filter((l) => l.a === device.id || l.b === device.id);

  return (
    <AdvancedSection feature="vlans" title="Advanced: Team colours (VLANs)">
      <p className={styles.hint}>
        Tap a socket to change its team. Only devices on the same team can talk through the switch.
      </p>
      {links.length === 0 && <p className={styles.hint}>Plug some cables in first!</p>}
      {links.map((link) => {
        const other = network.devices.find((d) => d.id === (link.a === device.id ? link.b : link.a));
        if (!other) return null;
        if (ALL_TEAMS_KINDS.has(other.kind)) {
          return (
            <div key={link.id} className={styles.socket}>
              <span>{other.name}</span>
              <span className={`${styles.teamPill} ${styles.allTeams}`}>All teams</span>
            </div>
          );
        }
        const team = vlanInfo(link.vlan);
        const next = TEAMS[(TEAMS.findIndex((t) => t.id === team.id) + 1) % TEAMS.length];
        return (
          <div key={link.id} className={styles.socket}>
            <span>{other.name}</span>
            <button
              className={styles.teamPill}
              style={{ background: team.color }}
              aria-label={`${other.name} is on the ${team.name}. Change to ${next.name}`}
              onClick={() => setLinkTeam(link.id, next.id)}
            >
              {team.name}
            </button>
          </div>
        );
      })}
    </AdvancedSection>
  );
}
