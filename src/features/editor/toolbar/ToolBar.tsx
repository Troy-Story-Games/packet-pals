import { Emoji } from '@/components/Emoji';
import { useEditor, type Tool } from '../editorStore';
import styles from './ToolBar.module.css';

const TOOLS: Array<{ id: Tool; label: string; emoji: string }> = [
  { id: 'move', label: 'Move', emoji: '1f446' },
  { id: 'cable', label: 'Cable', emoji: '1f50c' },
  { id: 'erase', label: 'Eraser', emoji: '1f9fd' },
];

/** Big tool buttons floating over the canvas. */
export function ToolBar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  return (
    <div className={styles.bar} role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`${styles.tool} ${tool === t.id ? styles.active : ''}`}
          aria-pressed={tool === t.id}
          onClick={() => setTool(t.id)}
        >
          <Emoji code={t.emoji} size={34} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
