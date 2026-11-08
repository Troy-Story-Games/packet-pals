import { playSound } from '@/services/audio/sfx';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** A big, chunky on/off switch with a label. */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`${styles.row} ${disabled ? styles.disabled : ''}`}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`${styles.switch} ${checked ? styles.on : ''}`}
        onClick={() => {
          playSound('toggle');
          onChange(!checked);
        }}
      >
        <span className={styles.knob} />
      </button>
    </label>
  );
}
