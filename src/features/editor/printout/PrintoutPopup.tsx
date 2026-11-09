import { AnimatePresence, motion } from 'motion/react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { useCelebrationHold } from '@/game/celebrations';
import { useEditor } from '../editorStore';
import { documentFor } from './documents';
import styles from './PrintoutPopup.module.css';

/** A sheet of paper slides out of the printer to show what got printed. */
export function PrintoutPopup() {
  const printout = useEditor((s) => s.printout);
  const close = useEditor((s) => s.closePrintout);
  useCelebrationHold(printout !== null);
  const doc = printout ? documentFor(printout.token) : null;

  return (
    <AnimatePresence>
      {printout && doc && (
        <motion.div
          className={`${styles.backdrop} no-print`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className={styles.stage} onClick={(e) => e.stopPropagation()}>
            <motion.div
              className={styles.paper}
              role="dialog"
              aria-label={`${printout.printer} printed ${doc.title}`}
              initial={{ y: 160, scaleY: 0.2, opacity: 0 }}
              animate={{ y: 0, scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <Emoji code={doc.emoji} size={72} />
              <h2>{doc.title}</h2>
              {doc.lines.map((line) => (
                <p key={line}>{line.replace('{from}', printout.from)}</p>
              ))}
            </motion.div>
            <div className={styles.printer}>
              <DeviceArt kind="printer" size={120} />
              <span>{printout.printer}</span>
            </div>
            <KidButton variant="good" size="lg" onClick={close}>
              Cool!
            </KidButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
