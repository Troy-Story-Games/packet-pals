import { useState } from 'react';
import { KidButton } from './KidButton';
import { Modal } from './Modal';

interface GrownUpGateProps {
  open: boolean;
  /** What will happen, e.g. "open example.com". */
  action: string;
  onPass: () => void;
  onCancel: () => void;
}

/** A simple maths question before leaving the app, so a grown-up stays in the loop. */
export function GrownUpGate({ open, action, onPass, onCancel }: GrownUpGateProps) {
  return (
    <Modal open={open} onClose={onCancel} label="Ask a grown-up">
      <GateQuestion action={action} onPass={onPass} onCancel={onCancel} />
    </Modal>
  );
}

/** Mounted fresh each time the gate opens, so every visit gets a new question. */
function GateQuestion({ action, onPass, onCancel }: Omit<GrownUpGateProps, 'open'>) {
  const [[a, b]] = useState(() => [6 + Math.floor(Math.random() * 7), 4 + Math.floor(Math.random() * 6)]);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const check = () => {
    if (Number(answer) === a * b) onPass();
    else setWrong(true);
  };

  return (
    <>
      <h2>Ask a grown-up!</h2>
      <p>
        This will <strong>{action}</strong>.
      </p>
      <p>
        Grown-ups: what is {a} × {b}?
      </p>
      <input
        type="text"
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && check()}
        aria-label="Answer"
        style={{ textAlign: 'center', maxWidth: 160 }}
      />
      {wrong && <p style={{ color: 'var(--bad)' }}>Not quite. Ask a grown-up to help!</p>}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
        <KidButton variant="secondary" onClick={onCancel}>
          Cancel
        </KidButton>
        <KidButton variant="good" onClick={check}>
          OK
        </KidButton>
      </div>
    </>
  );
}
