import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { Mascot } from '@/components/pip/Mascot';
import { Modal } from '@/components/Modal';
import { badgeById } from '@/game/badges';
import { useCelebrations } from '@/game/celebrations';
import { levelTitle } from '@/game/levels';
import { playSound } from '@/services/audio/sfx';
import { burstConfetti } from '@/services/effects/confetti';
import styles from './CelebrationLayer.module.css';

/** Shows XP toasts and level-up / badge pop-ups from the celebration queue. */
export function CelebrationLayer() {
  const queue = useCelebrations((s) => s.queue);
  const dismiss = useCelebrations((s) => s.dismiss);

  const toasts = queue.filter((c) => c.kind === 'xp');
  const popup = queue.find((c) => c.kind !== 'xp');

  useEffect(() => {
    if (!popup) return;
    playSound(popup.kind === 'levelUp' ? 'jingleLevelUp' : 'jingleBadge', { volume: 0.7 });
    burstConfetti();
  }, [popup]);

  return (
    <>
      <div className={styles.toasts} aria-live="polite">
        <AnimatePresence>
          {toasts
            .slice(-3)
            .map((t) =>
              t.kind === 'xp' ? (
                <XpToast key={t.id} amount={t.amount} label={t.label} onDone={() => dismiss(t.id)} />
              ) : null,
            )}
        </AnimatePresence>
      </div>

      <Modal open={Boolean(popup)} onClose={() => popup && dismiss(popup.id)} label="Reward">
        {popup?.kind === 'levelUp' && (
          <>
            <h2 className={styles.big}>Level {popup.level}!</h2>
            <p className={styles.sub}>You are now a {levelTitle(popup.level)}!</p>
            <Mascot mood="excited" says="Woo-hoo! You leveled up!" size={110} />
          </>
        )}
        {popup?.kind === 'badge' && <BadgeCard badgeId={popup.badgeId} />}
        <KidButton
          variant="good"
          size="lg"
          onClick={() => popup && dismiss(popup.id)}
          style={{ marginTop: 16 }}
        >
          Awesome!
        </KidButton>
      </Modal>
    </>
  );
}

function XpToast({ amount, label, onDone }: { amount: number; label: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
    // Each toast schedules its own dismissal exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className={styles.toast}
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <strong>+{amount} XP</strong> {label}
    </motion.div>
  );
}

function BadgeCard({ badgeId }: { badgeId: string }) {
  const badge = badgeById(badgeId);
  if (!badge) return null;
  return (
    <>
      <p className={styles.sub}>New badge!</p>
      <motion.div
        initial={{ rotate: -180, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className={styles.badge}
      >
        <Emoji code={badge.emoji} size={90} />
      </motion.div>
      <h2 className={styles.big}>{badge.name}</h2>
      <p>{badge.description}</p>
    </>
  );
}
