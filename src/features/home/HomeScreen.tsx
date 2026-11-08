import { motion } from 'motion/react';
import { navigate } from '@/app/router';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { Page } from '@/components/Page';
import { Mascot } from '@/components/pip/Mascot';
import { MISSIONS } from '@/game/missions/catalogue';
import { useProgress } from '@/game/progressStore';
import { playSound } from '@/services/audio/sfx';
import styles from './HomeScreen.module.css';

const TILES = [
  {
    path: 'missions',
    title: 'Missions',
    blurb: 'Learn by solving puzzles',
    emoji: '1f5fa',
    color: '#2563eb',
  },
  { path: 'sandbox', title: 'Build Anything', blurb: 'Your own network', emoji: '1f3d7', color: '#f97316' },
  { path: 'book', title: 'Network Book', blurb: 'Every device explained', emoji: '1f4c2', color: '#14b8a6' },
  { path: 'trophies', title: 'Trophies', blurb: 'Badges & levels', emoji: '1f3c6', color: '#eab308' },
];

export function HomeScreen() {
  const missionStars = useProgress((s) => s.missionStars);
  const next = MISSIONS.find((m) => !(m.id in missionStars));
  const nextIndex = next ? MISSIONS.indexOf(next) : -1;
  const done = Object.keys(missionStars).length;

  const greeting =
    done === 0
      ? "Hi! I'm Pip the Packet. I zoom through cables and WiFi carrying messages. Want to build a network with me?"
      : next
        ? `Welcome back, network builder! ${done} missions done. Ready for the next one?`
        : 'You finished every mission! Can you get 3 stars on all of them?';

  return (
    <Page title="Let's build a network!" wide>
      <Mascot mood="excited" says={greeting} />

      {next && (
        <motion.button
          className={styles.next}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => {
            playSound('open');
            navigate(`missions/${next.id}`);
          }}
        >
          <Emoji code={next.emoji} size={56} />
          <span>
            <small>{done === 0 ? 'Start here' : 'Next mission'}</small>
            <strong>
              {nextIndex + 1}. {next.title}
            </strong>
          </span>
          <Emoji code="1f680" size={44} />
        </motion.button>
      )}

      <div className={styles.grid}>
        {TILES.map((tile, i) => (
          <motion.button
            key={tile.path}
            className={styles.tile}
            style={{ '--tile': tile.color } as React.CSSProperties}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.06 * i, type: 'spring', stiffness: 300, damping: 20 }}
            whileTap={{ scale: 0.93 }}
            whileHover={{ y: -4, rotate: i % 2 ? 1 : -1 }}
            onClick={() => {
              playSound('open');
              navigate(tile.path);
            }}
          >
            <Emoji code={tile.emoji} size={72} />
            <strong>{tile.title}</strong>
            <span>{tile.blurb}</span>
          </motion.button>
        ))}
      </div>

      <div className={styles.footer}>
        <KidButton variant="ghost" onClick={() => navigate('credits')}>
          Credits & thanks
        </KidButton>
      </div>
    </Page>
  );
}
