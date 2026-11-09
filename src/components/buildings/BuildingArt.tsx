import type { Decoration } from '@/core/sim';
import { emojiUrl } from '../emojiAssets';
import { LAYOUTS } from './layouts';

/** A 2D cut-out drawing of a building with labelled rooms. Purely decoration. */
export function BuildingArt({ building }: { building: Decoration }) {
  const layout = LAYOUTS[building.template];
  const { walls, roof, floors, trim } = building.colors;
  const { width, height, wallTop } = layout;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {layout.roof === 'pitched' ? (
        <path
          d={`M-30 ${wallTop + 6} L${width / 2} 0 L${width + 30} ${wallTop + 6} Z`}
          fill={roof}
          stroke={trim}
          strokeWidth={6}
          strokeLinejoin="round"
        />
      ) : (
        <rect
          x={-10}
          y={0}
          width={width + 20}
          height={wallTop + 6}
          rx={6}
          fill={roof}
          stroke={trim}
          strokeWidth={6}
        />
      )}
      <rect
        x={0}
        y={wallTop}
        width={width}
        height={height - wallTop}
        rx={10}
        fill={walls}
        stroke={trim}
        strokeWidth={6}
      />
      {layout.ground !== undefined && (
        <>
          <rect
            x={-40}
            y={layout.ground}
            width={width + 80}
            height={height - layout.ground + 20}
            fill="#a16207"
            opacity={0.25}
          />
          <line
            x1={-40}
            x2={width + 40}
            y1={layout.ground}
            y2={layout.ground}
            stroke="#65a30d"
            strokeWidth={10}
            strokeLinecap="round"
          />
        </>
      )}
      {layout.rooms.map((room, i) => (
        <g key={i}>
          <rect
            x={room.x}
            y={room.y}
            width={room.w}
            height={room.h}
            rx={8}
            fill={room.below ? '#e7e5e4' : floors}
            stroke={trim}
            strokeWidth={3}
            opacity={0.95}
          />
          <rect x={room.x} y={room.y + room.h - 10} width={room.w} height={10} fill={trim} opacity={0.25} />
          <image href={emojiUrl(room.emoji)} x={room.x + 10} y={room.y + 10} width={30} height={30} />
          <text
            x={room.x + 46}
            y={room.y + 33}
            fontFamily="Fredoka, sans-serif"
            fontWeight={600}
            fontSize={22}
            fill={trim}
            opacity={0.8}
          >
            {room.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
