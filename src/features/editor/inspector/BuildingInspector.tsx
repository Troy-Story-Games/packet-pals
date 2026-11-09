import { BuildingArt } from '@/components/buildings/BuildingArt';
import { GameIcon } from '@/components/GameIcon';
import { KidButton } from '@/components/KidButton';
import type { Decoration } from '@/core/sim';
import { playSound } from '@/services/audio/sfx';
import { useEditor } from '../editorStore';
import styles from './Inspector.module.css';

/** Kid-friendly paint pots for each part of a building. */
const SWATCHES = [
  '#fde68a',
  '#fecaca',
  '#bbf7d0',
  '#bfdbfe',
  '#e9d5ff',
  '#fed7aa',
  '#f1f5f9',
  '#ef4444',
  '#15803d',
  '#1d4ed8',
  '#7c3aed',
  '#334155',
  '#78350f',
  '#0f172a',
];

const PARTS: Array<{ key: keyof Decoration['colors']; label: string }> = [
  { key: 'walls', label: 'Walls' },
  { key: 'roof', label: 'Roof' },
  { key: 'floors', label: 'Rooms' },
  { key: 'trim', label: 'Lines' },
];

/** Name and paint a decorative building. */
export function BuildingInspector({ building }: { building: Decoration }) {
  const { updateBuilding, removeBuilding, selectBuilding } = useEditor.getState();
  return (
    <aside key={building.id} className={styles.inspector} aria-label="Building settings">
      <header className={styles.header}>
        <span style={{ width: 52, height: 52, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
          <span style={{ transform: 'scale(0.06)', width: 0, height: 0 }}>
            <span style={{ display: 'block', translate: '-50% -50%' }}>
              <BuildingArt building={building} />
            </span>
          </span>
        </span>
        <input
          className={styles.name}
          value={building.label ?? ''}
          placeholder="Name this building"
          maxLength={24}
          aria-label="Building name"
          onChange={(e) => updateBuilding(building.id, { label: e.target.value })}
        />
        <KidButton size="icon" variant="secondary" aria-label="Close" onClick={() => selectBuilding(null)}>
          <GameIcon name="cross" dark />
        </KidButton>
      </header>
      <p className={styles.blurb}>
        Just for decoration. Put devices in the rooms! Drag the name tag to move it.
      </p>
      {PARTS.map((part) => (
        <section key={part.key} className={styles.section}>
          <h3>{part.label}</h3>
          <div className={styles.swatches}>
            {SWATCHES.map((color) => (
              <button
                key={color}
                className={`${styles.swatch} ${building.colors[part.key] === color ? styles.swatchActive : ''}`}
                style={{ background: color }}
                aria-label={`${part.label} ${color}`}
                onClick={() => {
                  playSound('pop');
                  updateBuilding(building.id, { colors: { ...building.colors, [part.key]: color } });
                }}
              />
            ))}
          </div>
        </section>
      ))}
      <section className={styles.section}>
        <KidButton variant="danger" onClick={() => removeBuilding(building.id)}>
          <GameIcon name="trashcan" /> Remove building
        </KidButton>
      </section>
    </aside>
  );
}
