import type { CSSProperties, ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: ReactNode;
  className?: string;
  tone?: 'plain' | 'purple' | 'yellow' | 'green' | 'pink';
  style?: CSSProperties;
}

/** Rounded card with a chunky outline. */
export function Panel({ children, className, tone = 'plain', style }: PanelProps) {
  return (
    <section className={[styles.panel, styles[tone], className].filter(Boolean).join(' ')} style={style}>
      {children}
    </section>
  );
}
