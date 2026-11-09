import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Emoji } from '@/components/Emoji';
import { COMMANDS, DEVICE_SPECS, knownNames, Topology, type Command } from '@/core/sim';
import { playSound } from '@/services/audio/sfx';
import { useEditor } from '../editorStore';
import styles from './Terminal.module.css';

/**
 * A kid-sized command line: commands are built by tapping pills instead of
 * typing, then the output types itself out like a real terminal.
 */
export function Terminal() {
  const network = useEditor((s) => s.network);
  const selectedId = useEditor((s) => s.selectedId);
  const log = useEditor((s) => s.terminalLog);
  const busy = useEditor((s) => s.playback !== null);
  const { runTerminal, setTerminalOpen } = useEditor.getState();
  const topo = useMemo(() => new Topology(network), [network]);
  const logRef = useRef<HTMLDivElement>(null);

  const hosts = useMemo(() => network.devices.filter((d) => DEVICE_SPECS[d.kind].isHost), [network.devices]);
  const [cmd, setCmd] = useState<Command>('ping');
  const [from, setFrom] = useState(() => hosts.find((h) => h.id === selectedId)?.id ?? hosts[0]?.id ?? '');
  const [target, setTarget] = useState<string | null>(null);
  const spec = COMMANDS.find((c) => c.id === cmd)!;

  const targets = useMemo(() => {
    if (!from || !spec.needsTarget) return [];
    const names = knownNames(topo, from).map((n) => ({ id: n, label: n }));
    if (cmd === 'nslookup') return names;
    const devices = hosts.filter((h) => h.id !== from).map((h) => ({ id: h.id, label: h.name }));
    return [...devices, ...names];
  }, [topo, from, cmd, spec.needsTarget, hosts]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  const ready = Boolean(from) && (!spec.needsTarget || targets.some((t) => t.id === target));

  const pill = (active: boolean, onClick: () => void, label: React.ReactNode, key: string) => (
    <button
      key={key}
      className={`${styles.pill} ${active ? styles.active : ''}`}
      onClick={() => {
        playSound('tap');
        onClick();
      }}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      className={styles.terminal}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="dialog"
      aria-label="Terminal"
    >
      <div className={styles.builder}>
        <div className={styles.row}>
          <span className={styles.label}>Command</span>
          {COMMANDS.map((c) => pill(cmd === c.id, () => setCmd(c.id), c.id, c.id))}
        </div>
        <p className={styles.help}>{spec.help}</p>
        <div className={styles.row}>
          <span className={styles.label}>From</span>
          {hosts.map((h) => pill(from === h.id, () => setFrom(h.id), h.name, h.id))}
        </div>
        {spec.needsTarget && (
          <div className={styles.row}>
            <span className={styles.label}>To</span>
            {targets.map((t) => pill(target === t.id, () => setTarget(t.id), t.label, t.id))}
          </div>
        )}
        <div className={styles.row}>
          <button
            className={styles.run}
            disabled={!ready || busy}
            onClick={() => runTerminal(cmd, from, spec.needsTarget ? (target ?? undefined) : undefined)}
          >
            <Emoji code="25b6" size={20} /> Run
          </button>
          <button className={styles.close} onClick={() => setTerminalOpen(false)}>
            Close
          </button>
        </div>
      </div>
      <div className={styles.log} ref={logRef} aria-live="polite">
        {log.length === 0 && <p className={styles.output}>Build a command with the pills, then press Run.</p>}
        {log.map((line) => (
          <p key={line.id} className={line.kind === 'command' ? styles.command : styles.output}>
            {line.text}
          </p>
        ))}
        <span className={styles.cursor}>▌</span>
      </div>
    </motion.div>
  );
}
