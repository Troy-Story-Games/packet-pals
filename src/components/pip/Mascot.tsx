import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useSettings } from '@/services/settings';
import { speak } from '@/services/speech/speak';
import { SpeakButton } from '../SpeakButton';
import styles from './Mascot.module.css';
import { PipShape, type PipMood } from './PipShape';

export const MASCOT_NAME = 'Pip';

interface MascotProps {
  mood?: PipMood;
  says?: string;
  size?: number;
  compact?: boolean;
}

/** Pip the Packet with a speech bubble and read-aloud. */
export function Mascot({ mood = 'happy', says, size = 110, compact = false }: MascotProps) {
  const autoSpeak = useSettings((s) => s.autoSpeak);

  useEffect(() => {
    if (says && autoSpeak) speak(says);
  }, [says, autoSpeak]);

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <motion.svg
        viewBox="-55 -45 110 95"
        width={size}
        height={size * 0.86}
        className={styles.pip}
        role="img"
        aria-label={`${MASCOT_NAME} the packet`}
        animate={mood === 'excited' ? { y: [0, -14, 0], rotate: [0, -6, 6, 0] } : { y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: mood === 'excited' ? 0.7 : 2.2, ease: 'easeInOut' }}
      >
        <PipShape mood={mood} />
      </motion.svg>
      <AnimatePresence mode="wait">
        {says && (
          <motion.div
            key={says}
            className={styles.bubble}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <p>{says}</p>
            <SpeakButton text={says} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
