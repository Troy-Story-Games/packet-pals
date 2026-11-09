import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';
import { Mascot } from '@/components/pip/Mascot';
import { NetworkCanvas } from './canvas/NetworkCanvas';
import { useEditor } from './editorStore';
import styles from './EditorView.module.css';
import { Inspector } from './inspector/Inspector';
import { PrintoutPopup } from './printout/PrintoutPopup';
import { Terminal } from './terminal/Terminal';
import { ToolBar } from './toolbar/ToolBar';
import { Toolbox } from './toolbox/Toolbox';

interface EditorViewProps {
  /** Mission goal card or sandbox buttons, shown next to Pip. */
  header?: ReactNode;
  /** Changing this re-fits the view (e.g. when a mission loads). */
  fitKey: string;
}

/** The full network-building workspace shared by missions and the sandbox. */
export function EditorView({ header, fitKey }: EditorViewProps) {
  const pip = useEditor((s) => s.pip);
  const pipLog = useEditor((s) => s.pipLog);
  const pipLogId = useEditor((s) => s.pipLogId);
  const terminalOpen = useEditor((s) => s.terminalOpen);
  return (
    <ReactFlowProvider>
      <div className={styles.editor}>
        <div className={styles.top}>
          <div className={styles.pip}>
            {/* Keyed by log so paging starts at the newest message for each new action. */}
            <Mascot key={pipLogId} mood={pip.mood} says={pip.says} history={pipLog} size={84} compact />
          </div>
          {header}
        </div>
        <div className={styles.main}>
          <div className={styles.canvasWrap}>
            <NetworkCanvas fitKey={fitKey} />
            <ToolBar />
            <AnimatePresence>{terminalOpen && <Terminal />}</AnimatePresence>
          </div>
          <Inspector />
        </div>
        {/* The terminal needs the room; the toolbox comes back when it closes. */}
        {!terminalOpen && <Toolbox />}
      </div>
      <PrintoutPopup />
    </ReactFlowProvider>
  );
}
