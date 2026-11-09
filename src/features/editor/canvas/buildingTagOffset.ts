import { LAYOUTS } from '@/components/buildings/layouts';
import type { Decoration } from '@/core/sim';

export const TAG_WIDTH = 220;

/** Where a building's name tag sits, relative to the building's top-left corner. */
export function tagOffset(building: Decoration): { x: number; y: number } {
  const layout = LAYOUTS[building.template];
  return { x: layout.width / 2 - TAG_WIDTH / 2, y: layout.roof === 'pitched' ? 56 : 4 };
}
