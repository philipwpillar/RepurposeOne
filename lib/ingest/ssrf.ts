import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/** Max redirect hops; each hop re-validates scheme + resolved IP. */
export const INGEST_MAX_REDIRECTS = 3;

const BLOCKED_V4: Array<{ net: number; mask: number }> = [
  // 0.0.0.0/8
  { net: 0x00000000, mask: 0xff000000 },
  // 10.0.0.0/8
  { net: 0x0a000000, mask: 0xff000000 },
  // 100.64.0.0/10 CGNAT
  { net: 0x64400000, mask: 0xffc00000 },
  // 127.0.0.0/8
  { net: 0x7f000000, mask: 0xff000000 },
  // 169.254.0.0/16 link-local
  { net: 0xa9fe0000, mask: 0xffff0000 },
  // 172.16.0.0/12
  { net: 0xac100000, mask: 0xfff00000 },
  // 192.0.0.0/24
  { net: 0xc0000000, mask: 0xffffff00 },
  // 192.0.2.0/24 TEST-NET-1
  { net: 0xc0000200, mask: 0xffffff00 },
  // 192.168.0.0/16
  { net: 0xc0a80000, mask: 0xffff0000 },
  // 198.18.0.0/15 benchmarking
  { net: 0xc6120000, mask: 0xfffe0000 },
  // 198.51.100.0/24 TEST-NET-2
  { net: 0xc6336400, mask: 0xffffff00 },
  // 203.0.113.0/24 TEST-NET-3
  { net: 0xcb007100, mask: 0xffffff00 },
  // 224.0.0.0/4 multicast
  { net: 0xe0000000, mask: 0xf0000000 },
  // 240.0.0.0/4 reserved
  { net: 0xf0000000, mask: 0xf0000000 },
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;
  return BLOCKED_V4.some(({ net, mask }) => (n & mask) === (net & mask));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("fe80")) return true; // link-local
  if (normalized.startsWith("ff")) return true; // multicast
  // IPv4-mapped :ffff:x.x.x.x
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

/** True if the IP must not be fetched (SSRF). */
export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true;
}

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/**
 * Validate URL for outbound fetch: http(s) only, no credentials, DNS resolves
 * to a public IP. Hostname checks alone are insufficient — always resolve.
 */
export async function assertSafeIngestUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("That does not look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs are supported.");
  }

  if (url.username || url.password) {
    throw new SsrfError("URLs with credentials are not allowed.");
  }

  const hostname = url.hostname;
  if (!hostname) {
    throw new SsrfError("That does not look like a valid URL.");
  }

  // Literal IP in the URL — check without DNS.
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new SsrfError("That address is not allowed.");
    }
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfError("Could not resolve that host.");
  }

  if (addresses.length === 0) {
    throw new SsrfError("Could not resolve that host.");
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new SsrfError("That address is not allowed.");
    }
  }

  return url;
}
