/**
 * BACnet Subnet Calculator Core Logic
 * Handles 32-bit unsigned integer conversions, subnet masking,
 * and subnet calculations.
 */

// Convert IP string to 32-bit unsigned integer (using >>> 0 to ensure unsigned 32-bit)
export function ipToLong(ip) {
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
export function longToIp(long) {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

// Convert CIDR suffix (e.g. 24) to 32-bit subnet mask
export function cidrToMask(cidr) {
  if (cidr === 0) return 0;
  if (cidr === 32) return 0xFFFFFFFF >>> 0;
  return (~((1 << (32 - cidr)) - 1)) >>> 0;
}

// Convert 32-bit subnet mask to CIDR suffix
export function maskToCidr(mask) {
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
export function validateMaskString(maskStr) {
  const long = ipToLong(maskStr);
  if (long === null) return false;
  
  // A valid subnet mask must consist of contiguous 1 bits followed by contiguous 0 bits.
  // Negating the mask and adding 1 should yield a power of 2.
  const inverted = (~long) >>> 0;
  // If mask is all 1s (255.255.255.255), inverted is 0. 0 is fine.
  if (inverted === 0) return true;
  // Check if power of 2
  return ((inverted + 1) & inverted) === 0;
}

// Convert mask long or string to CIDR
export function getMaskCidr(maskInput) {
  if (typeof maskInput === 'number') {
    return maskToCidr(maskInput);
  }
  const long = ipToLong(maskInput);
  if (long === null) return null;
  return maskToCidr(long);
}

// Get network details
export function getSubnetDetails(ipStr, cidrOrMask) {
  const ip = ipToLong(ipStr);
  if (ip === null) return null;

  let mask;
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
  
  let firstUsable = null;
  let lastUsable = null;
  let numHosts = 0;

  if (cidr < 31) {
    firstUsable = (network + 1) >>> 0;
    lastUsable = (broadcast - 1) >>> 0;
    numHosts = lastUsable - firstUsable + 1;
  } else if (cidr === 31) {
    // RFC 3021
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
export function analyzeRelationship(devA, devB) {
  if (!devA || !devB) return null;

  // Does A think B is in its subnet?
  const aThinksBInSubnet = (devB.ipLong & devA.maskLong) >>> 0 === devA.networkLong;
  
  // Does B think A is in its subnet?
  const bThinksAInSubnet = (devA.ipLong & devB.maskLong) >>> 0 === devB.networkLong;

  // Do they share the exact same broadcast address?
  const sameBroadcast = devA.broadcastLong === devB.broadcastLong;

  // Are they in the exact same subnet?
  const sameSubnet = aThinksBInSubnet && bThinksAInSubnet && (devA.networkLong === devB.networkLong) && (devA.cidr === devB.cidr);

  // Is there a broadcast intersection trap?
  // (Different subnets, but they share the same broadcast address)
  const broadcastIntersectionTrap = !sameSubnet && sameBroadcast;

  // Asymmetrical subnet mask configuration
  // (One thinks they are in the same subnet, but the other does not)
  const asymmetricalSubnet = aThinksBInSubnet !== bThinksAInSubnet;

  // Symmetrical overlapping subnets (both think local, but different masks)
  const overlappingSubnet = !sameSubnet && aThinksBInSubnet && bThinksAInSubnet;

  // Completely isolated networks (different subnets, different broadcasts, neither thinks local)
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
export function toBinaryString(longVal) {
  const binary = (longVal >>> 0).toString(2).padStart(32, '0');
  return `${binary.slice(0, 8)}.${binary.slice(8, 16)}.${binary.slice(16, 24)}.${binary.slice(24, 32)}`;
}
