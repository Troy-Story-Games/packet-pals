import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Emoji } from './Emoji';
import styles from './Page.module.css';

interface PageProps {
  title: string;
  emoji?: string;
  children: ReactNode;
  wide?: boolean;
}

/** Standard screen layout: animated entrance, big title, centred column. */
export function Page({ title, emoji, children, wide }: PageProps) {
  return (
    <motion.main
      className={`${styles.page} ${wide ? styles.wide : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <h1 className={styles.title}>
        {emoji && <Emoji code={emoji} size="1.1em" />} {title}
      </h1>
      {children}
    </motion.main>
  );
}
