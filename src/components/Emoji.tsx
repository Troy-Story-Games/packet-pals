import { emojiUrl } from './emojiAssets';

interface EmojiProps {
  code: string;
  size?: number | string;
  label?: string;
  className?: string;
}

/** A Twemoji picture, so emoji look identical on every device. */
export function Emoji({ code, size = '1.4em', label, className }: EmojiProps) {
  const url = emojiUrl(code);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{ width: size, height: size, verticalAlign: '-0.25em' }}
      draggable={false}
    />
  );
}
