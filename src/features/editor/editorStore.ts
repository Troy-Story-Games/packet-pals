import { create } from 'zustand';
import type { PipMood } from '@/components/pip/PipShape';
import {
  connect,
  createDevice,
  DEVICE_SPECS,
  sendPacket,
  Topology,
  type Action,
  type Device,
  type DeviceKind,
  type Journey,
  type Network,
} from '@/core/sim';
import type { HistoryEntry } from '@/game/missions/types';
import { useCelebrations } from '@/game/celebrations';
import { useProgress } from '@/game/progressStore';
import { playSound } from '@/services/audio/sfx';
import { rewardCable, rewardDevice, rewardJourney, rewardWifiJoin } from './rewards';

export type Tool = 'move' | 'cable' | 'erase';

export interface Playback {
  journey: Journey;
  phase: 'forward' | 'reply';
  step: number;
  /** Changes for every new send, so animations restart cleanly. */
  token: number;
}

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
  playback: Playback | null;
  reaction: DeviceReaction | null;
  history: HistoryEntry[];
  failures: number;
  /** performance.now() when the current network was loaded (for mission timers). */
  loadedAt: number;

  load: (network: Network, options: { tools: DeviceKind[]; sandbox: boolean; intro: string }) => void;
  addDevice: (kind: DeviceKind, x: number, y: number) => void;
  moveDevice: (id: string, x: number, y: number) => void;
  removeDevice: (id: string) => void;
  removeLink: (linkId: string) => void;
  connectDevices: (a: string, b: string) => void;
  tapDevice: (id: string) => void;
  select: (id: string | null) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  setTool: (tool: Tool) => void;
  say: (says: string, mood?: PipMood) => void;
  send: (from: string, action: Action, to?: string) => void;
  advance: () => void;
}

let token = 0;

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

  const finish = (journey: Journey, reward: () => void) => {
    // Rewards arrive with the packet, not when it leaves.
    reward();
    releasePopupsLater();
    set({
      playback: null,
      reaction: { deviceId: journey.at, outcome: journey.outcome, action: journey.action, token: ++token },
    });
    if (journey.outcome === 'delivered') {
      playSound('arrive');
      get().say(journey.message, 'excited');
    } else if (journey.outcome === 'blocked') {
      playSound('blocked');
      get().say(journey.message, 'surprised');
    } else {
      playSound('error');
      get().say(journey.message, 'sad');
    }
  };

  return {
    network: { devices: [], links: [] },
    tools: [],
    sandbox: false,
    selectedId: null,
    tool: 'move',
    cableFrom: null,
    pip: { says: '', mood: 'happy' },
    playback: null,
    reaction: null,
    history: [],
    failures: 0,
    loadedAt: 0,

    load: (network, { tools, sandbox, intro }) => {
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
        playback: null,
        reaction: null,
        history: [],
        failures: 0,
        loadedAt: performance.now(),
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
      set({ selectedId: id });
      playSound('tap');
    },

    select: (id) => set({ selectedId: id, cableFrom: null }),

    updateDevice: (id, patch) => {
      const { network } = get();
      const before = topology().wifiStatus(id).state;
      setNetwork({ ...network, devices: network.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
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
      set({ tool, cableFrom: null });
      playSound('toggle');
      const tips: Record<Tool, string> = {
        move: 'Drag devices around. Tap one to see what it can do.',
        cable: 'Tap a device, then tap another to connect them with a cable.',
        erase: 'Tap a device or a cable to remove it.',
      };
      get().say(tips[tool], 'think');
    },

    say: (says, mood = 'happy') => set({ pip: { says, mood } }),

    send: (from, action, to) => {
      if (get().playback) return;
      const topo = topology();
      const journey = sendPacket(topo, from, action, to);
      const ids = [
        journey.from,
        ...journey.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to)),
      ];
      const kindsOnPath = ids.map((id) => topo.device(id).kind);
      const hubShout = journey.steps.some((s) => s.moves.some((m) => m.fate === 'ignored'));
      set((s) => ({
        history: [...s.history, { journey, kindsOnPath }],
        failures: s.failures + (journey.outcome === 'failed' ? 1 : 0),
      }));
      const reward = () => rewardJourney(journey, kindsOnPath, hubShout);
      pendingReward = reward;

      if (journey.steps.length === 0) return finish(journey, reward);
      // Badges and level-ups wait until the packet has finished its trip.
      releasePopups = useCelebrations.getState().hold();
      playSound('send');
      set({ playback: { journey, phase: 'forward', step: 0, token: ++token }, reaction: null });
      get().say(journey.steps[0].note ?? 'Off I go!', 'excited');
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
