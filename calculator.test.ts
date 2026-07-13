import { describe, it, expect } from 'vitest';
import {
  ipToLong,
  longToIp,
  cidrToMask,
  maskToCidr,
  validateMaskString,
  getMaskCidr,
  getSubnetDetails,
  analyzeRelationship
} from './src/lib/subnet';
import { makeCell } from './src/lib/export-xlsx';

describe('IPv4 parsing (ipToLong and longToIp)', () => {
  it('should parse valid IPv4 strings correctly', () => {
    expect(ipToLong('192.168.1.1')).toBe(3232235777);
    expect(ipToLong('0.0.0.0')).toBe(0);
    expect(ipToLong('255.255.255.255')).toBe(4294967295);
    expect(ipToLong(' 10.0.0.1  ')).toBe(167772161);
  });

  it('should reject invalid IPv4 strings', () => {
    expect(ipToLong('192.168.1')).toBeNull();
    expect(ipToLong('192.168.1.1.1')).toBeNull();
    expect(ipToLong('192.168.1.256')).toBeNull();
    expect(ipToLong('192.168.1.a')).toBeNull();
    expect(ipToLong('192.168.1.')).toBeNull();
    expect(ipToLong('192.168..1')).toBeNull();
    expect(ipToLong('192.168.1. 1')).toBeNull();
    expect(ipToLong('abc')).toBeNull();
    expect(ipToLong('')).toBeNull();
    expect(ipToLong(null)).toBeNull();
  });

  it('should format long numbers back to IPv4 strings', () => {
    expect(longToIp(3232235777)).toBe('192.168.1.1');
    expect(longToIp(0)).toBe('0.0.0.0');
    expect(longToIp(4294967295)).toBe('255.255.255.255');
  });
});

describe('Subnet mask and CIDR conversions', () => {
  it('should convert CIDR to mask long', () => {
    expect(cidrToMask(24)).toBe(4294967040);
    expect(cidrToMask(30)).toBe(4294967292);
    expect(cidrToMask(0)).toBe(0);
    expect(cidrToMask(32)).toBe(4294967295);
  });

  it('should convert mask long to CIDR', () => {
    expect(maskToCidr(4294967040)).toBe(24);
    expect(maskToCidr(4294967292)).toBe(30);
    expect(maskToCidr(0)).toBe(0);
    expect(maskToCidr(4294967295)).toBe(32);
  });

  it('should validate subnet mask strings', () => {
    expect(validateMaskString('255.255.255.0')).toBe(true);
    expect(validateMaskString('255.255.252.0')).toBe(true);
    expect(validateMaskString('255.255.255.255')).toBe(true);
    expect(validateMaskString('0.0.0.0')).toBe(true);
    expect(validateMaskString('255.255.0.255')).toBe(false);
    expect(validateMaskString('invalid')).toBe(false);
  });

  it('should retrieve CIDR from mask input', () => {
    expect(getMaskCidr('255.255.255.0')).toBe(24);
    expect(getMaskCidr(4294967292)).toBe(30);
    expect(getMaskCidr('invalid')).toBeNull();
  });
});

describe('RFC 3021 and /31, /32 host limits', () => {
  it('should calculate details for standard subnet (e.g. /24)', () => {
    const details = getSubnetDetails('192.168.1.50', 24);
    expect(details.network).toBe('192.168.1.0');
    expect(details.broadcast).toBe('192.168.1.255');
    expect(details.firstUsable).toBe('192.168.1.1');
    expect(details.lastUsable).toBe('192.168.1.254');
    expect(details.numHosts).toBe(254);
  });

  it('should calculate details for /31 subnet (point-to-point)', () => {
    const details = getSubnetDetails('192.168.1.50', 31);
    expect(details.network).toBe('192.168.1.50');
    expect(details.broadcast).toBe('192.168.1.51');
    expect(details.firstUsable).toBe('192.168.1.50');
    expect(details.lastUsable).toBe('192.168.1.51');
    expect(details.numHosts).toBe(2);
  });

  it('should calculate details for /32 host route', () => {
    const details = getSubnetDetails('192.168.1.50', 32);
    expect(details.network).toBe('192.168.1.50');
    expect(details.broadcast).toBe('192.168.1.50');
    expect(details.firstUsable).toBe('192.168.1.50');
    expect(details.lastUsable).toBe('192.168.1.50');
    expect(details.numHosts).toBe(1);
  });
});

describe('0.0.0.0 edge cases display', () => {
  it('should handle firstUsable and lastUsable starting at 0.0.0.0', () => {
    const details = getSubnetDetails('0.0.0.0', 31);
    expect(details.network).toBe('0.0.0.0');
    expect(details.firstUsable).toBe('0.0.0.0');
    expect(details.lastUsable).toBe('0.0.0.1');
    expect(details.numHosts).toBe(2);
  });

  it('should handle /32 0.0.0.0 host route', () => {
    const details = getSubnetDetails('0.0.0.0', 32);
    expect(details.network).toBe('0.0.0.0');
    expect(details.firstUsable).toBe('0.0.0.0');
    expect(details.lastUsable).toBe('0.0.0.0');
    expect(details.numHosts).toBe(1);
  });
});

describe('Subnet relationship classification (analyzeRelationship)', () => {
  it('should identify same subnet relation', () => {
    const devA = getSubnetDetails('192.168.1.50', 24);
    const devB = getSubnetDetails('192.168.1.60', 24);
    const rel = analyzeRelationship(devA, devB);
    expect(rel.sameSubnet).toBe(true);
    expect(rel.isolated).toBe(false);
  });

  it('should identify broadcast intersection trap relation', () => {
    const devA = getSubnetDetails('192.168.0.50', 23);
    const devB = getSubnetDetails('192.168.1.60', 24);
    const rel = analyzeRelationship(devA, devB);
    expect(rel.broadcastIntersectionTrap).toBe(true);
    expect(rel.sameSubnet).toBe(false);
  });

  it('should identify asymmetrical subnet relation', () => {
    const devA_asym = getSubnetDetails('192.168.0.50', 23);
    const devB_asym = getSubnetDetails('192.168.1.60', 24);
    const rel = analyzeRelationship(devA_asym, devB_asym);
    expect(rel.asymmetricalSubnet).toBe(true);
    expect(rel.sameSubnet).toBe(false);
  });

  it('should identify completely isolated relation', () => {
    const devA = getSubnetDetails('192.168.1.50', 24);
    const devB = getSubnetDetails('10.0.0.60', 24);
    const rel = analyzeRelationship(devA, devB);
    expect(rel.isolated).toBe(true);
    expect(rel.sameSubnet).toBe(false);
  });
});

describe('Spreadsheet CSV/Formula Injection Sanitization (makeCell)', () => {
  it('should prepend a single quote to values starting with formula characters', () => {
    expect(makeCell('=SUM(A1:A5)', 'dataCell').v).toBe("'=SUM(A1:A5)");
    expect(makeCell('+100', 'dataCell').v).toBe("'+100");
    expect(makeCell('-50', 'dataCell').v).toBe("'-50");
    expect(makeCell('@REF', 'dataCell').v).toBe("'@REF");
  });

  it('should not escape normal strings or values', () => {
    expect(makeCell('Subnet 1', 'dataCell').v).toBe("Subnet 1");
    expect(makeCell(123, 'dataCell').v).toBe(123);
    expect(makeCell(true, 'dataCell').v).toBe(true);
    expect(makeCell('', 'dataCell').v).toBe("");
    expect(makeCell(null, 'dataCell').v).toBe("");
  });
});
