import { canSpeak, speak } from '@/services/speech/speak';
import { GameIcon } from './GameIcon';
import { KidButton } from './KidButton';

/** Reads `text` aloud. Hidden if the device has no speech support. */
export function SpeakButton({ text, label = 'Read it to me' }: { text: string; label?: string }) {
  if (!canSpeak()) return null;
  return (
    <KidButton
      size="icon"
      variant="gold"
      sound={null}
      aria-label={label}
      title={label}
      onClick={() => speak(text)}
    >
      <GameIcon name="audioOn" />
    </KidButton>
  );
}
