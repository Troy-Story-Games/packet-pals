import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { Emoji } from '@/components/Emoji';
import { GrownUpGate } from '@/components/GrownUpGate';
import { KidButton } from '@/components/KidButton';
import { Page } from '@/components/Page';
import { Panel } from '@/components/Panel';
import { BADGES } from '@/game/badges';
import { levelForXp, levelTitle, xpForLevel } from '@/game/levels';
import { exportSave, useProgress } from '@/game/progressStore';
import styles from './TrophiesScreen.module.css';

const STAT_LABELS: Array<[keyof ReturnType<typeof useProgress.getState>['stats'], string, string]> = [
  ['packetsDelivered', 'Packets delivered', '1f4e8'],
  ['packetsBlocked', 'Packets blocked', '1f6e1'],
  ['cablesConnected', 'Cables connected', '1f50c'],
  ['wifiJoins', 'WiFi joins', '1f4f6'],
  ['devicesPlaced', 'Devices placed', '1f3d7'],
  ['internetTrips', 'Trips to the Internet', '1f310'],
  ['biggestNetwork', 'Biggest network', '1f680'],
];

export function TrophiesScreen() {
  const { xp, stats, badges, streak, importSave, reset } = useProgress();
  const [gate, setGate] = useState<'reset' | null>(null);
  const [importError, setImportError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const level = levelForXp(xp);
  const toNext = xpForLevel(level + 1) - xp;

  const download = () => {
    const blob = new Blob([JSON.stringify(exportSave(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'packet-pals-save.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImportError(!importSave(JSON.parse(await file.text())));
    } catch {
      setImportError(true);
    }
  };

  return (
    <Page title="Trophies" emoji="1f3c6" wide>
      <div className={styles.top}>
        <Panel tone="yellow" className={styles.levelCard}>
          <motion.div
            className={styles.bigLevel}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          >
            {level}
          </motion.div>
          <div>
            <h2>{levelTitle(level)}</h2>
            <p>
              <strong>{xp}</strong> XP · {toNext} XP to level {level + 1}
            </p>
            {streak.count > 0 && (
              <p>
                <Emoji code="1f525" /> {streak.count} day{streak.count === 1 ? '' : 's'} in a row
              </p>
            )}
          </div>
        </Panel>

        <Panel className={styles.stats}>
          <h3>My numbers</h3>
          <ul>
            {STAT_LABELS.map(([key, label, emoji]) => (
              <li key={key}>
                <Emoji code={emoji} /> {label}
                <strong>{stats[key]}</strong>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <h2 className={styles.heading}>
        Badges ({badges.length} of {BADGES.length})
      </h2>
      <div className={styles.badges}>
        {BADGES.map((b, i) => {
          const earned = badges.includes(b.id);
          return (
            <motion.div
              key={b.id}
              className={`${styles.badge} ${earned ? styles.earned : ''}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <span className={styles.medal}>
                <Emoji code={b.emoji} size={52} />
              </span>
              <strong>{earned ? b.name : '???'}</strong>
              <small>{b.description}</small>
            </motion.div>
          );
        })}
      </div>

      <Panel className={styles.save}>
        <h3>Save file</h3>
        <p>Move your progress to another device, or keep a backup.</p>
        <div className={styles.saveActions}>
          <KidButton variant="secondary" onClick={download}>
            Download save
          </KidButton>
          <KidButton variant="secondary" onClick={() => fileRef.current?.click()}>
            Load save
          </KidButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => load(e.target.files?.[0])}
          />
          <KidButton variant="danger" onClick={() => setGate('reset')}>
            Start over
          </KidButton>
        </div>
        {importError && <p className={styles.error}>That file isn't a Packet Pals save.</p>}
      </Panel>

      <GrownUpGate
        open={gate === 'reset'}
        action="erase all progress"
        onCancel={() => setGate(null)}
        onPass={() => {
          reset();
          setGate(null);
        }}
      />
    </Page>
  );
}
