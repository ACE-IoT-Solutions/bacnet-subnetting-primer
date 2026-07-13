/**
 * BACnet Subnet Calculator Core Logic
 * Handles 32-bit unsigned integer conversions, subnet masking,
 * and subnet calculations.
 */

export interface SubnetDetails {
  ip: string;
  ipLong: number;
  mask: string;
  maskLong: number;
  cidr: number;
  network: string;
  networkLong: number;
  broadcast: string;
  broadcastLong: number;
  firstUsable: string;
  firstUsableLong: number | null;
  lastUsable: string;
  lastUsableLong: number | null;
  numHosts: number;
}

export interface SubnetRelationship {
  aThinksBInSubnet: boolean;
  bThinksAInSubnet: boolean;
  sameBroadcast: boolean;
  sameSubnet: boolean;
  broadcastIntersectionTrap: boolean;
  asymmetricalSubnet: boolean;
  overlappingSubnet: boolean;
  isolated: boolean;
}

// Convert IP string to 32-bit unsigned integer
export function ipToLong(ip: string | null | undefined): number | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
    return null;
  }
  const parts = trimmed.split('.').map(Number);
  if (parts.some(p => p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) +
         ((parts[1] << 16) >>> 0) +
         ((parts[2] << 8) >>> 0) +
         (parts[3] >>> 0);
}

// Convert 32-bit unsigned integer to IP string
export function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

// Convert CIDR suffix (e.g. 24) to 32-bit subnet mask
export function cidrToMask(cidr: number): number {
  if (cidr === 0) return 0;
  if (cidr === 32) return 0xFFFFFFFF >>> 0;
  return (~((1 << (32 - cidr)) - 1)) >>> 0;
}

// Convert 32-bit subnet mask to CIDR suffix
export function maskToCidr(mask: number): number {
  let count = 0;
  let temp = mask >>> 0;
  for (let i = 0; i < 32; i++) {
    if (temp & 0x80000000) {
      count++;
      temp = (temp << 1) >>> 0;
    } else {
      break;
    }
  }
  return count;
}

// Validate subnet mask string (e.g. "255.255.255.0")
export function validateMaskString(maskStr: string): boolean {
  const long = ipToLong(maskStr);
  if (long === null) return false;
  
  const inverted = (~long) >>> 0;
  if (inverted === 0) return true;
  return ((inverted + 1) & inverted) === 0;
}

// Convert mask long or string to CIDR
export function getMaskCidr(maskInput: number | string): number | null {
  if (typeof maskInput === 'number') {
    return maskToCidr(maskInput);
  }
  const long = ipToLong(maskInput);
  if (long === null) return null;
  return maskToCidr(long);
}

// Get network details
export function getSubnetDetails(ipStr: string, cidrOrMask: number | string): SubnetDetails | null {
  const ip = ipToLong(ipStr);
  if (ip === null) return null;

  let mask: number | null;
  if (typeof cidrOrMask === 'number') {
    if (cidrOrMask < 0 || cidrOrMask > 32) return null;
    mask = cidrToMask(cidrOrMask);
  } else {
    mask = ipToLong(cidrOrMask);
    if (mask === null || !validateMaskString(cidrOrMask)) return null;
  }

  const cidr = maskToCidr(mask);
  const network = (ip & mask) >>> 0;
  const wildcard = (~mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  
  let firstUsable: number | null = null;
  let lastUsable: number | null = null;
  let numHosts = 0;

  if (cidr < 31) {
    firstUsable = (network + 1) >>> 0;
    lastUsable = (broadcast - 1) >>> 0;
    numHosts = lastUsable - firstUsable + 1;
  } else if (cidr === 31) {
    firstUsable = network;
    lastUsable = broadcast;
    numHosts = 2;
  } else if (cidr === 32) {
    firstUsable = ip;
    lastUsable = ip;
    numHosts = 1;
  }

  return {
    ip: ipStr,
    ipLong: ip,
    mask: longToIp(mask),
    maskLong: mask,
    cidr,
    network: longToIp(network),
    networkLong: network,
    broadcast: longToIp(broadcast),
    broadcastLong: broadcast,
    firstUsable: firstUsable !== null ? longToIp(firstUsable) : 'N/A',
    firstUsableLong: firstUsable,
    lastUsable: lastUsable !== null ? longToIp(lastUsable) : 'N/A',
    lastUsableLong: lastUsable,
    numHosts
  };
}

// Analyze the relationship between two device subnet configurations
export function analyzeRelationship(devA: SubnetDetails | null, devB: SubnetDetails | null): SubnetRelationship | null {
  if (!devA || !devB) return null;

  const aThinksBInSubnet = (devB.ipLong & devA.maskLong) >>> 0 === devA.networkLong;
  const bThinksAInSubnet = (devA.ipLong & devB.maskLong) >>> 0 === devB.networkLong;
  const sameBroadcast = devA.broadcastLong === devB.broadcastLong;
  const sameSubnet = aThinksBInSubnet && bThinksAInSubnet && (devA.networkLong === devB.networkLong) && (devA.cidr === devB.cidr);
  const broadcastIntersectionTrap = !sameSubnet && sameBroadcast;
  const asymmetricalSubnet = aThinksBInSubnet !== bThinksAInSubnet;
  const overlappingSubnet = !sameSubnet && aThinksBInSubnet && bThinksAInSubnet;
  const isolated = !aThinksBInSubnet && !bThinksAInSubnet && !sameBroadcast;

  return {
    aThinksBInSubnet,
    bThinksAInSubnet,
    sameBroadcast,
    sameSubnet,
    broadcastIntersectionTrap,
    asymmetricalSubnet,
    overlappingSubnet,
    isolated
  };
}

// Convert 32-bit value to binary string with space separator every 8 bits
export function toBinaryString(longVal: number): string {
  const binary = (longVal >>> 0).toString(2).padStart(32, '0');
  return `${binary.slice(0, 8)}.${binary.slice(8, 16)}.${binary.slice(16, 24)}.${binary.slice(24, 32)}`;
}

// Get IP by host offset inside network range
export function getOffsetIp(networkIp: string, cidr: number, offset: number): string {
  const details = getSubnetDetails(networkIp, cidr);
  if (!details) return '';
  const targetLong = (details.networkLong + offset) >>> 0;
  if (targetLong > details.broadcastLong) return '';
  return longToIp(targetLong);
}
