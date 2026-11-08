import { navigate } from '@/app/router';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { Modal } from '@/components/Modal';
import { Mascot } from '@/components/pip/Mascot';
import { Stars } from '@/components/Stars';
import type { Mission } from '@/game/missions/types';

interface MissionCompleteProps {
  open: boolean;
  mission: Mission;
  stars: number;
  seconds: number;
  onReplay: () => void;
  onNext?: () => void;
}

/** The "you did it!" card with stars and what the kid just learned. */
export function MissionComplete({ open, mission, stars, seconds, onReplay, onNext }: MissionCompleteProps) {
  return (
    <Modal open={open} label="Mission complete">
      <h2 style={{ color: 'var(--primary)', fontSize: '2.2rem' }}>Mission complete!</h2>
      <Stars count={stars} size={64} animate />
      {mission.timeLimit && (
        <p>
          <Emoji code="23f1" /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </p>
      )}
      <div style={{ margin: '16px 0', textAlign: 'left' }}>
        <Mascot mood="excited" says={mission.lesson} size={80} compact />
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <KidButton variant="secondary" onClick={onReplay}>
          Play again
        </KidButton>
        {onNext ? (
          <KidButton variant="good" size="lg" onClick={onNext}>
            Next mission
          </KidButton>
        ) : (
          <KidButton variant="good" size="lg" onClick={() => navigate('sandbox')}>
            <Emoji code="1f3d7" /> Build anything!
          </KidButton>
        )}
      </div>
    </Modal>
  );
}
