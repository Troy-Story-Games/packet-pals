import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { playSound, type SoundName } from '@/services/audio/sfx';
import styles from './KidButton.module.css';

type Variant = 'primary' | 'secondary' | 'good' | 'danger' | 'ghost' | 'gold';

interface KidButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: 'md' | 'lg' | 'icon';
  sound?: SoundName | null;
  children?: ReactNode;
}

/** Big, bouncy, chunky button with a tap sound. */
export function KidButton({
  variant = 'primary',
  size = 'md',
  sound = 'tap',
  className,
  onClick,
  children,
  type = 'button',
  ...rest
}: KidButtonProps) {
  return (
    <motion.button
      type={type}
      className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')}
      whileTap={{ scale: 0.92, y: 4 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      onClick={(e) => {
        if (sound) playSound(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
