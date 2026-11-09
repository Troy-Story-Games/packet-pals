import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  useReactFlow,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import { CELL_RANGE, DEVICE_SPECS, Topology, WIFI_RANGE, type Device } from '@/core/sim';
import { LAYOUTS } from '@/components/buildings/layouts';
import { NODE_WIDTH, STEP_MS } from '../actions';
import { useEditor } from '../editorStore';
import { BuildingLayer } from './BuildingLayer';
import { BuildingTag, type BuildingTagType } from './BuildingTag';
import { tagOffset } from './buildingTagOffset';
import { DeviceNode, type DeviceNodeType } from './DeviceNode';
import styles from './NetworkCanvas.module.css';
import { NetworkEdge, type NetworkEdgeType } from './NetworkEdge';

const nodeTypes = { device: DeviceNode, buildingTag: BuildingTag };
const edgeTypes = { network: NetworkEdge };
const TAG_PREFIX = 'tag:';

type CanvasNode = DeviceNodeType | BuildingTagType;

function faceFor(device: Device, topo: Topology): string {
  if (!device.powered) return '1f634';
  const wifi = topo.wifiStatus(device.id).state;
  if (wifi === 'wrongPassword') return '1f635';
  if (topo.neighbours(device.id).length === 0) return '1f61f';
  if (
    device.kind === 'firewall' &&
    (device.firewall?.blockedApps.length || device.firewall?.blockedDevices.length)
  ) {
    return '1f60e';
  }
  return '1f60a';
}

/** The WiFi or mobile-signal ring drawn around routers and cell towers. */
function rangeOf(d: Device): { radius: number; color: string } | null {
  if (!d.powered) return null;
  if (d.kind === 'router' && d.router?.wifiOn) return { radius: WIFI_RANGE, color: '14 165 233' };
  if (d.kind === 'cellTower') return { radius: CELL_RANGE, color: '249 115 22' };
  return null;
}

/** The interactive network drawing: buildings, devices, cables, WiFi and flying packets. */
export function NetworkCanvas({ fitKey }: { fitKey: string }) {
  const network = useEditor((s) => s.network);
  const tool = useEditor((s) => s.tool);
  const playback = useEditor((s) => s.playback);
  const reaction = useEditor((s) => s.reaction);
  const {
    moveDevice,
    tapDevice,
    removeLink,
    select,
    connectDevices,
    advance,
    moveBuilding,
    selectBuilding,
    removeBuilding,
  } = useEditor.getState();
  const { fitView, fitBounds } = useReactFlow();
  const topo = useMemo(() => new Topology(network), [network]);

  // React Flow reports each node's rendered size; keep it so edges know where centres are.
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});

  const nodes = useMemo<CanvasNode[]>(() => {
    const devices: DeviceNodeType[] = network.devices.map((d) => ({
      id: d.id,
      type: 'device',
      position: { x: d.x, y: d.y },
      measured: measured[d.id],
      draggable: tool === 'move',
      data: {
        device: d,
        ip: DEVICE_SPECS[d.kind].isHost ? topo.address(d.id).ip : null,
        face: faceFor(d, topo),
        range: rangeOf(d),
      },
    }));
    const tags: BuildingTagType[] = (network.decorations ?? []).map((b) => {
      const offset = tagOffset(b);
      return {
        id: `${TAG_PREFIX}${b.id}`,
        type: 'buildingTag',
        position: { x: b.x + offset.x, y: b.y + offset.y },
        measured: measured[`${TAG_PREFIX}${b.id}`],
        draggable: tool === 'move',
        data: { building: b },
      };
    });
    return [...tags, ...devices];
  }, [network.devices, network.decorations, topo, tool, measured]);

  const edges = useMemo<NetworkEdgeType[]>(() => {
    const cables: NetworkEdgeType[] = network.links.map((l) => ({
      id: l.id,
      source: l.a,
      target: l.b,
      type: 'network',
      data: { via: 'cable', linkId: l.id },
    }));
    const radio: NetworkEdgeType[] = topo.edges
      .filter((e) => e.via !== 'cable')
      .map((e) => ({
        id: `${e.via}-${e.a}`,
        source: e.a,
        target: e.b,
        type: 'network',
        data: { via: e.via },
      }));
    return [...radio, ...cables];
  }, [network.links, topo]);

  // Step the packet animation along.
  useEffect(() => {
    if (!playback) return;
    const timer = window.setTimeout(advance, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playback, advance]);

  // Let the result pop-up hang around for a moment, then clear it.
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => useEditor.setState({ reaction: null }), 3500);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  // Fit everything in view when a network loads, including the (non-node) buildings.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { network: net } = useEditor.getState();
      const buildings = net.decorations ?? [];
      if (buildings.length === 0) return void fitView({ padding: 0.25, duration: 400, maxZoom: 1.1 });
      const boxes = [
        ...net.devices.map((d) => ({ x: d.x, y: d.y, w: NODE_WIDTH, h: 150 })),
        ...buildings.map((b) => ({
          x: b.x,
          y: b.y,
          w: LAYOUTS[b.template].width,
          h: LAYOUTS[b.template].height,
        })),
      ];
      const x = Math.min(...boxes.map((b) => b.x));
      const y = Math.min(...boxes.map((b) => b.y));
      const width = Math.max(...boxes.map((b) => b.x + b.w)) - x;
      const height = Math.max(...boxes.map((b) => b.y + b.h)) - y;
      void fitBounds({ x, y, width, height }, { padding: 0.08, duration: 400 });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [fitKey, fitView, fitBounds]);

  const onNodesChange = (changes: NodeChange<CanvasNode>[]) => {
    const sizes: Record<string, { width: number; height: number }> = {};
    for (const c of changes) {
      if (c.type === 'position' && c.position) {
        if (c.id.startsWith(TAG_PREFIX)) {
          const building = network.decorations?.find((b) => `${TAG_PREFIX}${b.id}` === c.id);
          if (building) {
            const offset = tagOffset(building);
            moveBuilding(
              building.id,
              Math.round(c.position.x - offset.x),
              Math.round(c.position.y - offset.y),
            );
          }
        } else {
          moveDevice(c.id, Math.round(c.position.x), Math.round(c.position.y));
        }
      }
      if (c.type === 'dimensions' && c.dimensions) sizes[c.id] = c.dimensions;
    }
    if (Object.keys(sizes).length > 0) setMeasured((m) => ({ ...m, ...sizes }));
  };

  return (
    <div className={`${styles.canvas} ${styles[tool]}`}>
      <BuildingLayer />
      <div className={styles.layers}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => {
            if (!node.id.startsWith(TAG_PREFIX)) return tapDevice(node.id);
            const id = node.id.slice(TAG_PREFIX.length);
            if (tool === 'erase') removeBuilding(id);
            else selectBuilding(id);
          }}
          onEdgeClick={(_, edge) => tool === 'erase' && edge.data?.linkId && removeLink(edge.data.linkId)}
          onPaneClick={() => select(null)}
          onConnect={(c) => c.source && c.target && connectDevices(c.source, c.target)}
          connectionMode={ConnectionMode.Loose}
          connectOnClick={false}
          connectionLineStyle={{ stroke: '#f97316', strokeWidth: 6, strokeDasharray: '10 6' }}
          nodesConnectable={tool === 'cable'}
          elementsSelectable={false}
          minZoom={0.15}
          maxZoom={2}
          zoomOnDoubleClick={false}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={3} color="#c6d9f5" />
          <Controls showInteractive={false} position="bottom-right" className={styles.controls} />
        </ReactFlow>
      </div>
    </div>
  );
}
