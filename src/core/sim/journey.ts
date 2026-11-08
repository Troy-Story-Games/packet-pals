import { APP_FOR_ACTION, APP_LABELS, DEVICE_SPECS, DOMAINS, isServer, SERVER_FOR_ACTION } from './devices';
import { sameSubnet, type Topology } from './topology';
import type { Action, Device, Journey, JourneyStep, Move } from './types';

const SUCCESS: Record<Action, (src: string, dst: string) => string> = {
  ping: (_s, d) => `${d} answered: Pong!`,
  message: (_s, d) => `${d} got your message!`,
  video: (s) => `The video is playing on ${s}!`,
  game: (s) => `${s} joined the game!`,
  web: (s) => `The website opened on ${s}!`,
  print: (_s, d) => `${d} printed your picture!`,
};

/** Actions where the destination sends something back. */
const HAS_REPLY: ReadonlySet<Action> = new Set(['ping', 'video', 'game', 'web']);

/**
 * Works out what happens when `fromId` tries to do `action` (to `toId` for
 * pings, messages and printing). Returns the hop-by-hop journey to animate and
 * a kid-friendly explanation of the result.
 */
export function sendPacket(topo: Topology, fromId: string, action: Action, toId?: string): Journey {
  const src = topo.device(fromId);
  const fail = (at: Device, message: string, steps: JourneyStep[] = []): Journey => ({
    action,
    from: fromId,
    to: toId,
    outcome: 'failed',
    message,
    at: at.id,
    steps,
    replySteps: [],
  });

  if (!src.powered) return fail(src, `${src.name} is turned off. Switch it on first!`);
  if (topo.neighbours(src.id).length === 0) return fail(src, notConnectedReason(topo, src));

  // Work out the destination. Internet actions find their server by name (DNS).
  const serverKind = SERVER_FOR_ACTION[action];
  let dst: Device | undefined;
  if (serverKind) {
    dst = topo.network.devices.find((d) => d.kind === serverKind && d.powered);
    if (!dst) return fail(src, `There is no ${DEVICE_SPECS[serverKind].label} on the Internet yet. Add one!`);
  } else {
    dst = toId ? topo.devices.get(toId) : undefined;
    if (!dst) return fail(src, 'Pick who to send it to!');
    if (dst.id === src.id) return fail(src, "That's yourself! Pick a different device.");
    if (action === 'print' && dst.kind !== 'printer') return fail(src, 'You can only print to a printer!');
    if (!dst.powered) return fail(dst, `${dst.name} is turned off.`);
  }
  const to = dst;
  const srcIp = topo.address(src.id).ip;
  const dstIp = topo.address(to.id).ip;

  const local = topo.localPath(src.id, to.id);
  if (local && !isServer(to.kind)) {
    if (!srcIp || !dstIp) return fail(src, `${src.name} doesn't have an address yet.`);
    if (!sameSubnet(srcIp, dstIp)) {
      return fail(
        src,
        `${src.name} (${srcIp}) and ${to.name} (${dstIp}) live in different neighbourhoods. Their addresses need the same first three numbers!`,
      );
    }
    return travel(topo, action, src, to, local, []);
  }

  // Not on the local network: go out through the router to the Internet.
  const gatewayId = topo.address(src.id).gatewayId;
  if (!gatewayId) return fail(src, noGatewayReason(topo, src));
  const gateway = topo.device(gatewayId);
  const lanPath = topo.localPath(src.id, gatewayId);
  if (!lanPath) return fail(src, `${src.name} can't reach ${gateway.name}.`);

  const wanPath = topo.localPathToInternet(gatewayId);
  if (!wanPath) {
    return fail(
      gateway,
      `${gateway.name} isn't connected to the Internet! Connect it to the Internet cloud with a cable.`,
      stepsAlong(topo, lanPath),
    );
  }

  const toInternet = [...lanPath, ...wanPath.slice(1)];
  if (!isServer(to.kind)) {
    const theirRouter = topo.address(to.id).gatewayId ?? to.id;
    return fail(
      topo.device(theirRouter),
      `${topo.device(theirRouter).name} keeps strangers out! Devices in other homes can't be reached from the Internet. That keeps them safe.`,
      stepsAlong(topo, toInternet),
    );
  }

  const fromInternet = topo.localPathToInternet(to.id);
  if (!fromInternet) {
    return fail(to, `${to.name} isn't connected to the Internet.`, stepsAlong(topo, toInternet));
  }

  const path = [...toInternet, ...fromInternet.slice(0, -1).reverse()];
  const notes = new Map<number, string>();
  notes.set(
    lanPath.length - 1,
    `${gateway.name} writes its own return address on the packet, then sends it out.`,
  );
  notes.set(toInternet.length - 1, `Internet phone book: ${DOMAINS[to.kind]} lives at ${dstIp}.`);
  return travel(topo, action, src, to, path, [...notes]);
}

function notConnectedReason(topo: Topology, d: Device): string {
  const wifi = topo.wifiStatus(d.id);
  switch (wifi.state) {
    case 'wrongPassword':
      return `Wrong WiFi password! ${d.name} couldn't join "${d.wifi?.ssid}".`;
    case 'outOfRange':
      return `${d.name} is too far from the WiFi router. Move it closer!`;
    case 'noSuchNetwork':
      return `${d.name} can't find a WiFi called "${d.wifi?.ssid}".`;
    default:
      return DEVICE_SPECS[d.kind].ports === 0
        ? `${d.name} isn't on WiFi yet. Tap it and join a WiFi network!`
        : `${d.name} isn't connected to anything. Add a cable${DEVICE_SPECS[d.kind].canWifi ? ' or join WiFi' : ''}!`;
  }
}

function noGatewayReason(topo: Topology, d: Device): string {
  const addr = topo.address(d.id);
  const routers = topo.localReach(d.id).filter((id) => topo.device(id).kind === 'router');
  if (routers.length === 0) return `${d.name} has no router, so it can't reach the Internet.`;
  if (addr.source === 'static') {
    const subnet = topo.subnets.get(routers[0]);
    return `${d.name}'s address ${addr.ip} doesn't match the router's neighbourhood (${subnet}.something). Fix it, or switch to automatic!`;
  }
  return `${d.name} doesn't have a proper address. Turn on "hand out addresses" (DHCP) on the router!`;
}

/** Simple steps along a path, used to show how far a failed packet got. */
function stepsAlong(topo: Topology, path: string[]): JourneyStep[] {
  return path.slice(0, -1).map((from, i) => ({ moves: [move(topo, from, path[i + 1], 'forward')] }));
}

function move(topo: Topology, from: string, to: string, fate: Move['fate']): Move {
  const edge = topo.edgeBetween(from, to);
  return { from, to, via: edge?.via ?? 'cable', linkId: edge?.linkId, fate };
}

/** Copies a hub sends out of every other socket. */
function hubCopies(topo: Topology, hub: string, prev: string, next: string): Move[] {
  return topo
    .neighbours(hub)
    .map((e) => topo.other(e, hub))
    .filter((n) => n !== prev && n !== next)
    .map((n) => move(topo, hub, n, 'ignored'));
}

function buildSteps(
  topo: Topology,
  path: string[],
  notes: Array<[number, string]>,
): { steps: JourneyStep[]; blockedAt?: string; blockReason?: string } {
  const noteAt = new Map(notes);
  const steps: JourneyStep[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const last = i === path.length - 2;
    const moves: Move[] = [move(topo, from, to, last ? 'arrive' : 'forward')];
    if (i > 0 && topo.device(from).kind === 'hub') moves.push(...hubCopies(topo, from, path[i - 1], to));
    steps.push({ moves, note: noteAt.get(i) });
  }
  return { steps };
}

function firewallBlock(topo: Topology, action: Action, src: Device, dst: Device, path: string[]): number {
  const app = APP_FOR_ACTION[action];
  return path.findIndex((id, i) => {
    if (i === 0 || i === path.length - 1) return false;
    const fw = topo.device(id);
    if (fw.kind !== 'firewall' || !fw.firewall) return false;
    const { blockedApps, blockedDevices } = fw.firewall;
    return blockedApps.includes(app) || blockedDevices.includes(src.id) || blockedDevices.includes(dst.id);
  });
}

function travel(
  topo: Topology,
  action: Action,
  src: Device,
  dst: Device,
  path: string[],
  notes: Array<[number, string]>,
): Journey {
  const blockIndex = firewallBlock(topo, action, src, dst, path);
  if (blockIndex > 0) {
    const fw = topo.device(path[blockIndex]);
    const { steps } = buildSteps(topo, path.slice(0, blockIndex + 1), notes);
    const lastStep = steps[steps.length - 1];
    lastStep.moves[0] = { ...lastStep.moves[0], fate: 'blocked' };
    const app = APP_FOR_ACTION[action];
    const byDevice = !fw.firewall!.blockedApps.includes(app);
    return {
      action,
      from: src.id,
      to: dst.id,
      outcome: 'blocked',
      message: byDevice
        ? `${fw.name} said NO! It blocks ${fw.firewall!.blockedDevices.includes(src.id) ? src.name : dst.name}.`
        : `${fw.name} said NO! ${APP_LABELS[app]} are blocked.`,
      at: fw.id,
      steps,
      replySteps: [],
    };
  }

  const { steps } = buildSteps(topo, path, notes);
  const replySteps = HAS_REPLY.has(action) ? buildSteps(topo, [...path].reverse(), []).steps : [];
  return {
    action,
    from: src.id,
    to: dst.id,
    outcome: 'delivered',
    message: SUCCESS[action](src.name, dst.name),
    at: dst.id,
    steps,
    replySteps,
  };
}
