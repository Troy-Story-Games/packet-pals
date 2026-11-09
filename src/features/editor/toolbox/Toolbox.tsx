import { useReactFlow } from '@xyflow/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { BuildingArt } from '@/components/buildings/BuildingArt';
import { LAYOUTS } from '@/components/buildings/layouts';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { Emoji } from '@/components/Emoji';
import { GameIcon } from '@/components/GameIcon';
import { DEVICE_SPECS, type BuildingTemplate, type DeviceKind } from '@/core/sim';
import { useProgress } from '@/game/progressStore';
import { isKindUnlocked, toolboxGroup, unlockMission } from '@/game/unlocks';
import { playSound } from '@/services/audio/sfx';
import { NODE_WIDTH } from '../actions';
import { useEditor } from '../editorStore';
import styles from './Toolbox.module.css';

type Tab = 'devices' | 'smart' | 'buildings';

const TABS: Array<{ id: Tab; label: string; emoji: string }> = [
  { id: 'devices', label: 'Devices', emoji: '1f5a5' },
  { id: 'smart', label: 'Smart Home', emoji: '1f4a1' },
  { id: 'buildings', label: 'Buildings', emoji: '1f3e1' },
];

const BUILDINGS: Array<{ template: BuildingTemplate; label: string }> = [
  { template: 'house1', label: 'House' },
  { template: 'house2', label: 'Two floors' },
  { template: 'house3', label: 'With basement' },
  { template: 'office', label: 'Office' },
];

const PREVIEW_COLORS = { walls: '#fde68a', roof: '#ef4444', floors: '#fef3c7', trim: '#78350f' };

/** Device and building cards. Tapping one drops it in the middle of the view. */
export function Toolbox() {
  const kinds = useEditor((s) => s.tools);
  const sandbox = useEditor((s) => s.sandbox);
  const count = useEditor((s) => s.network.devices.length);
  const addDevice = useEditor((s) => s.addDevice);
  const addBuilding = useEditor((s) => s.addBuilding);
  const say = useEditor((s) => s.say);
  const missionStars = useProgress((s) => s.missionStars);
  const { screenToFlowPosition, fitBounds } = useReactFlow();
  const [tab, setTab] = useState<Tab>('devices');

  if (kinds.length === 0) return null;

  const centre = () => {
    const pane = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!pane) return null;
    return screenToFlowPosition({ x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 });
  };

  const add = (kind: DeviceKind) => {
    const c = centre();
    if (!c) return;
    // Fan new devices out a little so they don't land exactly on top of each other.
    const offset = (count % 6) * 26;
    addDevice(kind, c.x - NODE_WIDTH / 2 + offset, c.y - 50 + offset);
  };

  const groups = new Set(kinds.map(toolboxGroup));
  const tabs = TABS.filter((t) => (t.id === 'buildings' ? sandbox : groups.has(t.id)));
  const shown = kinds.filter((k) => toolboxGroup(k) === tab);

  return (
    <div className={styles.wrap}>
      {tabs.length > 1 && (
        <div className={styles.tabs} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => {
                playSound('toggle');
                setTab(t.id);
              }}
            >
              <Emoji code={t.emoji} size={22} /> {t.label}
            </button>
          ))}
        </div>
      )}
      <div className={styles.toolbox} aria-label="Add things">
        {tab === 'buildings'
          ? BUILDINGS.map((b, i) => (
              <motion.button
                key={b.template}
                className={styles.card}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const c = centre();
                  const layout = LAYOUTS[b.template];
                  if (!c) return;
                  const x = c.x - layout.width / 2;
                  const y = c.y - layout.height / 2;
                  addBuilding(b.template, x, y);
                  // Buildings are big: zoom out so the whole thing is in view.
                  void fitBounds(
                    { x, y, width: layout.width, height: layout.height },
                    { padding: 0.1, duration: 500 },
                  );
                }}
              >
                <span className={styles.buildingPreview}>
                  <span style={{ transform: `scale(${56 / LAYOUTS[b.template].height})` }}>
                    <BuildingArt
                      building={{ id: 'preview', template: b.template, x: 0, y: 0, colors: PREVIEW_COLORS }}
                    />
                  </span>
                </span>
                <strong>{b.label}</strong>
              </motion.button>
            ))
          : shown.map((kind, i) => {
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
    </div>
  );
}
