import type { Journey } from '@/core/sim';
import { MissionNet } from './builder';
import type { HistoryEntry, Mission } from './types';

const delivered = (h: HistoryEntry[], pred: (j: Journey) => boolean = () => true) =>
  h.some((e) => e.journey.outcome === 'delivered' && pred(e.journey));

const ROUTER_OFF = { wifiOn: false, ssid: '', password: '', dhcp: true };
const TREEHOUSE = { wifiOn: true, ssid: 'Treehouse', password: 'pizza123', dhcp: true };

/** The story mode, in order. Each mission teaches one networking idea. */
/** Chapter 1: Network Basics. */
const CHAPTER_1: Array<Omit<Mission, 'chapter'>> = [
  {
    id: 'hello-cable',
    title: 'Hello, Cable!',
    emoji: '1f50c',
    story:
      "Hi, I'm Pip the Packet! I carry messages between computers. But these two computers aren't connected. Can you help?",
    goal: 'Connect the two computers with a cable. Then send a message from one to the other.',
    hints: [
      'Tap the plug tool, then tap one computer and then the other.',
      'Now tap a computer, press "Message", and pick the other computer.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('computer', 'amy', 120, 220, { name: "Amy's PC" })
        .add('computer', 'ben', 560, 220, { name: "Ben's PC" })
        .build(),
    check: ({ history }) => delivered(history, (j) => j.action === 'message'),
    lesson: 'Cables carry messages as tiny electric blips. Two connected computers are already a network!',
  },
  {
    id: 'ping-pong',
    title: 'Ping Pong',
    emoji: '1f3d3',
    story:
      'Three computers want to play together, but a computer only has ONE cable socket. A switch has lots of sockets!',
    goal: 'Connect all three computers to the switch. Then ping Computer 3 from Computer 1.',
    hints: [
      'Use the plug tool to connect each computer to the switch.',
      'Tap Computer 1, press "Ping", then pick Computer 3.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('switch', 'sw', 340, 260)
        .add('computer', 'c1', 80, 80, { name: 'Computer 1' })
        .add('computer', 'c2', 600, 80, { name: 'Computer 2' })
        .add('computer', 'c3', 340, 470, { name: 'Computer 3' })
        .build(),
    check: ({ history }) =>
      delivered(history, (j) => j.action === 'ping' && j.from === 'c1' && j.to === 'c3'),
    lesson:
      'A ping is like shouting "Are you there?" and hearing "Pong!" back. Switches let many devices join one network.',
  },
  {
    id: 'hub-vs-switch',
    title: 'Hub or Switch?',
    emoji: '1f4e1',
    story:
      'This is a HUB. Hubs are a bit noisy... Let us see what happens when Amy sends Ben a secret message!',
    goal: 'Send a message from Amy to Ben. Watch who hears it! Then swap the hub for a switch and send it again.',
    hints: [
      'Tap Amy, press "Message" and pick Ben. Look at Cleo!',
      'Use the eraser on the hub, add a switch, and plug everyone into it.',
    ],
    tools: ['switch'],
    setup: () =>
      new MissionNet()
        .add('hub', 'hub', 340, 260, { locked: false })
        .add('computer', 'amy', 80, 80, { name: 'Amy' })
        .add('computer', 'ben', 600, 80, { name: 'Ben' })
        .add('computer', 'cleo', 340, 480, { name: 'Cleo' })
        .link('amy', 'hub')
        .link('ben', 'hub')
        .link('cleo', 'hub')
        .build(),
    check: ({ history }) => {
      const viaHub = history.findIndex(
        (e) => e.journey.outcome === 'delivered' && e.kindsOnPath.includes('hub'),
      );
      return (
        viaHub >= 0 &&
        history
          .slice(viaHub + 1)
          .some(
            (e) =>
              e.journey.outcome === 'delivered' &&
              e.journey.action === 'message' &&
              e.kindsOnPath.includes('switch'),
          )
      );
    },
    lesson:
      'A hub shouts every message to EVERYONE. A switch is smarter: it only sends it to the right device. That is faster and more private!',
  },
  {
    id: 'home-router',
    title: 'Home Router',
    emoji: '1f3e0',
    story:
      'Every home network has a ROUTER. It is the boss of the network and gives every device an address, like a house number!',
    goal: 'Plug the computer into the router. Look at the address it gets! Then ping the router.',
    hints: [
      'Connect the computer to the router with the plug tool.',
      'Tap the computer, press "Ping" and pick the router.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 340, 200, { router: { ...ROUTER_OFF } })
        .add('computer', 'pc', 100, 420, { name: 'Computer' })
        .build(),
    check: ({ history, topo }) =>
      topo.address('pc').source === 'dhcp' &&
      delivered(history, (j) => j.action === 'ping' && j.to === 'router'),
    lesson: 'Giving out addresses automatically is called DHCP. Now every packet knows exactly where to go!',
  },
  {
    id: 'make-wifi',
    title: 'Make a WiFi',
    emoji: '1f4f6',
    story:
      'Laptops can connect without any cables, using WiFi! WiFi is messages sent through the air with radio waves.',
    goal: 'Turn on the router\'s WiFi and call it "Treehouse". Then join the laptop to it and ping the router.',
    hints: [
      'Tap the router. Switch WiFi on and type the name Treehouse and a password.',
      'Tap the laptop, pick Treehouse and type the same password.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 300, 160, { router: { ...ROUTER_OFF } })
        .add('laptop', 'laptop', 480, 380, { name: 'Laptop' })
        .build(),
    check: ({ network, history }) => {
      const r = network.devices.find((d) => d.id === 'router')?.router;
      return (
        Boolean(r?.wifiOn && r.ssid.trim().toLowerCase() === 'treehouse') &&
        delivered(
          history,
          (j) => j.from === 'laptop' && j.action === 'ping' && j.steps[0]?.moves[0]?.via === 'wifi',
        )
      );
    },
    lesson:
      "WiFi has a name (SSID) so you can find it, and a password so strangers can't join. Keep your password secret!",
  },
  {
    id: 'wrong-password',
    title: 'Oops, Password!',
    emoji: '1f511',
    story:
      "Uh-oh! The tablet can't get online. Somebody typed the WiFi password wrong. The sticky note on the router says: pizza123",
    goal: "Fix the tablet's WiFi password. Then send a message from the tablet to the computer.",
    hints: [
      'Tap the tablet. Type pizza123 as the password and join again.',
      'Then press "Message" and pick the computer.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 300, 200, { router: { ...TREEHOUSE } })
        .add('computer', 'pc', 60, 420, { name: 'Computer' })
        .add('tablet', 'tablet', 540, 380, {
          name: 'Tablet',
          wifi: { ssid: 'Treehouse', password: 'piza123' },
        })
        .link('pc', 'router')
        .build(),
    check: ({ history }) => delivered(history, (j) => j.from === 'tablet' && j.action === 'message'),
    lesson: 'Passwords have to be EXACTLY right, every letter. That keeps your network safe!',
  },
  {
    id: 'hello-internet',
    title: 'Hello, Internet!',
    emoji: '1f310',
    story:
      'The Internet is a giant network of networks! Your router is the door from your home to the whole world.',
    goal: 'Connect the router to the Internet. Then watch a video on the laptop!',
    hints: [
      'Use the plug tool to connect the router to the Internet cloud.',
      'Tap the laptop and press "Video".',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 220, 260, { router: { ...TREEHOUSE } })
        .add('laptop', 'laptop', 40, 460, {
          name: 'Laptop',
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .add('internet', 'internet', 560, 140)
        .add('videoServer', 'videos', 820, 40)
        .link('videos', 'internet')
        .build(),
    check: ({ history }) => delivered(history, (j) => j.action === 'video'),
    lesson:
      "Websites have names like videos.fun. The Internet's phone book (DNS) turns the name into an address!",
  },
  {
    id: 'too-far',
    title: 'Too Far Away',
    emoji: '1f9ed',
    story: 'WiFi radio waves can only travel so far. The tablet is way out in the garden!',
    goal: 'Move the tablet closer to the router until it connects. Then play a game!',
    hints: [
      'Drag the tablet toward the router. Watch the WiFi circles!',
      'When the tablet is happy, press "Game".',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 120, 260, { router: { ...TREEHOUSE } })
        .add('tablet', 'tablet', 900, 420, {
          name: 'Tablet',
          locked: false,
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .add('internet', 'internet', 120, 20)
        .add('gameServer', 'games', 420, 20)
        .link('router', 'internet')
        .link('games', 'internet')
        .build(),
    check: ({ history }) => delivered(history, (j) => j.from === 'tablet' && j.action === 'game'),
    lesson: 'Walls and distance make WiFi weaker. That is why some homes have more than one WiFi router!',
  },
  {
    id: 'bedtime',
    title: 'Bedtime Rules',
    emoji: '1f6e1',
    story: 'A FIREWALL is like a guard at the door. It checks every packet and only lets in what is allowed.',
    goal: "It's bedtime! Make the firewall block games. Then show games are blocked but videos still work.",
    hints: [
      'Tap the firewall and switch on "Block Games".',
      'Try "Game" on the console (blocked!), then "Video" on the laptop.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 260, 260, { router: { ...TREEHOUSE } })
        .add('console', 'console', 40, 460, { name: 'Game Console' })
        .add('laptop', 'laptop', 400, 470, {
          name: 'Laptop',
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .add('firewall', 'firewall', 520, 160)
        .add('internet', 'internet', 760, 160)
        .add('videoServer', 'videos', 980, 40)
        .add('gameServer', 'games', 980, 300)
        .link('console', 'router')
        .link('router', 'firewall')
        .link('firewall', 'internet')
        .link('videos', 'internet')
        .link('games', 'internet')
        .build(),
    check: ({ history }) =>
      history.some((e) => e.journey.outcome === 'blocked' && e.journey.action === 'game') &&
      delivered(history, (j) => j.action === 'video'),
    lesson:
      'Firewalls follow rules. Parents and schools use them to keep networks safe and stop bad stuff getting in.',
  },
  {
    id: 'fix-address',
    title: 'Wrong Address',
    emoji: '1f4c2',
    story:
      'Someone typed a made-up address into this computer. Now it lives in the wrong neighbourhood and nothing works!',
    goal: 'Fix the computer\'s address (try "Automatic"). Then open the website kidsweb.fun!',
    hints: ['Tap the computer and switch its address to Automatic.', 'Then press "Website".'],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 300, 260, { router: { ...TREEHOUSE } })
        .add('computer', 'pc', 60, 460, { name: 'Computer', staticIp: '10.0.0.5' })
        .add('internet', 'internet', 620, 160)
        .add('webServer', 'web', 880, 60)
        .link('pc', 'router')
        .link('router', 'internet')
        .link('web', 'internet')
        .build(),
    check: ({ history }) => delivered(history, (j) => j.from === 'pc' && j.action === 'web'),
    lesson:
      'Devices on the same network share the first part of their address, like houses on the same street.',
  },
  {
    id: 'printer-party',
    title: 'Printer Party',
    emoji: '1f5a8',
    story: 'Everyone wants to print party invitations! The printer is plugged into... nothing.',
    goal: 'Connect the printer to the switch. Then print from the laptop!',
    hints: ['Plug the printer into the switch.', 'Tap the laptop, press "Print" and pick the printer.'],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 120, 240, { router: { ...TREEHOUSE } })
        .add('switch', 'sw', 440, 240)
        .add('computer', 'pc1', 360, 460, { name: 'Computer 1' })
        .add('computer', 'pc2', 600, 460, { name: 'Computer 2' })
        .add('printer', 'printer', 760, 160, { name: 'Printer' })
        .add('laptop', 'laptop', 60, 470, {
          name: 'Laptop',
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .link('router', 'sw')
        .link('pc1', 'sw')
        .link('pc2', 'sw')
        .build(),
    check: ({ history }) => delivered(history, (j) => j.from === 'laptop' && j.action === 'print'),
    lesson:
      'WiFi devices and cabled devices on the same router are all in ONE home network, so they can share things like printers.',
  },
  {
    id: 'packet-race',
    title: 'Packet Race',
    emoji: '23f1',
    story: 'Final challenge! Build a whole network from nothing, as fast as you can. Ready... set... GO!',
    goal: 'Build a network where a computer can watch a video. Beat the clock!',
    hints: [
      'You need: a computer, a router, the Internet and a video server.',
      'Connect computer to router, router to Internet, video server to Internet. Then press "Video"!',
    ],
    tools: ['computer', 'router', 'internet', 'videoServer', 'switch'],
    setup: () => ({ devices: [], links: [] }),
    check: ({ history }) => delivered(history, (j) => j.action === 'video'),
    lesson: 'You built a network all by yourself. You are a real network engineer!',
    timeLimit: 180,
  },
];

const CASTLE = { wifiOn: true, ssid: 'Castle', password: 'dragon42', dhcp: true };
const BLUE_HOUSE = { walls: '#bfdbfe', roof: '#1d4ed8', floors: '#eff6ff', trim: '#1e3a8a' };

/** Two houses on the Internet; your firewall guards your front door. */
function twoHouses(
  you: [kind: 'computer' | 'console', id: string, name: string],
  friend: [kind: 'laptop' | 'console', id: string, name: string],
) {
  return new MissionNet()
    .building('house1', -80, 120, 'Your house')
    .building('house1', 1000, 120, "Friend's house", BLUE_HOUSE)
    .add(you[0], you[1], 60, 430, { name: you[2] })
    .add('router', 'r1', 160, 300, { router: { ...TREEHOUSE } })
    .add('firewall', 'wall', 380, 180, { name: 'Your Firewall' })
    .add('internet', 'internet', 680, 20)
    .add('router', 'r2', 1260, 300, { name: "Friend's Router", router: { ...CASTLE } })
    .add(friend[0], friend[1], 1160, 450, { name: friend[2], wifi: { ssid: 'Castle', password: 'dragon42' } })
    .link(you[1], 'r1')
    .link('r1', 'wall')
    .link('wall', 'internet')
    .link('r2', 'internet');
}

/** Chapter 2: Network Pro. Each mission unlocks an advanced feature. */
const CHAPTER_2: Mission[] = [
  {
    id: 'phone-home',
    title: 'Phone Home',
    emoji: '1f4f1',
    chapter: 2,
    minLevel: 6,
    features: ['cell'],
    story:
      "This phone is at the park, far away from home. The home WiFi can't reach it. But phones have a secret power: mobile data from cell towers!",
    goal: 'Switch the phone to Mobile data, then watch a video on it.',
    hints: ['Tap the phone and choose Mobile data.', 'Now press "Video" on the phone.'],
    tools: [],
    setup: () =>
      new MissionNet()
        .building('house1', -60, 120, 'Home')
        .add('router', 'router', 120, 300, { router: { ...TREEHOUSE } })
        .add('internet', 'internet', 700, 40)
        .add('videoServer', 'videos', 1000, -60)
        .add('cellTower', 'tower', 1150, 260)
        .add('phone', 'phone', 1240, 470, {
          name: 'Phone',
          network: 'wifi',
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .link('router', 'internet')
        .link('videos', 'internet')
        .link('tower', 'internet')
        .build(),
    check: ({ history }) =>
      delivered(
        history,
        (j) => j.from === 'phone' && j.action === 'video' && j.steps[0]?.moves[0]?.via === 'cell',
      ),
    lesson:
      'Cell towers are giant radios on tall poles. They reach much further than WiFi, so phones can get online almost anywhere!',
  },
  {
    id: 'phone-book',
    title: "The Internet's Phone Book",
    emoji: '1f4d6',
    chapter: 2,
    minLevel: 6,
    features: ['cell', 'dnsServer'],
    story:
      "Uh-oh, websites stopped working! Every website has a name, and a DNS server is the Internet's phone book. It turns names into addresses.",
    goal: "Open kidsweb.fun on the laptop. If it doesn't work, find out why and fix it!",
    hints: [
      'Press "Website" on the laptop and read what goes wrong.',
      'The DNS Server is asleep. Tap it and switch it on!',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('router', 'router', 120, 300, { router: { ...TREEHOUSE } })
        .add('laptop', 'laptop', 300, 480, {
          name: 'Laptop',
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .add('internet', 'internet', 600, 120)
        .add('webServer', 'web', 900, 0)
        .add('dnsServer', 'dns', 900, 300, { powered: false })
        .link('router', 'internet')
        .link('web', 'internet')
        .link('dns', 'internet')
        .build(),
    check: ({ history }) =>
      delivered(
        history,
        (j) => j.from === 'laptop' && j.action === 'web' && j.steps.some((s) => s.packet === 'lookup'),
      ),
    lesson:
      'DNS turns names like kidsweb.fun into addresses like 203.0.113.10. Without it, you would have to remember lots of numbers!',
  },
  {
    id: 'network-detective',
    title: 'Network Detective',
    emoji: '1f50d',
    chapter: 2,
    minLevel: 7,
    features: ['cell', 'dnsServer', 'terminal'],
    story:
      "Something is broken between this computer and the Internet. But where? Network detectives use the Terminal and a tool called traceroute to follow a packet's trail!",
    goal: 'Open the Terminal and run traceroute from the Computer to videos.fun. Find where it gets stuck, fix it, then ping videos.fun.',
    hints: [
      'Tap the Terminal button, pick traceroute, the Computer, and videos.fun. Then press Run!',
      'It gets stuck after the router. Look at the device after it. Is it asleep?',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .add('computer', 'pc', 60, 420, { name: 'Computer' })
        .add('switch', 'switch', 260, 420)
        .add('router', 'router', 480, 300, { router: { ...TREEHOUSE } })
        .add('firewall', 'wall', 700, 180, { powered: false })
        .add('internet', 'internet', 920, 80)
        .add('videoServer', 'videos', 1180, 0)
        .link('pc', 'switch')
        .link('switch', 'router')
        .link('router', 'wall')
        .link('wall', 'internet')
        .link('videos', 'internet')
        .build(),
    nudge: (latest, history) => {
      if (!latest.command && latest.journey.from === 'pc') {
        return "That's the right idea! But a network detective uses the Terminal. Tap the Terminal button and try it there.";
      }
      if (latest.command === 'ping' && !history.some((e) => e.command === 'traceroute')) {
        return 'Good ping! Now run traceroute too, to follow the trail.';
      }
      return undefined;
    },
    check: ({ history }) =>
      history.some((e) => e.command === 'traceroute') &&
      history.some(
        (e) => e.command === 'ping' && e.journey.outcome === 'delivered' && e.journey.from === 'pc',
      ),
    lesson:
      'Traceroute lists every stop a packet makes. Where the list stops, that is where to look for the problem!',
  },
  {
    id: 'my-website',
    title: 'My Own Website',
    emoji: '1f3e1',
    chapter: 2,
    minLevel: 7,
    features: ['cell', 'dnsServer', 'terminal', 'dnsNames'],
    story:
      "You built your very own website, and it lives on a server at home! But nobody can find it without a name. Let's add it to your home's phone book.",
    goal: 'Tap Home DNS and add the name "mysite.home" for My Website. Then open mysite.home on the laptop!',
    hints: [
      'Tap Home DNS, open Advanced, type mysite.home, pick My Website and press Add.',
      'Tap the laptop, press "Website" and pick mysite.home.',
    ],
    tools: [],
    setup: () =>
      new MissionNet()
        .building('house2', -80, 80, 'Home')
        .add('router', 'router', 200, 280, { router: { ...TREEHOUSE } })
        .add('switch', 'switch', 420, 440)
        .add('laptop', 'laptop', 60, 520, {
          name: 'Laptop',
          wifi: { ssid: 'Treehouse', password: 'pizza123' },
        })
        .add('webServer', 'mysite', 640, 520, { name: 'My Website' })
        .add('dnsServer', 'homedns', 640, 320, { name: 'Home DNS' })
        .add('internet', 'internet', 860, 60)
        .add('webServer', 'web', 1120, -20)
        .link('switch', 'router')
        .link('mysite', 'switch')
        .link('homedns', 'switch')
        .link('router', 'internet')
        .link('web', 'internet')
        .build(),
    check: ({ history }) =>
      delivered(
        history,
        (j) => j.from === 'laptop' && j.action === 'web' && j.to === 'mysite' && Boolean(j.name),
      ),
    lesson:
      "Your home DNS server knows your own names, and asks the Internet's phone book for everything else.",
  },
  {
    id: 'door-numbers',
    title: 'Door Numbers',
    emoji: '1f6aa',
    chapter: 2,
    minLevel: 8,
    features: ['cell', 'dnsServer', 'terminal', 'dnsNames', 'doors'],
    story:
      'Your friend wants to send you a message from their house. But your firewall guards your front door and keeps strangers out!',
    goal: "Send a message from Friend's Laptop to Your PC. When it's blocked, open the Chat door on your Firewall for Your PC, then try again!",
    hints: [
      'Tap Friend\'s Laptop, press "Message" and pick Your PC. Watch where it stops.',
      'Tap your Firewall, open Advanced, and open the Chat door for Your PC.',
    ],
    tools: [],
    setup: () => twoHouses(['computer', 'pc', 'Your PC'], ['laptop', 'friend', "Friend's Laptop"]).build(),
    nudge: ({ journey }) =>
      journey.from === 'pc' && journey.to === 'friend'
        ? "Other way round! Your friend sends the message: tap Friend's Laptop and send it to Your PC."
        : undefined,
    check: ({ history }) =>
      delivered(history, (j) => j.from === 'friend' && j.to === 'pc' && j.action === 'message'),
    lesson:
      'Every app knocks on a different numbered door, called a port. A firewall only opens the doors you choose, so your home stays safe.',
  },
  {
    id: 'game-night',
    title: 'Game Night',
    emoji: '1f3ae',
    chapter: 2,
    minLevel: 8,
    features: ['cell', 'dnsServer', 'terminal', 'dnsNames', 'doors', 'hostGames'],
    story:
      'Game night! You are hosting the game on your console, and your friend wants to join from their house.',
    goal: "Open the Games door on your Firewall for Your Console. Then have your friend's console join your game.",
    hints: [
      'Tap your Firewall, open Advanced, and open the Games door for Your Console.',
      'Tap Friend\'s Console, press "Game" and pick Your Console.',
    ],
    tools: [],
    setup: () =>
      twoHouses(
        ['console', 'myconsole', 'Your Console'],
        ['console', 'friendconsole', "Friend's Console"],
      ).build(),
    nudge: ({ journey }) =>
      journey.from === 'myconsole' && journey.to === 'friendconsole'
        ? "Close! But YOU are the host. Your friend's console should join Your Console."
        : undefined,
    check: ({ history }) =>
      delivered(history, (j) => j.from === 'friendconsole' && j.to === 'myconsole' && j.action === 'game'),
    lesson: 'When you host a game, friends knock on door 3074. Only open doors for games you trust!',
  },
];

export const MISSIONS: Mission[] = [...CHAPTER_1.map((m) => ({ ...m, chapter: 1 as const })), ...CHAPTER_2];

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

/** Stars for a finished mission. Timed missions score on speed. */
export function missionStars(mission: Mission, hintsUsed: number, failures: number, seconds: number): number {
  if (mission.timeLimit)
    return seconds <= mission.timeLimit / 3 ? 3 : seconds <= (mission.timeLimit * 2) / 3 ? 2 : 1;
  if (hintsUsed === 0 && failures <= 2) return 3;
  if (hintsUsed <= 1 && failures <= 6) return 2;
  return 1;
}
