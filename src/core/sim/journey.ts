import { APP_FOR_ACTION, APP_LABELS, DEVICE_SPECS, DOMAINS, DOORS, SERVER_FOR_ACTION } from './devices';
import { resolveName } from './dns';
import { sameSubnet, type Topology } from './topology';
import type { Action, AppKind, Device, Journey, JourneyStep, Move } from './types';

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
export function sendPacket(topo: Topology, fromId: string, action: Action, to?: string): Journey {
  const src = topo.device(fromId);
  const fail = (at: Device, message: string, steps: JourneyStep[] = [], name?: string): Journey => ({
    action,
    from: fromId,
    to: to && topo.devices.has(to) ? to : undefined,
    outcome: 'failed',
    message,
    at: at.id,
    steps,
    replySteps: [],
    name,
  });

  if (!src.powered) return fail(src, `${src.name} is turned off. Switch it on first!`);
  if (topo.neighbours(src.id).length === 0) return fail(src, notConnectedReason(topo, src));

  // Work out the destination: a device, or a name looked up in the phone book (DNS).
  let dst: Device | undefined;
  let name: string | undefined;
  let lookupSteps: JourneyStep[] = [];
  const builtInLookup = { used: false };

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
    name = to ?? (serverKind ? DOMAINS[serverKind] : undefined);
    if (!name) return fail(src, 'Pick who to send it to!');
    const lookup = resolveName(topo, src.id, name);

    if (lookup.dnsId) {
      const dns = topo.device(lookup.dnsId);
      if (!dns.powered) {
        return fail(
          dns,
          `The phone book (${dns.name}) is switched off! Without it, names like ${name} can't be found.`,
          [],
          name,
        );
      }
      const ask = route(topo, src, dns, null);
      if (!ask.ok)
        return fail(
          topo.device(ask.at),
          `Can't reach the phone book: ${ask.message}`,
          stepsAlong(topo, ask.path, 'lookup'),
          name,
        );
      const answerIp = lookup.deviceId ? topo.address(lookup.deviceId).ip : null;
      lookupSteps = [
        ...stepsAlong(topo, ask.path, 'lookup', `Asking the phone book (${dns.name}): where is ${name}?`),
        ...stepsAlong(
          topo,
          [...ask.path].reverse(),
          'lookup',
          lookup.deviceId
            ? `${lookup.forwarded ? `${dns.name} asked the Internet. ` : ''}The phone book says: ${name} lives at ${answerIp}!`
            : `The phone book has never heard of ${name}.`,
        ),
      ];
    } else {
      builtInLookup.used = true;
    }

    if (!lookup.deviceId) {
      const serverLabel =
        serverKind && name === DOMAINS[serverKind]
          ? ` Add a ${DEVICE_SPECS[serverKind].label} to the Internet!`
          : '';
      return fail(src, `No one knows a website called "${name}".${serverLabel}`, lookupSteps, name);
    }
    dst = topo.device(lookup.deviceId);
  }

  if (!dst.powered) return fail(dst, `${dst.name} is turned off.`, lookupSteps, name);

  const app = APP_FOR_ACTION[action];
  const way = route(topo, src, dst, app);
  if (!way.ok)
    return fail(topo.device(way.at), way.message, [...lookupSteps, ...stepsAlong(topo, way.path)], name);

  const notes = new Map(way.notes);
  if (builtInLookup.used && name && way.internetIndex !== undefined) {
    notes.set(way.internetIndex, `Internet phone book: ${name} lives at ${topo.address(dst.id).ip}.`);
  }
  return travel(topo, action, src, dst, way.path, notes, lookupSteps, name);
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

  // Otherwise out through the router (or cell tower) to the Internet.
  const gatewayId = topo.address(src.id).gatewayId;
  if (!gatewayId) return stuck(src, noGatewayReason(topo, src));
  const gateway = topo.device(gatewayId);
  const lanPath = topo.localPath(src.id, gatewayId);
  if (!lanPath) return stuck(src, `${src.name} can't reach ${gateway.name}.`);
  const wanPath = topo.localPathToInternet(gatewayId);
  if (!wanPath) {
    return stuck(
      gateway,
      `${gateway.name} isn't connected to the Internet! Connect it to the Internet cloud with a cable.`,
      lanPath,
    );
  }
  const toInternet = [...lanPath, ...wanPath.slice(1)];
  const internetIndex = toInternet.length - 1;
  const notes: Array<[number, string]> = [
    [
      lanPath.length - 1,
      gateway.kind === 'cellTower'
        ? `${gateway.name} beams it into the Internet.`
        : `${gateway.name} writes its own return address on the packet, then sends it out.`,
    ],
  ];

  const dstAddress = topo.address(dst.id);

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
      const path = tower.id === gateway.id ? [...lanPath, dst.id] : [...toInternet, ...inbound, dst.id];
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
function stepsAlong(topo: Topology, path: string[], packet?: 'lookup', note?: string): JourneyStep[] {
  return path.slice(0, -1).map((from, i) => ({
    moves: [move(topo, from, path[i + 1], i === path.length - 2 && packet ? 'arrive' : 'forward')],
    packet,
    note: i === 0 ? note : undefined,
  }));
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

function buildSteps(topo: Topology, path: string[], notes: Map<number, string>): JourneyStep[] {
  const steps: JourneyStep[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const last = i === path.length - 2;
    const moves: Move[] = [move(topo, from, to, last ? 'arrive' : 'forward')];
    if (i > 0 && topo.device(from).kind === 'hub') moves.push(...hubCopies(topo, from, path[i - 1], to));
    steps.push({ moves, note: notes.get(i) });
  }
  return steps;
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
  notes: Map<number, string>,
  lookupSteps: JourneyStep[],
  name: string | undefined,
): Journey {
  const blockIndex = firewallBlock(topo, action, src, dst, path);
  if (blockIndex > 0) {
    const fw = topo.device(path[blockIndex]);
    const steps = buildSteps(topo, path.slice(0, blockIndex + 1), notes);
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
      steps: [...lookupSteps, ...steps],
      replySteps: [],
      name,
    };
  }

  const steps = buildSteps(topo, path, notes);
  const replySteps = HAS_REPLY.has(action) ? buildSteps(topo, [...path].reverse(), new Map()) : [];
  return {
    action,
    from: src.id,
    to: dst.id,
    outcome: 'delivered',
    message: successMessage(action, src, dst, name),
    at: dst.id,
    steps: [...lookupSteps, ...steps],
    replySteps,
    name,
  };
}
