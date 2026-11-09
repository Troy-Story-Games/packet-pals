# Kid SDN

A kid-friendly network simulator. Build networks with computers, laptops, tablets, hubs, switches, WiFi routers, firewalls, the Internet and servers. Connect them with cables or WiFi, then send packets and watch Pip the Packet zoom along the wires. Twelve story missions teach real networking ideas (cables, switches vs hubs, DHCP addresses, WiFi names and passwords, the Internet and DNS, firewalls, address neighbourhoods), and a sandbox lets kids build anything. XP, stars, badges and a device collection book keep it fun.

Runs in any modern browser (installable as an offline app on Android tablets and Chromebooks), on GitHub Pages, on any static web host, or as a desktop app (Electron).

## Features

- **Drag-and-drop network canvas**: tap a device in the toolbox to add it, drag to move, plug in cables by tapping two devices (or dragging between them), erase with the sponge
- **Real-ish networking**: hubs flood, switches forward, routers hand out addresses (DHCP) and connect to the Internet, WiFi needs the right name, password and range, firewalls block apps or devices, and devices in other homes can't be reached directly
- **Packets you can watch**: ping, message, video, game, website and print, each animated hop by hop with a kid-friendly explanation of what happened
- **Missions**: Chapter 1 (12 guided puzzles on network basics, ending with a timed build-from-scratch race) and Chapter 2 "Network Pro" (phones and cell towers, DNS servers and your own website names, the Terminal with traceroute, and opening firewall doors for friends and game nights). Each advanced feature unlocks after the mission that teaches it.
- **Sandbox**: autosaved free build with decorative houses and offices (with rooms and paintable colours), smart-home devices (speakers, TVs, doorbells, cameras, lights, thermostats), save/open files, share as a QR code link
- **Terminal**: build `ping`, `traceroute`, `nslookup` and `ipconfig` commands from tappable pills and watch them run
- **Printer surprises**: every print pops out a fun document
- **Network Book**: every device explained, unlocked as it's discovered
- Read-aloud for every message, sound effects, optional procedural music

## Development

Prerequisites: [Node.js](https://nodejs.org/) 24 (see `.nvmrc`).

```bash
npm install
npm run dev          # start the dev server at http://localhost:5173
```

Other scripts:

| Command                  | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `npm test`               | Unit tests (Vitest): the network simulator and every mission |
| `npm run test:e2e`       | End-to-end tests in tablet and phone viewports (Playwright; run `npx playwright install chromium` once first) |
| `npm run lint`           | ESLint                                                  |
| `npm run build`          | Type-check and build the static site into `dist/`      |
| `npm run preview`        | Serve the production build locally                      |
| `npm run electron:dev`   | Run the desktop app against the dev server              |
| `npm run electron:build` | Build a desktop installer for your OS into `release/`   |
| `npm run icons`          | Regenerate app icons from `scripts/generate-icons.mjs`  |

To test on a tablet on the same network, run `npm run dev -- --host` and open the printed network URL.

## Project layout

```
src/
  app/          App shell: routing, top bar, reward pop-ups
  components/   Reusable UI (buttons, Pip the mascot, device art, toggles)
  core/sim/     Framework-free network simulator: devices, topology, addressing,
                WiFi, packet journeys, save/share format
  features/
    editor/     The network canvas, toolbox, tools, inspector and packet playback
    missions/   Mission map and mission runner
    sandbox/    Free build, autosave, files and QR sharing
    book/       Device collection book
    ...         home, trophies, credits
  game/         XP, levels, badges, missions catalogue, unlocks
  services/     Audio, speech, storage
  assets/       Images, sounds and emoji (see CREDITS.md)
  styles/       Design tokens and global CSS
electron/       Desktop app entry point
scripts/        Asset generation
tests/          unit/ (Vitest) and e2e/ (Playwright)
```

## Credits

Art and sound come from CC0 and openly licensed sources. See [CREDITS.md](CREDITS.md).

## License

[MIT](LICENSE)
