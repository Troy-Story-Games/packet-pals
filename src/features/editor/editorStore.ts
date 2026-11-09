import { create } from 'zustand';
import type { PipMood } from '@/components/pip/PipShape';
import {
  connect,
  createDevice,
  DEVICE_SPECS,
  runCommand,
  sendPacket,
  Topology,
  type Action,
  type BuildingTemplate,
  type Command,
  type Decoration,
  type Device,
  type DeviceKind,
  type Journey,
  type Network,
  type SendOptions,
  vlanInfo,
} from '@/core/sim';
import type { Feature } from '@/game/features';
import type { CommandRun, HistoryEntry } from '@/game/missions/types';
import { useCelebrations } from '@/game/celebrations';
import { useProgress } from '@/game/progressStore';
import { playPrinter } from '@/services/audio/printer';
import { playSound } from '@/services/audio/sfx';
import { useSettings } from '@/services/settings';
import { rewardCable, rewardDevice, rewardJourney, rewardWifiJoin } from './rewards';

export type Tool = 'move' | 'cable' | 'erase';

export interface Playback {
  journey: Journey;
  phase: 'forward' | 'reply';
  step: number;
  /** Changes for every new send, so animations restart cleanly. */
  token: number;
}

export interface TerminalLine {
  id: number;
  text: string;
  kind: 'command' | 'output';
}

/** Something that just came out of a printer, for the printout pop-up. */
export interface Printout {
  token: number;
  printer: string;
  from: string;
}

const BUILDING_COLORS: Record<BuildingTemplate, Decoration['colors']> = {
  house1: { walls: '#fde68a', roof: '#ef4444', floors: '#fef3c7', trim: '#78350f' },
  house2: { walls: '#bbf7d0', roof: '#15803d', floors: '#f0fdf4', trim: '#14532d' },
  house3: { walls: '#e9d5ff', roof: '#7c3aed', floors: '#faf5ff', trim: '#4c1d95' },
  office: { walls: '#e2e8f0', roof: '#334155', floors: '#f8fafc', trim: '#0f172a' },
};

/** A short-lived reaction shown on a device after a packet finishes. */
export interface DeviceReaction {
  deviceId: string;
  outcome: Journey['outcome'];
  action: Action;
  token: number;
}

interface EditorState {
  network: Network;
  /** Device kinds the toolbox offers. */
  tools: DeviceKind[];
  sandbox: boolean;
  selectedId: string | null;
  tool: Tool;
  cableFrom: string | null;
  pip: { says: string; mood: PipMood };
  /** Everything Pip said for the latest action (a packet's trip, a tap...), oldest first. */
  pipLog: string[];
  /** Changes whenever a new action starts a fresh log. */
  pipLogId: number;
  playback: Playback | null;
  reaction: DeviceReaction | null;
  history: HistoryEntry[];
  failures: number;
  /** performance.now() when the current network was loaded (for mission timers). */
  loadedAt: number;
  /** Advanced features available right now (unlocked, or switched on by the mission). */
  features: Feature[];
  selectedBuildingId: string | null;
  terminalOpen: boolean;
  terminalLog: TerminalLine[];
  printout: Printout | null;
  /** ARP memory: device id → neighbour addresses it has found (only used while helpers show). */
  arpCache: Record<string, string[]>;
  /** Every terminal command run, including ones that send no packet (like arp). */
  commandsRun: CommandRun[];

  load: (
    network: Network,
    options: { tools: DeviceKind[]; sandbox: boolean; intro: string; features: Feature[] },
  ) => void;
  addDevice: (kind: DeviceKind, x: number, y: number) => void;
  moveDevice: (id: string, x: number, y: number) => void;
  removeDevice: (id: string) => void;
  removeLink: (linkId: string) => void;
  connectDevices: (a: string, b: string) => void;
  tapDevice: (id: string) => void;
  select: (id: string | null) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  setTool: (tool: Tool) => void;
  /**
   * Pip says something. During a packet's trip (or with `append`) it is added to
   * the current log; otherwise it starts a new one.
   */
  say: (says: string, mood?: PipMood, options?: { append?: boolean }) => void;
  send: (from: string, action: Action, to?: string) => void;
  /** Runs a terminal command; animated ones send a packet too. */
  runTerminal: (cmd: Command, from: string, target?: string) => void;
  setTerminalOpen: (open: boolean) => void;
  closePrintout: () => void;
  /** Shows or hides the hidden helpers; devices forget their neighbours so the shouts show again. */
  toggleHelpers: () => void;
  /** Puts a switch socket (the cable plugged into it) on a team (VLAN). */
  setLinkTeam: (linkId: string, vlan: number) => void;
  advance: () => void;
  addBuilding: (template: BuildingTemplate, x: number, y: number) => void;
  moveBuilding: (id: string, x: number, y: number) => void;
  updateBuilding: (id: string, patch: Partial<Decoration>) => void;
  removeBuilding: (id: string) => void;
  selectBuilding: (id: string | null) => void;
}

let token = 0;
/** Pip keeps this many messages for paging back through. */
const PIP_LOG_MAX = 30;
let lineId = 0;

/**
 * After a packet lands, keep reward pop-ups back a little longer so the kid sees
 * the result, and so a finished mission can show its card first.
 */
const AFTER_PACKET_HOLD_MS = 1500;
let releasePopups: (() => void) | null = null;
let pendingReward: (() => void) | null = null;

function releasePopupsLater(): void {
  const release = releasePopups;
  releasePopups = null;
  if (release) window.setTimeout(release, AFTER_PACKET_HOLD_MS);
}

export const useEditor = create<EditorState>()((set, get) => {
  const topology = () => new Topology(get().network);

  const setNetwork = (network: Network) => set({ network });

  /** Send options: ARP shouts only once the helpers are unlocked and switched on. */
  const sendOptions = (): SendOptions => {
    const { features, arpCache } = get();
    return {
      arp: features.includes('arp') && useSettings.getState().helpers ? arpCache : undefined,
      revealAddress: features.includes('vpn'),
    };
  };

  const finish = (journey: Journey, reward: () => void) => {
    // Rewards arrive with the packet, not when it leaves.
    reward();
    releasePopupsLater();
    set({
      playback: null,
      reaction: { deviceId: journey.at, outcome: journey.outcome, action: journey.action, token: ++token },
    });
    if (journey.outcome === 'delivered' && journey.action === 'print' && journey.to) {
      playPrinter();
      set({
        printout: {
          token: ++token,
          printer: get().network.devices.find((d) => d.id === journey.to)?.name ?? 'Printer',
          from: get().network.devices.find((d) => d.id === journey.from)?.name ?? '',
        },
      });
    }
    if (journey.outcome === 'delivered') {
      playSound('arrive');
      get().say(journey.message, 'excited', { append: true });
    } else if (journey.outcome === 'blocked') {
      playSound('blocked');
      get().say(journey.message, 'surprised', { append: true });
    } else {
      playSound('error');
      get().say(journey.message, 'sad', { append: true });
    }
  };

  /** Records a journey and starts its animation. */
  const start = (topo: Topology, journey: Journey, command?: Command) => {
    const ids = [
      journey.from,
      ...journey.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to)),
    ];
    const kindsOnPath = ids.map((id) => topo.device(id).kind);
    // Only a hub's copies count as a hub shout (ARP shouts reach everyone through switches too).
    const hubShout = journey.steps.some((s) =>
      s.moves.some((m) => m.fate === 'ignored' && topo.device(m.from).kind === 'hub'),
    );
    set((s) => ({
      history: [...s.history, { journey, kindsOnPath, command }],
      failures: s.failures + (journey.outcome === 'failed' ? 1 : 0),
      arpCache: learn(s.arpCache, journey.learned),
    }));
    const reward = () => rewardJourney(journey, kindsOnPath, hubShout);
    pendingReward = reward;

    if (journey.steps.length === 0) {
      set({ pipLog: [], pipLogId: ++token });
      return finish(journey, reward);
    }
    // Badges and level-ups wait until the packet has finished its trip.
    releasePopups = useCelebrations.getState().hold();
    playSound('send');
    set({
      playback: { journey, phase: 'forward', step: 0, token: ++token },
      reaction: null,
      pipLog: [],
      pipLogId: ++token,
    });
    get().say(journey.steps[0].note ?? 'Off I go!', 'excited');
  };

  return {
    network: { devices: [], links: [] },
    tools: [],
    sandbox: false,
    selectedId: null,
    tool: 'move',
    cableFrom: null,
    pip: { says: '', mood: 'happy' },
    pipLog: [],
    pipLogId: 0,
    playback: null,
    reaction: null,
    history: [],
    failures: 0,
    loadedAt: 0,
    features: [],
    selectedBuildingId: null,
    terminalOpen: false,
    terminalLog: [],
    printout: null,
    arpCache: {},
    commandsRun: [],

    load: (network, { tools, sandbox, intro, features }) => {
      releasePopups?.();
      releasePopups = null;
      pendingReward = null;
      useProgress.getState().discover(network.devices.map((d) => d.kind));
      set({
        network,
        tools,
        sandbox,
        selectedId: null,
        tool: 'move',
        cableFrom: null,
        pip: { says: intro, mood: 'happy' },
        pipLog: [intro],
        pipLogId: ++token,
        playback: null,
        reaction: null,
        history: [],
        failures: 0,
        loadedAt: performance.now(),
        features,
        selectedBuildingId: null,
        terminalOpen: false,
        terminalLog: [],
        printout: null,
        arpCache: {},
        commandsRun: [],
      });
    },

    addDevice: (kind, x, y) => {
      const { network, sandbox } = get();
      if (kind === 'internet' && network.devices.some((d) => d.kind === 'internet')) {
        get().say('There is only one Internet! It is already here.', 'think');
        return;
      }
      const device = createDevice(kind, Math.round(x), Math.round(y), network.devices);
      setNetwork({ ...network, devices: [...network.devices, device] });
      set({ selectedId: device.id });
      playSound('drop');
      rewardDevice(network.devices.length + 1, sandbox);
      useProgress.getState().discover([kind]);
      get().say(`${device.name}: ${DEVICE_SPECS[kind].blurb}.`, 'happy');
    },

    moveDevice: (id, x, y) => {
      const { network } = get();
      const before = topology().wifiStatus(id).state;
      setNetwork({ ...network, devices: network.devices.map((d) => (d.id === id ? { ...d, x, y } : d)) });
      const after = topology().wifiStatus(id).state;
      if (before !== 'connected' && after === 'connected') {
        playSound('wifi');
        get().say('WiFi connected! The radio waves reach now.', 'excited');
      } else if (before === 'connected' && after === 'outOfRange') {
        playSound('bounce');
        get().say('Oh no, too far! The WiFi signal is lost.', 'sad');
      }
    },

    removeDevice: (id) => {
      const { network } = get();
      const device = network.devices.find((d) => d.id === id);
      if (!device) return;
      if (device.locked) {
        get().say(`${device.name} is needed for this mission. Let's keep it!`, 'think');
        return;
      }
      setNetwork({
        ...network,
        devices: network.devices.filter((d) => d.id !== id),
        links: network.links.filter((l) => l.a !== id && l.b !== id),
      });
      set({ selectedId: null, cableFrom: null });
      playSound('remove');
    },

    removeLink: (linkId) => {
      const { network } = get();
      setNetwork({ ...network, links: network.links.filter((l) => l.id !== linkId) });
      playSound('remove');
    },

    connectDevices: (a, b) => {
      const result = connect(get().network, a, b);
      set({ cableFrom: null });
      if (!result.ok) {
        playSound('bounce');
        get().say(result.reason, 'think');
        return;
      }
      setNetwork(result.network);
      playSound('connect');
      rewardCable();
      const names = [a, b].map((id) => result.network.devices.find((d) => d.id === id)!.name);
      get().say(`Click! ${names[0]} and ${names[1]} are connected.`, 'happy');
    },

    tapDevice: (id) => {
      const { tool, cableFrom } = get();
      if (tool === 'erase') return get().removeDevice(id);
      if (tool === 'cable') {
        if (!cableFrom) {
          set({ cableFrom: id });
          playSound('tap');
          get().say('Now tap the device to plug the other end into.', 'think');
        } else if (cableFrom === id) {
          set({ cableFrom: null });
        } else {
          get().connectDevices(cableFrom, id);
        }
        return;
      }
      set({ selectedId: id, selectedBuildingId: null });
      playSound('tap');
    },

    select: (id) => set({ selectedId: id, selectedBuildingId: null, cableFrom: null }),

    updateDevice: (id, patch) => {
      const { network } = get();
      const before = topology().wifiStatus(id).state;
      setNetwork({ ...network, devices: network.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
      if (patch.network) {
        const cell = topology().cellStatus(id).state;
        if (patch.network === 'cell') {
          playSound(cell === 'connected' ? 'wifi' : 'bounce');
          get().say(
            cell === 'connected'
              ? 'Mobile data on! The phone found a cell tower.'
              : cell === 'outOfRange'
                ? 'Mobile data is on, but the cell tower is too far away!'
                : 'Mobile data is on, but there is no cell tower!',
            cell === 'connected' ? 'excited' : 'sad',
          );
        } else {
          get().say('Back on WiFi.', 'happy');
        }
        return;
      }
      if (!('wifi' in patch) || !patch.wifi) return;
      const status = topology().wifiStatus(id).state;
      if (status === 'connected' && before !== 'connected') {
        playSound('wifi');
        rewardWifiJoin();
        get().say(`Joined "${patch.wifi.ssid}"! The router gave it an address.`, 'excited');
      } else if (status === 'wrongPassword') {
        playSound('bounce');
        get().say('Wrong password! The router said no.', 'sad');
      } else if (status === 'outOfRange') {
        playSound('bounce');
        get().say('Too far away! Move closer to the router.', 'sad');
      }
    },

    setTool: (tool) => {
      // Cable and eraser modes don't use the settings panel, so close it (it covers phones' screens).
      set((s) => ({
        tool,
        cableFrom: null,
        selectedId: tool === 'move' ? s.selectedId : null,
        selectedBuildingId: tool === 'move' ? s.selectedBuildingId : null,
      }));
      playSound('toggle');
      const tips: Record<Tool, string> = {
        move: 'Drag devices around. Tap one to see what it can do.',
        cable: 'Tap a device, then tap another to connect them with a cable.',
        erase: 'Tap a device or a cable to remove it.',
      };
      get().say(tips[tool], 'think');
    },

    say: (says, mood = 'happy', { append = false } = {}) =>
      set((s) =>
        append || s.playback
          ? { pip: { says, mood }, pipLog: [...s.pipLog, says].slice(-PIP_LOG_MAX) }
          : { pip: { says, mood }, pipLog: [says], pipLogId: ++token },
      ),

    send: (from, action, to) => {
      if (get().playback) return;
      const topo = topology();
      start(topo, sendPacket(topo, from, action, to, sendOptions()));
    },

    runTerminal: (cmd, from, target) => {
      if (get().playback) return;
      const topo = topology();
      const { lines, journey } = runCommand(topo, cmd, from, target, sendOptions());
      const device = topo.device(from).name;
      const typed = `${device}> ${cmd}${target ? ` ${topo.devices.get(target)?.name ?? target}` : ''}`;
      set((s) => ({
        terminalLog: [
          ...s.terminalLog,
          { id: ++lineId, text: typed, kind: 'command' as const },
          ...lines.map((text) => ({ id: ++lineId, text, kind: 'output' as const })),
        ].slice(-200),
        commandsRun: [...s.commandsRun, { command: cmd, from, at: s.history.length }],
      }));
      playSound('tap');
      if (journey) start(topo, journey, cmd);
    },

    setTerminalOpen: (open) => {
      set({ terminalOpen: open });
      // On phones the settings sheet would cover the terminal, so close it.
      if (open && window.matchMedia?.('(max-width: 900px)').matches)
        set({ selectedId: null, cableFrom: null });
      playSound(open ? 'open' : 'toggle');
    },

    closePrintout: () => set({ printout: null }),

    setLinkTeam: (linkId, vlan) => {
      const { network } = get();
      const link = network.links.find((l) => l.id === linkId);
      if (!link) return;
      setNetwork({
        ...network,
        links: network.links.map((l) =>
          l.id === linkId ? { ...l, vlan: vlan === 1 ? undefined : vlan } : l,
        ),
      });
      playSound('toggle');
      const sw = network.devices.find((d) => d.id === link.a)?.kind === 'switch' ? link.a : link.b;
      const other = network.devices.find((d) => d.id === (sw === link.a ? link.b : link.a));
      if (other) get().say(`${other.name} is now on the ${vlanInfo(vlan).name}!`, 'happy');
    },

    toggleHelpers: () => {
      useSettings.getState().toggle('helpers');
      const on = useSettings.getState().helpers;
      set({ arpCache: {} });
      playSound('toggle');
      get().say(
        on
          ? 'Helpers on! Now you can see devices shout "Who has this address?" to find each other.'
          : "Helpers hidden. They still work, you just can't see them.",
        'excited',
      );
    },

    addBuilding: (template, x, y) => {
      const { network } = get();
      const decorations = network.decorations ?? [];
      const building: Decoration = {
        id: `building-${crypto.randomUUID().slice(0, 8)}`,
        template,
        x: Math.round(x),
        y: Math.round(y),
        colors: BUILDING_COLORS[template],
      };
      setNetwork({ ...network, decorations: [...decorations, building] });
      set({ selectedBuildingId: building.id, selectedId: null });
      playSound('drop');
      get().say('Drag the building by its roof. Then put devices in the rooms!', 'happy');
    },

    moveBuilding: (id, x, y) => {
      const { network } = get();
      setNetwork({
        ...network,
        decorations: (network.decorations ?? []).map((b) => (b.id === id ? { ...b, x, y } : b)),
      });
    },

    updateBuilding: (id, patch) => {
      const { network } = get();
      setNetwork({
        ...network,
        decorations: (network.decorations ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)),
      });
    },

    removeBuilding: (id) => {
      const { network } = get();
      setNetwork({ ...network, decorations: (network.decorations ?? []).filter((b) => b.id !== id) });
      set({ selectedBuildingId: null });
      playSound('remove');
    },

    selectBuilding: (id) => {
      set({ selectedBuildingId: id, selectedId: null, cableFrom: null });
      if (id) playSound('tap');
    },

    advance: () => {
      const { playback } = get();
      if (!playback) return;
      const { journey, phase, step } = playback;
      const steps = phase === 'forward' ? journey.steps : journey.replySteps;
      const next = step + 1;
      if (next < steps.length) {
        set({ playback: { ...playback, step: next } });
        playSound('blip', { volume: 0.3, rate: 1 + next * 0.08 });
        const note = steps[next].note;
        if (note) get().say(note, 'think');
        return;
      }
      if (phase === 'forward' && journey.outcome === 'delivered' && journey.replySteps.length > 0) {
        set({ playback: { ...playback, phase: 'reply', step: 0 } });
        playSound('send', { rate: 1.2 });
        get().say('Got it! Now the answer comes back...', 'excited');
        return;
      }
      finish(journey, pendingReward ?? (() => {}));
      pendingReward = null;
    },
  };
});

/** Adds addresses devices found with ARP to their memory. */
function learn(cache: Record<string, string[]>, learned: Journey['learned']): Record<string, string[]> {
  if (!learned?.length) return cache;
  const next = { ...cache };
  for (const { deviceId, ip } of learned) {
    const known = next[deviceId] ?? [];
    if (!known.includes(ip)) next[deviceId] = [...known, ip];
  }
  return next;
}
