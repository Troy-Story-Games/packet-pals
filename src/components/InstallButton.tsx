import { useState } from 'react';
import { APP_NAME } from '@/app/config';
import { useProgress } from '@/game/progressStore';
import { installMode, promptInstall, useInstall } from '@/services/install/installPrompt';
import { Emoji } from './Emoji';
import { KidButton } from './KidButton';
import { Modal } from './Modal';

/** "Install app" button, shown only where the app can be installed (not in the desktop app). */
export function InstallButton() {
  const mode = useInstall((s) => installMode(s));
  const [iosHelp, setIosHelp] = useState(false);
  if (!mode) return null;

  const install = async () => {
    if (mode === 'ios') return setIosHelp(true);
    if (await promptInstall()) useProgress.getState().addXp(20, 'App installed!');
  };

  return (
    <>
      <KidButton variant="gold" onClick={install}>
        <Emoji code="1f4f2" size={28} /> Install app
      </KidButton>
      <Modal open={iosHelp} onClose={() => setIosHelp(false)} label="How to install">
        <h2>Put {APP_NAME} on your home screen</h2>
        <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
          <li>
            Tap the <strong>Share</strong> button in Safari (a square with an arrow).
          </li>
          <li>
            Tap <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Tap <strong>Add</strong>. Now it opens like a real app!
          </li>
        </ol>
        <KidButton variant="good" onClick={() => setIosHelp(false)}>
          Got it!
        </KidButton>
      </Modal>
    </>
  );
}
