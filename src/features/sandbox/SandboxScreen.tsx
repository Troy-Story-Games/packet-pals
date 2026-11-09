import { useEffect, useRef, useState } from 'react';
import { navigate } from '@/app/router';
import { Emoji } from '@/components/Emoji';
import { KidButton } from '@/components/KidButton';
import { Modal } from '@/components/Modal';
import { EditorView } from '@/features/editor/EditorView';
import { useEditor } from '@/features/editor/editorStore';
import { unlockedFeatures } from '@/game/features';
import { useProgress } from '@/game/progressStore';
import { SANDBOX_KINDS } from '@/game/unlocks';
import { downloadNetwork, readNetworkFile, readSharedNetwork, shareLink, type ShareResult } from './share';
import styles from './SandboxScreen.module.css';
import { starterNetwork, useSandbox } from './sandboxStore';

const INTRO = 'Build anything you like! Add devices from the box below, connect them, and send packets.';

/** Free-build mode: autosaved, with file save/load and share-by-QR. */
export function SandboxScreen({ shared }: { shared: string | null }) {
  const [loadKey, setLoadKey] = useState(0);
  const [share, setShare] = useState<ShareResult | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the shared link if there is one, otherwise the autosaved network.
  useEffect(() => {
    const fromLink = shared ? readSharedNetwork(shared) : null;
    const network = fromLink ?? useSandbox.getState().restore();
    useEditor.getState().load(network, {
      tools: SANDBOX_KINDS,
      sandbox: true,
      features: unlockedFeatures(useProgress.getState().missionStars),
      intro: fromLink ? 'Someone shared this network with you! Press play on any device to try it.' : INTRO,
    });
    if (shared) navigate('sandbox');
  }, [shared]);

  // Autosave while building.
  useEffect(
    () =>
      useEditor.subscribe((state, prev) => {
        if (state.network !== prev.network && state.sandbox) useSandbox.getState().save(state.network);
      }),
    [],
  );

  const load = (network: ReturnType<typeof starterNetwork>, intro: string) => {
    useEditor.getState().load(network, {
      tools: SANDBOX_KINDS,
      sandbox: true,
      intro,
      features: unlockedFeatures(useProgress.getState().missionStars),
    });
    useSandbox.getState().save(network);
    setLoadKey((k) => k + 1);
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const network = await readNetworkFile(file);
    if (network) load(network, 'Network loaded!');
    else useEditor.getState().say("Hmm, that file isn't a Kid SDN network.", 'sad');
  };

  return (
    <>
      <EditorView
        fitKey={`sandbox-${shared ?? ''}-${loadKey}`}
        header={
          <div className={styles.buttons}>
            <KidButton variant="secondary" onClick={() => setConfirmNew(true)}>
              <Emoji code="2b50" /> New
            </KidButton>
            <KidButton variant="secondary" onClick={() => downloadNetwork(useEditor.getState().network)}>
              <Emoji code="1f4be" /> Save
            </KidButton>
            <KidButton variant="secondary" onClick={() => fileRef.current?.click()}>
              <Emoji code="1f4c2" /> Open
            </KidButton>
            <KidButton onClick={async () => setShare(await shareLink(useEditor.getState().network))}>
              <Emoji code="1f4e4" /> Share
            </KidButton>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => openFile(e.target.files?.[0])}
            />
          </div>
        }
      />

      <Modal open={confirmNew} onClose={() => setConfirmNew(false)} label="Start a new network">
        <h2>Start a new network?</h2>
        <p>Your current network will be cleared. Save it first if you want to keep it!</p>
        <div className={styles.modalButtons}>
          <KidButton variant="secondary" onClick={() => setConfirmNew(false)}>
            Cancel
          </KidButton>
          <KidButton
            variant="danger"
            onClick={() => {
              load(starterNetwork(), INTRO);
              setConfirmNew(false);
            }}
          >
            Start fresh
          </KidButton>
        </div>
      </Modal>

      <Modal open={share !== null} onClose={() => setShare(null)} label="Share your network">
        <h2>
          <Emoji code="1f4e4" /> Share your network
        </h2>
        {share?.ok ? (
          <>
            <p>Scan this code with another tablet or phone to open your network there!</p>
            <div className={styles.qr} dangerouslySetInnerHTML={{ __html: share.svg }} />
          </>
        ) : (
          <p>
            {share?.reason === 'tooBig'
              ? 'Wow, your network is too big to fit in a QR code! Use Save instead and send the file.'
              : 'Share links work in the website version. Use Save to keep your network as a file.'}
          </p>
        )}
        <KidButton variant="good" onClick={() => setShare(null)}>
          Done
        </KidButton>
      </Modal>
    </>
  );
}
