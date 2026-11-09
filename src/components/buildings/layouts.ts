import type { BuildingTemplate } from '@/core/sim';

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  emoji: string;
  /** Underground rooms are drawn darker. */
  below?: boolean;
}

export interface Layout {
  width: number;
  height: number;
  /** Top of the walls (the roof sits above). */
  wallTop: number;
  /** Ground level, for houses with a basement. */
  ground?: number;
  roof: 'pitched' | 'flat';
  rooms: Room[];
}

const ROOF = 120;

/** Room layouts for each building. Sizes are in canvas units, like devices. */
export const LAYOUTS: Record<BuildingTemplate, Layout> = {
  house1: {
    width: 780,
    height: 460,
    wallTop: ROOF,
    roof: 'pitched',
    rooms: [
      { x: 20, y: 140, w: 240, h: 300, label: 'Kitchen', emoji: '1f373' },
      { x: 270, y: 140, w: 250, h: 300, label: 'Living room', emoji: '1f6cb' },
      { x: 530, y: 140, w: 230, h: 300, label: 'Bedroom', emoji: '1f6cf' },
    ],
  },
  house2: {
    width: 780,
    height: 700,
    wallTop: ROOF,
    roof: 'pitched',
    rooms: [
      { x: 20, y: 140, w: 270, h: 260, label: 'Bedroom', emoji: '1f6cf' },
      { x: 300, y: 140, w: 180, h: 260, label: 'Bathroom', emoji: '1f6c1' },
      { x: 490, y: 140, w: 270, h: 260, label: "Kids' room", emoji: '1f9f8' },
      { x: 20, y: 420, w: 270, h: 260, label: 'Kitchen', emoji: '1f373' },
      { x: 300, y: 420, w: 460, h: 260, label: 'Living room', emoji: '1f6cb' },
    ],
  },
  house3: {
    width: 780,
    height: 960,
    wallTop: ROOF,
    ground: 680,
    roof: 'pitched',
    rooms: [
      { x: 20, y: 140, w: 360, h: 250, label: 'Bedroom', emoji: '1f6cf' },
      { x: 390, y: 140, w: 370, h: 250, label: "Kids' room", emoji: '1f9f8' },
      { x: 20, y: 410, w: 300, h: 250, label: 'Kitchen', emoji: '1f373' },
      { x: 330, y: 410, w: 430, h: 250, label: 'Living room', emoji: '1f6cb' },
      { x: 20, y: 700, w: 470, h: 240, label: 'Basement', emoji: '1f9fa', below: true },
      { x: 500, y: 700, w: 260, h: 240, label: 'Storage', emoji: '1f5c4', below: true },
    ],
  },
  office: {
    width: 920,
    height: 800,
    wallTop: 50,
    roof: 'flat',
    rooms: [
      { x: 20, y: 70, w: 280, h: 220, label: 'Office', emoji: '1f4bb' },
      { x: 310, y: 70, w: 290, h: 220, label: 'Office', emoji: '1f4bb' },
      { x: 610, y: 70, w: 290, h: 220, label: 'Office', emoji: '1f4bb' },
      { x: 20, y: 310, w: 430, h: 220, label: 'Meeting room', emoji: '1f4ac' },
      { x: 460, y: 310, w: 440, h: 220, label: 'Printer corner', emoji: '1f5a8' },
      { x: 20, y: 550, w: 500, h: 230, label: 'Reception', emoji: '1f3e2' },
      { x: 530, y: 550, w: 370, h: 230, label: 'Server room', emoji: '1f5c4' },
    ],
  },
};
