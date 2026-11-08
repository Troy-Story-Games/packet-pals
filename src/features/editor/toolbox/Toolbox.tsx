import { useReactFlow } from '@xyflow/react';
import { motion } from 'motion/react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { GameIcon } from '@/components/GameIcon';
import { DEVICE_SPECS, type DeviceKind } from '@/core/sim';
import { useProgress } from '@/game/progressStore';
import { isKindUnlocked, unlockMission } from '@/game/unlocks';
import { playSound } from '@/services/audio/sfx';
import { NODE_WIDTH } from '../actions';
import { useEditor } from '../editorStore';
import styles from './Toolbox.module.css';

/** Device cards. Tapping one drops that device in the middle of the view. */
export function Toolbox() {
  const kinds = useEditor((s) => s.tools);
  const sandbox = useEditor((s) => s.sandbox);
  const count = useEditor((s) => s.network.devices.length);
  const addDevice = useEditor((s) => s.addDevice);
  const say = useEditor((s) => s.say);
  const missionStars = useProgress((s) => s.missionStars);
  const { screenToFlowPosition } = useReactFlow();

  if (kinds.length === 0) return null;

  const add = (kind: DeviceKind) => {
    const pane = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!pane) return;
    const centre = screenToFlowPosition({ x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 });
    // Fan new devices out a little so they don't land exactly on top of each other.
    const offset = (count % 6) * 26;
    addDevice(kind, centre.x - NODE_WIDTH / 2 + offset, centre.y - 50 + offset);
  };

  return (
    <div className={styles.toolbox} aria-label="Add devices">
      {kinds.map((kind, i) => {
        const locked = sandbox && !isKindUnlocked(kind, missionStars);
        const mission = unlockMission(kind);
        return (
          <motion.button
            key={kind}
            className={`${styles.card} ${locked ? styles.locked : ''}`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (locked) {
                playSound('bounce');
                say(
                  `Finish mission ${mission?.number} "${mission?.title}" to unlock the ${DEVICE_SPECS[kind].label}!`,
                  'think',
                );
                return;
              }
              add(kind);
            }}
          >
            <DeviceArt kind={kind} size={44} />
            <strong>{DEVICE_SPECS[kind].label}</strong>
            {locked && (
              <span className={styles.lock}>
                <GameIcon name="locked" size={16} /> Mission {mission?.number}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
