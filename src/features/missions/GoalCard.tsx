import { useEffect, useState } from 'react';
import { navigate } from '@/app/router';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { SpeakButton } from '@/components/SpeakButton';
import type { Mission } from '@/game/missions/types';
import styles from './GoalCard.module.css';

interface GoalCardProps {
  mission: Mission;
  number: number;
  hintsUsed: number;
  running: boolean;
  startedAt: number;
  onHint: () => void;
  onRestart: () => void;
}

/** The mission's goal, a hint button, and the clock for timed missions. */
export function GoalCard({
  mission,
  number,
  hintsUsed,
  running,
  startedAt,
  onHint,
  onRestart,
}: GoalCardProps) {
  const seconds = useStopwatch(Boolean(mission.timeLimit) && running, startedAt);
  const left = mission.timeLimit ? Math.max(0, mission.timeLimit - seconds) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.title}>
        <Emoji code={mission.emoji} size={32} />
        <strong>
          Mission {number}: {mission.title}
        </strong>
        {mission.timeLimit && (
          <span className={`${styles.clock} ${left < 30 ? styles.hurry : ''}`}>
            <Emoji code="23f1" size={22} /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className={styles.goal}>
        <Emoji code="1f3c1" size={24} />
        <p>{mission.goal}</p>
        <SpeakButton text={mission.goal} />
      </div>
      <div className={styles.buttons}>
        <KidButton variant="gold" onClick={onHint} sound={null}>
          <Emoji code="1f4a1" /> Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ''}
        </KidButton>
        <KidButton variant="secondary" onClick={onRestart}>
          Start over
        </KidButton>
        <KidButton variant="secondary" onClick={() => navigate('missions')}>
          <Emoji code="1f5fa" /> Map
        </KidButton>
      </div>
    </div>
  );
}

function useStopwatch(active: boolean, startedAt: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(performance.now()), 500);
    return () => window.clearInterval(timer);
  }, [active]);
  return active ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}
