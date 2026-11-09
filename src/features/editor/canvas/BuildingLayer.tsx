import { useViewport } from '@xyflow/react';
import { BuildingArt } from '@/components/buildings/BuildingArt';
import { useEditor } from '../editorStore';
import styles from './NetworkCanvas.module.css';

/**
 * Buildings are drawn on their own layer behind the network so cables and
 * devices always stay on top. It follows the canvas pan and zoom.
 */
export function BuildingLayer() {
  const { x, y, zoom } = useViewport();
  const buildings = useEditor((s) => s.network.decorations);
  const selectedId = useEditor((s) => s.selectedBuildingId);
  if (!buildings?.length) return null;
  return (
    <div className={styles.buildings} style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}>
      {buildings.map((b) => (
        <div
          key={b.id}
          className={`${styles.building} ${b.id === selectedId ? styles.buildingSelected : ''}`}
          style={{ left: b.x, top: b.y }}
        >
          <BuildingArt building={b} />
        </div>
      ))}
    </div>
  );
}
