import {
  APP_FOR_ACTION,
  APP_LABELS,
  DEVICE_SPECS,
  DOMAINS,
  DOORS,
  SERVER_FOR_ACTION,
  serverName,
} from './devices';
import { resolveName } from './dns';
import { sameSubnet, type Topology } from './topology';
import type { Action, AppKind, Device, Journey, JourneyStep, Move } from './types';
import { GUEST_VLAN, vlanInfo } from './devices';

/** Actions where the destination sends something back. */
const HAS_REPLY: ReadonlySet<Action> = new Set(['ping', 'video', 'game', 'web']);

function successMessage(action: Action, src: Device, dst: Device, name?: string): string {
  switch (action) {
    case 'ping':
      return `${dst.name} answered: Pong!`;
    case 'message':
      return `${dst.name} got your message!`;
    case 'video':
      return DEVICE_SPECS[dst.kind].isCamera
        ? `Live picture from ${dst.name} on ${src.name}!`
        : `The video is playing on ${src.name}!`;
    case 'game':
      return dst.kind === 'gameServer'
        ? `${src.name} joined the game!`
        : `${src.name} joined ${dst.name}'s game!`;
    case 'web':
      return `${name ?? 'The website'} opened on ${src.name}!`;
    case 'print':
      return `${dst.name} printed your picture!`;
  }
}

/** Which devices can be the destination of an action picked directly (not by name). */
export function canTarget(action: Action, d: Device): boolean {
  const spec = DEVICE_SPECS[d.kind];
  switch (action) {
    case 'print':
      return d.kind === 'printer';
    case 'video':
      return Boolean(spec.isCamera) || d.kind === 'videoServer';
    case 'game':
      return ['console', 'computer', 'laptop', 'gameServer'].includes(d.kind);
    case 'web':
      return d.kind === 'webServer';
    default:
      return spec.isHost;
  }
}

/**
 * Works out what happens when `fromId` tries to do `action`. `to` is a device id,
 * or a name like "videos.fun" for videos, games and websites (defaulting to the
 * usual server's name). Returns the hop-by-hop journey to animate and a
 * kid-friendly explanation of the result.
 */
export interface SendOptions {
  /**
   * Show ARP: devices must shout "who has this address?" before talking to a
   * neighbour they don't know yet. Maps device id → IPs it already knows.
   */
  arp?: Record<string, string[]>;
  /** Tell the kid which return address an Internet server saw (for VPN lessons). */
  revealAddress?: boolean;
}

export function sendPacket(
  topo: Topology,
  fromId: string,
  action: Action,
  to?: string,
  options: SendOptions = {},
): Journey {
  const src = topo.device(fromId);
  // The journey so far, in order: ARP shouts, tunnel, phone-book lookups, the packet itself.
  const pieces: Piece[] = [];
  const learned: Array<{ deviceId: string; ip: string }> = [];
  let name: string | undefined;
  const fail = (at: Device, message: string, more: JourneyStep[] = []): Journey => ({
    action,
    from: fromId,
    to: to && topo.devices.has(to) ? to : undefined,
    outcome: 'failed',
    message,
    at: at.id,
    steps: [...piecesSteps(topo, pieces), ...more],
    replySteps: [],
    name,
    learned,
  });

  if (!src.powered) return fail(src, `${src.name} is turned off. Switch it on first!`);
  if (topo.neighbours(src.id).length === 0) return fail(src, notConnectedReason(topo, src));

  // ARP: before src talks to a neighbour for the first time, it shouts to find it.
  const known = new Map(Object.entries(options.arp ?? {}).map(([id, ips]) => [id, new Set(ips)]));
  const arpBefore = (path: string[]) => {
    if (!options.arp || path.length < 2) return;
    const shout = arpSteps(topo, src, path, known);
    if (!shout) return;
    pieces.push({ steps: shout.steps });
    learned.push(...shout.learned);
    for (const l of shout.learned) {
      if (!known.has(l.deviceId)) known.set(l.deviceId, new Set());
      known.get(l.deviceId)!.add(l.ip);
    }
  };

  // VPN: everything first travels through a tunnel to the VPN server, then out from there.
  const vpn = src.vpn ? topo.devices.get(src.vpn) : undefined;
  let viewer = src;
  if (vpn) {
    if (!vpn.powered)
      return fail(vpn, `The VPN server (${vpn.name}) is switched off! Turn it on, or switch the VPN off.`);
    const tunnel = route(topo, src, vpn, 'vpn');
    if (!tunnel.ok) {
      arpBefore(tunnel.path);
      return fail(
        topo.device(tunnel.at),
        `Can't reach the VPN server ${vpn.name}: ${tunnel.message}`,
        stepsAlong(topo, tunnel.path, 'tunnel'),
      );
    }
    arpBefore(tunnel.path);
    const notes = new Map(tunnel.notes);
    notes.set(0, `Into the secret tunnel to ${vpn.name}! Nobody on the way can see what's inside.`);
    pieces.push({ segment: { path: tunnel.path, app: 'vpn', from: src, to: vpn, notes, packet: 'tunnel' } });
    viewer = vpn;
  }

  // Work out the destination: a device, or a name looked up in the phone book (DNS).
  let dst: Device;
  let builtInLookup = false;
  if (to && topo.devices.has(to)) {
    dst = topo.device(to);
    if (dst.id === src.id) return fail(src, "That's yourself! Pick a different device.");
    if (!canTarget(action, dst)) {
      return fail(
        src,
        action === 'print' ? 'You can only print to a printer!' : `${dst.name} can't do that.`,
      );
    }
  } else {
    const serverKind = SERVER_FOR_ACTION[action];
    // No name given: use the first server of the right kind (e.g. videos.fun).
    const usual = serverKind
      ? topo.network.devices.find((d) => d.kind === serverKind && d.powered)
      : undefined;
    name = to ?? (usual ? serverName(usual) : serverKind ? DOMAINS[serverKind] : undefined);
    if (!name) return fail(src, 'Pick who to send it to!');
    // With a VPN, names are looked up from the VPN server's side of the tunnel.
    const lookup = resolveName(topo, viewer.id, name);

    if (lookup.dnsId) {
      const dns = topo.device(lookup.dnsId);
      if (!dns.powered) {
        return fail(
          dns,
          `The phone book (${dns.name}) is switched off! Without it, names like ${name} can't be found.`,
        );
      }
      const ask = route(topo, viewer, dns, null);
      if (viewer === src) arpBefore(ask.path);
      if (!ask.ok) {
        return fail(
          topo.device(ask.at),
          `Can't reach the phone book: ${ask.message}`,
          stepsAlong(topo, ask.path, 'lookup'),
        );
      }
      const answerIp = lookup.deviceId ? topo.address(lookup.deviceId).ip : null;
      pieces.push({
        steps: [
          ...stepsAlong(topo, ask.path, 'lookup', `Asking the phone book (${dns.name}): where is ${name}?`),
          ...stepsAlong(
            topo,
            [...ask.path].reverse(),
            'lookup',
            lookup.deviceId
              ? `${lookup.forwarded ? `${dns.name} asked the Internet. ` : ''}The phone book says: ${name} lives at ${answerIp}!`
              : `The phone book has never heard of ${name}.`,
          ),
        ],
      });
    } else {
      builtInLookup = true;
    }

    if (!lookup.deviceId) {
      const serverLabel =
        serverKind && name === DOMAINS[serverKind]
          ? ` Add a ${DEVICE_SPECS[serverKind].label} to the Internet!`
          : '';
      return fail(src, `No one knows a website called "${name}".${serverLabel}`);
    }
    dst = topo.device(lookup.deviceId);
  }

  if (!dst.powered) return fail(dst, `${dst.name} is turned off.`);

  const app = APP_FOR_ACTION[action];
  const way = route(topo, viewer, dst, app);
  if (viewer === src) arpBefore(way.path);
  if (!way.ok) {
    return fail(topo.device(way.at), way.message, stepsAlong(topo, way.path));
  }

  const notes = new Map(way.notes);
  if (builtInLookup && name && way.internetIndex !== undefined) {
    notes.set(way.internetIndex, `Internet phone book: ${name} lives at ${topo.address(dst.id).ip}.`);
  }
  if (vpn) {
    const seenAs =
      topo.address(vpn.id).source === 'public' ? topo.address(vpn.id).ip : frontDoorOf(topo, vpn);
    notes.set(
      0,
      `Out of the tunnel at ${vpn.name}! Now the packet looks like it comes from ${seenAs ?? vpn.name}.`,
    );
  }
  pieces.push({ segment: { path: way.path, app, from: viewer, to: dst, notes } });

  const journey = travel(topo, action, src, dst, pieces, name);
  journey.learned = learned;
  if (vpn) journey.vpnId = vpn.id;
  if (journey.outcome === 'delivered' && topo.address(dst.id).source === 'public') {
    const seenAs = (d: Device) =>
      topo.address(d.id).source === 'public' || topo.address(d.id).source === 'carrier'
        ? topo.address(d.id).ip
        : frontDoorOf(topo, d);
    if (vpn) journey.message += ` ${dst.name} saw the VPN's address (${seenAs(vpn)}), not yours!`;
    else if (options.revealAddress && seenAs(src)) {
      journey.message += ` ${dst.name} saw ${topo.onCell(src.id) ? "your phone company's" : "your home's"} address: ${seenAs(src)}.`;
    }
  }
  return journey;
}

/** The Internet address a home device is seen with: its router's front door. */
function frontDoorOf(topo: Topology, d: Device): string | undefined {
  const router = topo.address(d.id).gatewayId;
  return router ? topo.frontDoor(router) : undefined;
}

/** One leg of a journey: through a VPN tunnel, or the normal way. */
interface Segment {
  path: string[];
  app: AppKind;
  from: Device;
  to: Device;
  notes: Map<number, string>;
  packet?: 'tunnel';
}

/** A piece of a journey: some ready-made steps (ARP, lookups) or a leg that firewalls check. */
type Piece = { steps: JourneyStep[] } | { segment: Segment };

function piecesSteps(topo: Topology, pieces: Piece[]): JourneyStep[] {
  return pieces.flatMap((p) =>
    'steps' in p ? p.steps : buildSteps(topo, p.segment.path, p.segment.notes, p.segment.packet),
  );
}

/**
 * ARP: `src` doesn't know the next device's hardware address, so it shouts
 * "Who has this address?" to everyone on its local network (switches pass a
 * shout to every socket), and the owner answers. Returns null if not needed.
 */
function arpSteps(
  topo: Topology,
  src: Device,
  path: string[],
  known: Map<string, Set<string>>,
): { steps: JourneyStep[]; learned: Array<{ deviceId: string; ip: string }> } | null {
  if (topo.edgeBetween(src.id, path[1])?.via === 'cell') return null;
  // The neighbour to find is the first stop that isn't a hub, switch or firewall.
  const target = path.slice(1).find((id) => !DEVICE_SPECS[topo.device(id).kind].isTransparent);
  if (!target) return null;
  const srcAddress = topo.address(src.id);
  const targetIp =
    topo.device(target).kind === 'router'
      ? `${topo.subnetFor(target, srcAddress.vlan)}.1`
      : topo.address(target).ip;
  if (!targetIp || !srcAddress.ip || known.get(src.id)?.has(targetIp)) return null;

  // Flood the shout outwards, wave by wave.
  const waves: JourneyStep[] = [];
  const visited = new Set([src.id]);
  type Front = { id: string; prev?: string; vlan: number | null };
  let frontier: Front[] = [{ id: src.id, vlan: null }];
  while (frontier.length) {
    const moves: Move[] = [];
    const next: Front[] = [];
    for (const f of frontier) {
      for (const e of topo.neighbours(f.id)) {
        const n = topo.other(e, f.id);
        if (visited.has(n) || e.via === 'cell') continue;
        if (f.id !== src.id && !topo.canPassThrough(f.id, f.prev, n)) continue;
        const vlan = e.access === undefined ? f.vlan : f.vlan === null || f.vlan === e.access ? e.access : -1;
        if (vlan === -1) continue;
        visited.add(n);
        const passesOn = DEVICE_SPECS[topo.device(n).kind].isTransparent || topo.device(n).kind === 'router';
        moves.push({
          from: f.id,
          to: n,
          via: e.via,
          linkId: e.linkId,
          fate: n === target ? 'arrive' : passesOn ? 'forward' : 'ignored',
        });
        if (passesOn) next.push({ id: n, prev: f.id, vlan });
      }
    }
    if (moves.length) waves.push({ moves, packet: 'arp' });
    frontier = next;
  }
  if (waves.length === 0) return null;
  waves[0].note = `Who has ${targetIp}? Tell ${srcAddress.ip}! (${src.name} shouts to everyone nearby)`;

  const back = topo.localPath(target, src.id);
  const reply = back
    ? stepsAlong(
        topo,
        back,
        'arp',
        `${topo.device(target).name}: That's me! My hardware address (MAC) is ${macOf(target)}.`,
      )
    : [];
  return {
    steps: [...waves, ...reply],
    learned: [
      { deviceId: src.id, ip: targetIp },
      { deviceId: target, ip: srcAddress.ip },
    ],
  };
}

/** A made-up but stable hardware (MAC) address for a device. */
export function macOf(id: string): string {
  let h = 2166136261;
  const bytes: string[] = ['02'];
  for (let i = 0; i < 5; i++) {
    for (const c of `${id}#${i}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    bytes.push((h & 0xff).toString(16).padStart(2, '0'));
  }
  return bytes.join(':');
}

type Route =
  | { ok: true; path: string[]; notes: Array<[number, string]>; internetIndex?: number }
  | { ok: false; at: string; message: string; path: string[] };

/** The way from `src` to `dst`, or where and why it gets stuck. `app` decides which firewall doors open. */
function route(topo: Topology, src: Device, dst: Device, app: AppKind | null): Route {
  const stuck = (at: Device, message: string, path: string[] = []): Route => ({
    ok: false,
    at: at.id,
    message,
    path,
  });
  const srcIp = topo.address(src.id).ip;
  const dstIp = topo.address(dst.id).ip;

  // Same home network: straight there.
  const local = topo.localPath(src.id, dst.id);
  if (local) {
    if (!srcIp || !dstIp) return stuck(src, `${src.name} doesn't have an address yet.`);
    if (!sameSubnet(srcIp, dstIp)) {
      return stuck(
        src,
        `${src.name} (${srcIp}) and ${dst.name} (${dstIp}) live in different neighbourhoods. Their addresses need the same first three numbers!`,
      );
    }
    return { ok: true, path: local, notes: [] };
  }

  const srcAddress = topo.address(src.id);
  const dstAddress = topo.address(dst.id);

  // Same router, different teams (VLANs): the router decides if they may talk.
  if (
    srcAddress.gatewayId &&
    srcAddress.gatewayId === dstAddress.gatewayId &&
    srcAddress.vlan !== dstAddress.vlan
  ) {
    const router = topo.device(srcAddress.gatewayId);
    const there = topo.localPath(src.id, router.id);
    const back = topo.localPath(router.id, dst.id);
    const teams = `${src.name} is on the ${vlanInfo(srcAddress.vlan).name} and ${dst.name} is on the ${vlanInfo(dstAddress.vlan).name}`;
    if (srcAddress.vlan === GUEST_VLAN || dstAddress.vlan === GUEST_VLAN) {
      return stuck(
        router,
        `${router.name} keeps guests apart from the home network! Guests can use the Internet, but not your devices.`,
        there ?? [],
      );
    }
    if (!router.router?.vlanRouting || !there || !back) {
      return stuck(router, `${teams}. ${router.name} keeps different teams (VLANs) apart.`, there ?? []);
    }
    return {
      ok: true,
      path: [...there, ...back.slice(1)],
      notes: [[there.length - 1, `${teams}. ${router.name} is allowed to pass it across.`]],
    };
  }

  // Otherwise out to the Internet: through the router (or cell tower), or straight there for Internet servers.
  let toInternet: string[];
  const notes: Array<[number, string]> = [];
  let gateway: Device | undefined;
  let lanPath: string[] = [src.id];
  if (srcAddress.source === 'public') {
    const out = topo.localPathToInternet(src.id);
    if (!out) return stuck(src, `${src.name} isn't connected to the Internet.`);
    toInternet = out;
  } else {
    const gatewayId = srcAddress.gatewayId;
    if (!gatewayId) return stuck(src, noGatewayReason(topo, src));
    gateway = topo.device(gatewayId);
    const there = topo.localPath(src.id, gatewayId);
    if (!there) return stuck(src, `${src.name} can't reach ${gateway.name}.`);
    lanPath = there;
    const wanPath = topo.localPathToInternet(gatewayId);
    if (!wanPath) {
      return stuck(
        gateway,
        `${gateway.name} isn't connected to the Internet! Connect it to the Internet cloud with a cable.`,
        lanPath,
      );
    }
    toInternet = [...lanPath, ...wanPath.slice(1)];
    notes.push([
      lanPath.length - 1,
      gateway.kind === 'cellTower'
        ? `${gateway.name} beams it into the Internet.`
        : `${gateway.name} writes its own return address on the packet, then sends it out.`,
    ]);
  }
  const internetIndex = toInternet.length - 1;

  // Servers on the Internet.
  if (dstAddress.source === 'public') {
    const fromInternet = topo.localPathToInternet(dst.id);
    if (!fromInternet) return stuck(dst, `${dst.name} isn't connected to the Internet.`, toInternet);
    return { ok: true, path: [...toInternet, ...fromInternet.slice(0, -1).reverse()], notes, internetIndex };
  }

  // Phones on mobile data: phones can text and ping each other through the phone company.
  if (topo.onCell(dst.id)) {
    const tower = topo.device(dstAddress.gatewayId!);
    const towerWan = topo.localPathToInternet(tower.id);
    if (!towerWan) return stuck(tower, `${tower.name} isn't connected to the Internet.`, toInternet);
    const inbound = [...towerWan].reverse().slice(1);
    if (topo.onCell(src.id) && (app === 'chat' || app === 'ping')) {
      const path = tower.id === gateway?.id ? [...lanPath, dst.id] : [...toInternet, ...inbound, dst.id];
      return {
        ok: true,
        path,
        notes: [[lanPath.length - 1, `The phone company carries it to ${dst.name}.`]],
      };
    }
    return stuck(
      tower,
      `The phone company keeps strangers out! ${dst.name} is on mobile data, so it can't be reached from the Internet.`,
      [...toInternet, ...inbound],
    );
  }

  // A device inside another home: it has to come in through that home's front door.
  const homeRouterId = dstAddress.gatewayId;
  const homeRouter = homeRouterId ? topo.device(homeRouterId) : undefined;
  if (!homeRouter) return stuck(dst, `${dst.name} can't be found from the Internet.`, toInternet);
  const homeWan = topo.localPathToInternet(homeRouter.id);
  if (!homeWan)
    return stuck(homeRouter, `${homeRouter.name}'s home isn't connected to the Internet.`, toInternet);
  const inbound = [...homeWan].reverse().slice(1); // first hop after the Internet ... the router
  const insidePath = homeRouter.id === dst.id ? [dst.id] : topo.localPath(homeRouter.id, dst.id);
  if (!insidePath)
    return stuck(homeRouter, `${homeRouter.name} can't reach ${dst.name}.`, [...toInternet, ...inbound]);

  const firewalls = inbound.map((id) => topo.device(id)).filter((d) => d.kind === 'firewall' && d.powered);
  const openDoor = app
    ? firewalls.find((fw) => fw.firewall?.doors?.some((d) => d.app === app && d.deviceId === dst.id))
    : undefined;
  const pingingFrontDoor = app === 'ping' && homeRouter.id === dst.id;

  if (!openDoor && !pingingFrontDoor) {
    const front = firewalls[0] ?? homeRouter;
    const stopAt = inbound.indexOf(front.id);
    const label = app ? APP_LABELS[app] : 'That';
    const hint =
      firewalls.length > 0 && app
        ? ` To let ${label.toLowerCase()} in, open door ${DOORS[app]} on ${firewalls[0].name} for ${dst.name}.`
        : " Devices in other homes can't be reached from the Internet. That keeps them safe.";
    return stuck(front, `${front.name} keeps strangers out!${hint}`, [
      ...toInternet,
      ...inbound.slice(0, stopAt + 1),
    ]);
  }

  const path = [...toInternet, ...inbound, ...insidePath.slice(1)];
  if (openDoor && app) {
    notes.push([
      path.indexOf(openDoor.id),
      `${openDoor.name}: door ${DOORS[app]} (${APP_LABELS[app]}) is open for ${dst.name}. Come in!`,
    ]);
  }
  return { ok: true, path, notes, internetIndex };
}

function notConnectedReason(topo: Topology, d: Device): string {
  const cell = topo.cellStatus(d.id);
  if (d.network === 'cell') {
    if (cell.state === 'noTower') return `${d.name} is on mobile data, but there is no cell tower anywhere!`;
    if (cell.state === 'outOfRange') return `${d.name} is too far from the cell tower. No signal!`;
  }
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

/** Simple steps along a path, used for lookups and to show how far a failed packet got. */
function stepsAlong(
  topo: Topology,
  path: string[],
  packet?: JourneyStep['packet'],
  note?: string,
): JourneyStep[] {
  return path.slice(0, -1).map((from, i) => {
    const arrives = i === path.length - 2 && packet !== undefined && packet !== 'tunnel';
    const moves = [move(topo, from, path[i + 1], arrives ? 'arrive' : 'forward')];
    // Hubs shout every packet to everyone, even ones that later get stopped or are only lookups.
    if (i > 0 && topo.device(from).kind === 'hub')
      moves.push(...hubCopies(topo, from, path[i - 1], path[i + 1]));
    return { moves, packet, note: i === 0 ? note : undefined };
  });
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
  notes: Map<number, string>,
  packet?: JourneyStep['packet'],
): JourneyStep[] {
  const steps: JourneyStep[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const last = i === path.length - 2;
    const moves: Move[] = [move(topo, from, to, last ? 'arrive' : 'forward')];
    if (i > 0 && topo.device(from).kind === 'hub') moves.push(...hubCopies(topo, from, path[i - 1], to));
    steps.push({ moves, note: notes.get(i), packet });
  }
  return steps;
}

function firewallBlock(topo: Topology, app: AppKind, src: Device, dst: Device, path: string[]): number {
  return path.findIndex((id, i) => {
    if (i === 0 || i === path.length - 1) return false;
    const fw = topo.device(id);
    if (fw.kind !== 'firewall' || !fw.firewall) return false;
    const { blockedApps, blockedDevices } = fw.firewall;
    return blockedApps.includes(app) || blockedDevices.includes(src.id) || blockedDevices.includes(dst.id);
  });
}

/**
 * Plays the journey's pieces in order. Each leg is checked by the firewalls on
 * it: inside a VPN tunnel they can only see "VPN", not the app hidden inside.
 */
function travel(
  topo: Topology,
  action: Action,
  src: Device,
  dst: Device,
  pieces: Piece[],
  name: string | undefined,
): Journey {
  const done: JourneyStep[] = [];
  const legs: Segment[] = [];
  for (const piece of pieces) {
    if ('steps' in piece) {
      done.push(...piece.steps);
      continue;
    }
    const leg = piece.segment;
    const blockIndex = firewallBlock(topo, leg.app, leg.from, leg.to, leg.path);
    if (blockIndex > 0) {
      const fw = topo.device(leg.path[blockIndex]);
      const partial = buildSteps(topo, leg.path.slice(0, blockIndex + 1), leg.notes, leg.packet);
      const last = partial[partial.length - 1];
      last.moves[0] = { ...last.moves[0], fate: 'blocked' };
      const byDevice = !fw.firewall!.blockedApps.includes(leg.app);
      return {
        action,
        from: src.id,
        to: dst.id,
        outcome: 'blocked',
        message: byDevice
          ? `${fw.name} said NO! It blocks ${fw.firewall!.blockedDevices.includes(leg.from.id) ? leg.from.name : leg.to.name}.`
          : `${fw.name} said NO! ${APP_LABELS[leg.app]} are blocked.`,
        at: fw.id,
        steps: [...done, ...partial],
        replySteps: [],
        name,
      };
    }
    done.push(...buildSteps(topo, leg.path, leg.notes, leg.packet));
    legs.push(leg);
  }

  const replySteps = HAS_REPLY.has(action)
    ? [...legs].reverse().flatMap((leg) => buildSteps(topo, [...leg.path].reverse(), new Map(), leg.packet))
    : [];
  return {
    action,
    from: src.id,
    to: dst.id,
    outcome: 'delivered',
    message: successMessage(action, src, dst, name),
    at: dst.id,
    steps: done,
    replySteps,
    name,
  };
}
