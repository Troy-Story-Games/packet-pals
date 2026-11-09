import type { Node, NodeProps } from '@xyflow/react';
import { TAG_WIDTH } from './buildingTagOffset';
import type { Decoration } from '@/core/sim';
import { useEditor } from '../editorStore';
import styles from './NetworkCanvas.module.css';

export type BuildingTagData = { building: Decoration };
export type BuildingTagType = Node<BuildingTagData, 'buildingTag'>;

const NAMES = { house1: 'House', house2: 'Two-storey house', house3: 'Big house', office: 'Office' };

/** The draggable name tag on a building's roof: drag it to move the whole building. */
export function BuildingTag({ data }: NodeProps<BuildingTagType>) {
  const selected = useEditor((s) => s.selectedBuildingId === data.building.id);
  return (
    <div className={`${styles.tag} ${selected ? styles.tagSelected : ''}`} style={{ width: TAG_WIDTH }}>
      <span aria-hidden>✥</span>
      {data.building.label || NAMES[data.building.template]}
    </div>
  );
}
