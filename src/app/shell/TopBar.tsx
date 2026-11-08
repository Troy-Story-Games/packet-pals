import { motion } from 'motion/react';
import { Emoji } from '@/components/Emoji';
import { GameIcon } from '@/components/GameIcon';
import { KidButton } from '@/components/KidButton';
import { levelForXp, levelProgress, levelTitle } from '@/game/levels';
import { useProgress } from '@/game/progressStore';
import { useSettings } from '@/services/settings';
import { APP_NAME } from '../config';
import { navigate, useRoute } from '../router';
import styles from './TopBar.module.css';

export function TopBar() {
  const route = useRoute();
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak.count);
  const { sfx, music, toggle } = useSettings();
  const level = levelForXp(xp);

  return (
    <header className={`${styles.bar} no-print`}>
      {route.name === 'home' ? (
        <h1 className={styles.logo}>{APP_NAME}</h1>
      ) : (
        <KidButton size="icon" aria-label="Home" onClick={() => navigate('')}>
          <GameIcon name="home" />
        </KidButton>
      )}

      <button className={styles.player} onClick={() => navigate('trophies')} aria-label="My trophies">
        <span className={styles.levelBadge}>{level}</span>
        <span className={styles.playerText}>
          <span className={styles.title}>{levelTitle(level)}</span>
          <span className={styles.track}>
            <motion.span
              className={styles.fill}
              animate={{ width: `${Math.round(levelProgress(xp) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </span>
        </span>
        {streak > 1 && (
          <span className={styles.streak} title={`${streak} days in a row!`}>
            <Emoji code="1f525" size={22} /> {streak}
          </span>
        )}
      </button>

      <div className={styles.toggles}>
        <KidButton
          size="icon"
          variant={sfx ? 'primary' : 'secondary'}
          sound="toggle"
          aria-label={sfx ? 'Turn sounds off' : 'Turn sounds on'}
          onClick={() => toggle('sfx')}
        >
          <GameIcon name={sfx ? 'audioOn' : 'audioOff'} dark={!sfx} />
        </KidButton>
        <KidButton
          size="icon"
          variant={music ? 'primary' : 'secondary'}
          sound="toggle"
          aria-label={music ? 'Turn music off' : 'Turn music on'}
          onClick={() => toggle('music')}
        >
          <GameIcon name={music ? 'musicOn' : 'musicOff'} dark={!music} />
        </KidButton>
      </div>
    </header>
  );
}
