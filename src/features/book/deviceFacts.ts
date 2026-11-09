import type { DeviceKind } from '@/core/sim';

/** Kid-friendly explanations for the Network Book. */
export const DEVICE_FACTS: Record<DeviceKind, { what: string; fact: string }> = {
  computer: {
    what: 'A computer you sit at. It plugs into the network with a cable.',
    fact: 'The first computer network sent its first message in 1969. It crashed after two letters: "LO"!',
  },
  laptop: {
    what: 'A computer you can carry. It can use a cable or WiFi.',
    fact: 'Laptops have tiny radio antennas hidden around their screens.',
  },
  tablet: {
    what: 'A touch-screen computer. It only uses WiFi, it has no cable socket.',
    fact: 'Your tablet can see lots of WiFi networks at once. It just picks the one you tell it.',
  },
  console: {
    what: 'A games machine. It needs the Internet to play with friends far away.',
    fact: 'When you play online, your console sends lots of tiny packets every second!',
  },
  printer: {
    what: 'Turns what is on a screen into paper. Anyone on the home network can use it.',
    fact: 'Network printers have their own address, just like computers.',
  },
  hub: {
    what: 'Connects devices together, but shouts every message to EVERYONE.',
    fact: 'Hubs are old and noisy. Today almost every network uses switches instead.',
  },
  switch: {
    what: 'Connects devices together and sends each message only to the right one.',
    fact: 'A switch remembers which device is on which socket, so it never has to shout.',
  },
  router: {
    what: 'The boss of a home network. It gives out addresses, makes WiFi and connects you to the Internet.',
    fact: 'The router writes its own address on packets going out, so replies find their way home.',
  },
  firewall: {
    what: 'A guard that checks every packet and blocks the ones that are not allowed.',
    fact: 'It is named after real fire walls in buildings that stop fire from spreading.',
  },
  internet: {
    what: 'A giant network of networks that connects homes, schools and servers all over the world.',
    fact: 'Most Internet packets travel through glass cables under the oceans, using light!',
  },
  videoServer: {
    what: 'A computer far away that stores videos and sends them to you.',
    fact: 'A video is sent as thousands of packets. Your device puts them back together.',
  },
  gameServer: {
    what: 'A computer far away where online games happen.',
    fact: 'Game servers try to be close to players, because far-away packets take longer.',
  },
  webServer: {
    what: 'A computer far away that sends you websites.',
    fact: 'Web servers never sleep. They answer requests day and night!',
  },
  dnsServer: {
    what: 'The phone book of the Internet. It turns names like videos.fun into addresses.',
    fact: 'Your device asks a DNS server for help almost every time you open a website!',
  },
  phone: {
    what: 'A pocket computer. It can use WiFi at home, or mobile data from a cell tower anywhere.',
    fact: 'The first mobile phone call was made in 1973, on a phone as heavy as a big bag of sugar!',
  },
  cellTower: {
    what: 'A tall tower with radios on top. It gives phones mobile data across a whole neighbourhood.',
    fact: 'Some cell towers are disguised as trees so they blend in!',
  },
  smartSpeaker: {
    what: 'A speaker that listens for its name and answers questions using the Internet.',
    fact: 'It sends your question to a server far away, which works out the answer.',
  },
  smartTv: {
    what: 'A TV that can play videos straight from the Internet.',
    fact: 'Streaming one movie can take as many packets as there are stars you can see at night!',
  },
  doorbell: {
    what: 'A doorbell with a camera. You can see who is at the door on your phone.',
    fact: 'It sends a little video to your phone, even when you are far away.',
  },
  camera: {
    what: 'A camera that watches over a room or garden and streams the picture over the network.',
    fact: "Security cameras can see in the dark using light that people can't see, called infrared.",
  },
  smartLight: {
    what: 'A light bulb you can switch on, off or change colour from a phone.',
    fact: 'Some smart lights can show 16 million different colours!',
  },
  thermostat: {
    what: 'Keeps your home warm or cool, and can be changed from your phone.',
    fact: 'Some thermostats learn when you are home and set the temperature all by themselves.',
  },
};
