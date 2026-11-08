import { motion } from 'motion/react';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { Page } from '@/components/Page';
import { Mascot } from '@/components/pip/Mascot';
import { SpeakButton } from '@/components/SpeakButton';
import { DEVICE_SPECS } from '@/core/sim';
import { useProgress } from '@/game/progressStore';
import { SANDBOX_KINDS } from '@/game/unlocks';
import styles from './BookScreen.module.css';
import { DEVICE_FACTS } from './deviceFacts';

/** A sticker book of devices that fills up as the kid discovers them. */
export function BookScreen() {
  const discovered = useProgress((s) => s.discovered);
  return (
    <Page title="Network Book" emoji="1f4c2" wide>
      <Mascot
        mood="happy"
        says={`You have discovered ${discovered.length} of ${SANDBOX_KINDS.length} devices! Play missions and build networks to find them all.`}
        size={90}
      />
      <div className={styles.grid}>
        {SANDBOX_KINDS.map((kind, i) => {
          const found = discovered.includes(kind);
          const spec = DEVICE_SPECS[kind];
          const facts = DEVICE_FACTS[kind];
          return (
            <motion.article
              key={kind}
              className={`${styles.card} ${found ? '' : styles.hidden}`}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className={styles.art}>
                <DeviceArt kind={kind} size={72} />
              </div>
              <h3>{found ? spec.label : '???'}</h3>
              {found ? (
                <>
                  <p>{facts.what}</p>
                  <p className={styles.fact}>
                    <strong>Fun fact:</strong> {facts.fact}
                  </p>
                  <SpeakButton text={`${spec.label}. ${facts.what} Fun fact: ${facts.fact}`} />
                </>
              ) : (
                <p>Not discovered yet!</p>
              )}
            </motion.article>
          );
        })}
      </div>
    </Page>
  );
}
