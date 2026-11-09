import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import QRCode from 'qrcode';
import { exportNetwork, importNetwork, type Network } from '@/core/sim';

/** Links longer than this make QR codes too dense to scan comfortably. */
const MAX_LINK_LENGTH = 1800;

export type ShareResult =
  { ok: true; url: string; svg: string } | { ok: false; reason: 'tooBig' | 'offline' };

/** A link that opens this network in the sandbox, plus a QR code of it. */
export async function shareLink(network: Network): Promise<ShareResult> {
  if (!location.protocol.startsWith('http')) return { ok: false, reason: 'offline' };
  const packed = compressToEncodedURIComponent(JSON.stringify(exportNetwork(network)));
  const url = `${location.origin}${location.pathname}#/sandbox?net=${packed}`;
  if (url.length > MAX_LINK_LENGTH) return { ok: false, reason: 'tooBig' };
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'L', margin: 2 });
  return { ok: true, url, svg };
}

export function readSharedNetwork(packed: string): Network | null {
  try {
    const json = decompressFromEncodedURIComponent(packed);
    return json ? importNetwork(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

export function downloadNetwork(network: Network): void {
  const blob = new Blob([JSON.stringify(exportNetwork(network), null, 1)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'my-network.packetpals.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function readNetworkFile(file: File): Promise<Network | null> {
  try {
    return importNetwork(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}
