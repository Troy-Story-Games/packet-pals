import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Emoji } from '@/components/Emoji';
import { GameIcon } from '@/components/GameIcon';
import { featureLock, type Feature } from '@/game/features';
import { playSound } from '@/services/audio/sfx';
import { useEditor } from '../editorStore';
import styles from './Inspector.module.css';

interface AdvancedSectionProps {
  feature: Feature;
  title?: string;
  children: ReactNode;
}

/**
 * Advanced settings: locked (showing the level and mission that unlock it) or a
 * collapsible panel, closed by default so the basics stay simple.
 */
export function AdvancedSection({ feature, title = 'Advanced', children }: AdvancedSectionProps) {
  const unlocked = useEditor((s) => s.features.includes(feature));
  const [open, setOpen] = useState(false);

  if (!unlocked) {
    const lock = featureLock(feature);
    return (
      <section className={`${styles.section} ${styles.advancedLocked}`} aria-label={`${title} (locked)`}>
        <GameIcon name="locked" size={22} dark />
        <span>
          <strong>{title}</strong>
          <small>
            Level {lock.level} · Mission {lock.missionNumber}: {lock.title}
          </small>
        </span>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles.advanced}`}>
      <button
        className={styles.advancedToggle}
        aria-expanded={open}
        onClick={() => {
          playSound('toggle');
          setOpen((o) => !o);
        }}
      >
        <Emoji code="2699" size={22} /> {title}
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.advancedBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
