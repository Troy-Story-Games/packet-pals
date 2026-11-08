import { motion } from 'motion/react';
import starUrl from '@/assets/images/icons/star.png';

/** Row of up to three stars; earned ones pop in gold. */
export function Stars({
  count,
  max = 3,
  size = 28,
  animate = false,
}: {
  count: number;
  max?: number;
  size?: number;
  animate?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <motion.span
          key={i}
          initial={animate ? { scale: 0, rotate: -90 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: animate ? 0.3 + i * 0.25 : 0, type: 'spring', stiffness: 300, damping: 12 }}
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: size,
            height: size,
            borderRadius: '50%',
            background: i < count ? 'var(--gold)' : '#e5e0f5',
            boxShadow: i < count ? '0 3px 0 #c98a00' : 'none',
          }}
        >
          <img src={starUrl} alt="" width={size * 0.7} height={size * 0.7} draggable={false} />
        </motion.span>
      ))}
    </span>
  );
}
