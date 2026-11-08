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
import { DEVICE_SPECS, Topology, type Device } from '@/core/sim';
import { STEP_MS } from '../actions';
import { useEditor } from '../editorStore';
import { DeviceNode, type DeviceNodeType } from './DeviceNode';
import styles from './NetworkCanvas.module.css';
import { NetworkEdge, type NetworkEdgeType } from './NetworkEdge';

const nodeTypes = { device: DeviceNode };
const edgeTypes = { network: NetworkEdge };

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

/** The interactive network drawing: devices, cables, WiFi and flying packets. */
export function NetworkCanvas({ fitKey }: { fitKey: string }) {
  const network = useEditor((s) => s.network);
  const tool = useEditor((s) => s.tool);
  const playback = useEditor((s) => s.playback);
  const reaction = useEditor((s) => s.reaction);
  const { moveDevice, tapDevice, removeLink, select, connectDevices, advance } = useEditor.getState();
  const { fitView } = useReactFlow();
  const topo = useMemo(() => new Topology(network), [network]);

  // React Flow reports each node's rendered size; keep it so edges know where centres are.
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});

  const nodes = useMemo<DeviceNodeType[]>(
    () =>
      network.devices.map((d) => ({
        id: d.id,
        type: 'device',
        position: { x: d.x, y: d.y },
        measured: measured[d.id],
        draggable: tool === 'move',
        data: {
          device: d,
          ip: DEVICE_SPECS[d.kind].isHost ? topo.address(d.id).ip : null,
          face: faceFor(d, topo),
          wifiRange: d.kind === 'router' && d.powered && Boolean(d.router?.wifiOn),
        },
      })),
    [network.devices, topo, tool, measured],
  );

  const edges = useMemo<NetworkEdgeType[]>(() => {
    const cables: NetworkEdgeType[] = network.links.map((l) => ({
      id: l.id,
      source: l.a,
      target: l.b,
      type: 'network',
      data: { via: 'cable', linkId: l.id },
    }));
    const wifi: NetworkEdgeType[] = topo.edges
      .filter((e) => e.via === 'wifi')
      .map((e) => ({ id: `wifi-${e.a}`, source: e.a, target: e.b, type: 'network', data: { via: 'wifi' } }));
    return [...wifi, ...cables];
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

  useEffect(() => {
    const timer = window.setTimeout(() => void fitView({ padding: 0.25, duration: 400, maxZoom: 1.1 }), 60);
    return () => window.clearTimeout(timer);
  }, [fitKey, fitView]);

  const onNodesChange = (changes: NodeChange<DeviceNodeType>[]) => {
    const sizes: Record<string, { width: number; height: number }> = {};
    for (const c of changes) {
      if (c.type === 'position' && c.position)
        moveDevice(c.id, Math.round(c.position.x), Math.round(c.position.y));
      if (c.type === 'dimensions' && c.dimensions) sizes[c.id] = c.dimensions;
    }
    if (Object.keys(sizes).length > 0) setMeasured((m) => ({ ...m, ...sizes }));
  };

  return (
    <div className={`${styles.canvas} ${styles[tool]}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => tapDevice(node.id)}
        onEdgeClick={(_, edge) => tool === 'erase' && edge.data?.linkId && removeLink(edge.data.linkId)}
        onPaneClick={() => select(null)}
        onConnect={(c) => c.source && c.target && connectDevices(c.source, c.target)}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        connectionLineStyle={{ stroke: '#f97316', strokeWidth: 6, strokeDasharray: '10 6' }}
        nodesConnectable={tool === 'cable'}
        elementsSelectable={false}
        minZoom={0.25}
        maxZoom={2}
        zoomOnDoubleClick={false}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={3} color="#c6d9f5" />
        <Controls showInteractive={false} position="bottom-right" className={styles.controls} />
      </ReactFlow>
    </div>
  );
}
