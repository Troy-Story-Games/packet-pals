const urls = import.meta.glob<string>('../assets/images/icons/*.png', { eager: true, import: 'default' });

const byName = new Map(
  Object.entries(urls).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

export type GameIconName =
  'audioOff' | 'audioOn' | 'cross' | 'home' | 'locked' | 'musicOff' | 'musicOn' | 'star' | 'trashcan';

interface GameIconProps {
  name: GameIconName;
  size?: number;
  /** Render dark for use on light backgrounds (the source art is white). */
  dark?: boolean;
}

/** Kenney game icon. White by default, for coloured buttons. */
export function GameIcon({ name, size = 28, dark = false }: GameIconProps) {
  return (
    <img
      src={byName.get(name)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      style={dark ? { filter: 'brightness(0) opacity(0.65)' } : undefined}
    />
  );
}
