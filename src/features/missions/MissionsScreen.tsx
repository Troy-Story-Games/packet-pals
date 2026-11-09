import { motion } from 'motion/react';
import { navigate } from '@/app/router';
import { Emoji } from '@/components/Emoji';
import { GameIcon } from '@/components/GameIcon';
import { Page } from '@/components/Page';
import { Mascot } from '@/components/pip/Mascot';
import { Stars } from '@/components/Stars';
import { MISSIONS } from '@/game/missions/catalogue';
import { useLevel, useProgress } from '@/game/progressStore';
import { isMissionUnlocked } from '@/game/unlocks';
import { playSound } from '@/services/audio/sfx';
import styles from './MissionsScreen.module.css';

const CHAPTER_TITLES = { 1: 'Chapter 1: Network Basics', 2: 'Chapter 2: Network Pro' };

/** The mission map: a trail of missions that unlock one after another. */
export function MissionsScreen() {
  const missionStars = useProgress((s) => s.missionStars);
  const playerLevel = useLevel();
  const total = Object.values(missionStars).reduce((a, b) => a + b, 0);

  return (
    <Page title="Missions" emoji="1f5fa" wide>
      <Mascot
        mood="happy"
        says={`Each mission teaches a network secret. You have ${total} of ${MISSIONS.length * 3} stars!`}
        size={90}
      />
      {([1, 2] as const).map((chapter) => (
        <div key={chapter}>
          <h2 className={styles.chapter}>{CHAPTER_TITLES[chapter]}</h2>
          <ol className={styles.trail}>
            {MISSIONS.map((m, i) => {
              if (m.chapter !== chapter) return null;
              const unlocked = isMissionUnlocked(i, missionStars, playerLevel);
              const needsLevel = (m.minLevel ?? 1) > playerLevel;
              const stars = missionStars[m.id];
              return (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <motion.button
                    className={`${styles.card} ${!unlocked ? styles.locked : ''} ${stars ? styles.done : ''}`}
                    disabled={!unlocked}
                    whileTap={unlocked ? { scale: 0.94 } : undefined}
                    onClick={() => {
                      playSound('open');
                      navigate(`missions/${m.id}`);
                    }}
                  >
                    <span className={styles.number}>{i + 1}</span>
                    {unlocked ? (
                      <Emoji code={m.emoji} size={56} />
                    ) : (
                      <GameIcon name="locked" size={48} dark />
                    )}
                    {!unlocked && needsLevel && <span className={styles.level}>Level {m.minLevel}</span>}
                    <strong>{m.title}</strong>
                    {unlocked && <Stars count={stars ?? 0} size={24} />}
                    {m.timeLimit && unlocked && (
                      <span className={styles.timed}>
                        <Emoji code="23f1" size={16} /> Timed
                      </span>
                    )}
                  </motion.button>
                </motion.li>
              );
            })}
          </ol>
        </div>
      ))}
    </Page>
  );
}
