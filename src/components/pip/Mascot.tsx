import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
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
  /**
   * Earlier messages from the same action (including `says` last). With more than
   * one, the bubble gets back/next buttons and reads them all aloud.
   */
  history?: string[];
}

/** Pip the Packet with a speech bubble and read-aloud. */
export function Mascot({ mood = 'happy', says, size = 110, compact = false, history = [] }: MascotProps) {
  const autoSpeak = useSettings((s) => s.autoSpeak);
  // null = follow the newest message; a number = the kid paged back to that one.
  const [viewing, setViewing] = useState<number | null>(null);
  const paged = history.length > 1;
  const index = viewing ?? history.length - 1;
  const shown = paged ? history[index] : says;
  const newer = viewing !== null && viewing < history.length - 1;
  const goTo = (i: number) => setViewing(i >= history.length - 1 ? null : Math.max(0, i));

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
        {shown && (
          <motion.div
            key={shown}
            className={styles.bubble}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className={styles.text}>
              <p>{shown}</p>
              {paged && (
                <div className={styles.pager} aria-label="Pip's messages">
                  <button
                    className={styles.pageButton}
                    aria-label="Previous message"
                    disabled={index === 0}
                    onClick={() => goTo(index - 1)}
                  >
                    ◀
                  </button>
                  <span>
                    {index + 1} / {history.length}
                  </span>
                  <button
                    className={`${styles.pageButton} ${newer ? styles.more : ''}`}
                    aria-label="Next message"
                    disabled={!newer}
                    onClick={() => goTo(index + 1)}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
            <SpeakButton
              text={paged ? history.join('\n\n') : (says ?? '')}
              label={paged ? 'Read all of it to me' : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
