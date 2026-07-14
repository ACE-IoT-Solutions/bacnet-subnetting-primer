import { describe, it, expect } from 'vitest';
import { calculateAutoSizeCidr, findNextAvailableSubnetBlock, classifyOverlap, PlannerSubnet } from './planner';

describe('Subnet Auto-sizing (calculateAutoSizeCidr)', () => {
  it('should auto-size to /27 for small device counts', () => {
    expect(calculateAutoSizeCidr(0)).toBe(27);
    expect(calculateAutoSizeCidr(5)).toBe(27);
    expect(calculateAutoSizeCidr(15)).toBe(27);
  });

  it('should auto-size up to larger subnets for high device counts', () => {
    expect(calculateAutoSizeCidr(30)).toBe(26);
    expect(calculateAutoSizeCidr(100)).toBe(25);
    expect(calculateAutoSizeCidr(200)).toBe(24);
  });
});

describe('Non-overlapping Subnet Finder (findNextAvailableSubnetBlock)', () => {
  it('should find next block when there are overlaps', () => {
    const subnets: PlannerSubnet[] = [
      {
        id: '1',
        name: 'Subnet 1',
        ip: '192.168.1.0',
        cidr: 24,
        gatewayOffset: 1,
        vlan: 10,
        port: 47808,
        bbmdEnabled: false,
        bbmdOffset: 2,
        bmsPlaced: false,
        bmsRole: 'none',
        fdrTargetSubnetId: ''
      },
      {
        id: '2',
        name: 'Subnet 2',
        ip: '192.168.1.128',
        cidr: 25,
        gatewayOffset: 1,
        vlan: 20,
        port: 47808,
        bbmdEnabled: false,
        bbmdOffset: 2,
        bmsPlaced: false,
        bmsRole: 'none',
        fdrTargetSubnetId: ''
      }
    ];

    const nextBlock = findNextAvailableSubnetBlock(subnets[1], 24, subnets);
    expect(nextBlock).toBe('192.168.2.0');
  });
});

describe('Subnet Overlap Classification (classifyOverlap)', () => {
  const baseSubnetA: PlannerSubnet = {
    id: 'a',
    name: 'Subnet A',
    ip: '192.168.1.0',
    cidr: 24,
    gatewayOffset: 1,
    vlan: 10,
    port: 47808,
    bbmdEnabled: false,
    bbmdOffset: 2,
    bmsPlaced: false,
    bmsRole: 'none',
    fdrTargetSubnetId: ''
  };

  it('should return null if there is no IP range overlap', () => {
    const subB = { ...baseSubnetA, id: 'b', name: 'Subnet B', ip: '192.168.2.0' };
    expect(classifyOverlap(baseSubnetA, subB)).toBeNull();
  });

  it('should return error if IP ranges overlap on the same VLAN and same BACnet port', () => {
    const subB = { ...baseSubnetA, id: 'b', name: 'Subnet B', ip: '192.168.1.128', cidr: 25 };
    const result = classifyOverlap(baseSubnetA, subB);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('error');
    expect(result?.text).toContain('overlap in IP range on the same VLAN');
    expect(result?.text).toContain('same BACnet port');
  });

  it('should return warning (note) if IP ranges overlap on the same VLAN but different BACnet ports', () => {
    const subB = { ...baseSubnetA, id: 'b', name: 'Subnet B', ip: '192.168.1.128', cidr: 25, port: 47809 };
    const result = classifyOverlap(baseSubnetA, subB);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('warning');
    expect(result?.text).toContain('share VLAN');
    expect(result?.text).toContain('different UDP ports');
  });

  it('should return warning if IP ranges overlap on different VLANs', () => {
    const subB = { ...baseSubnetA, id: 'b', name: 'Subnet B', ip: '192.168.1.128', cidr: 25, vlan: 20 };
    const result = classifyOverlap(baseSubnetA, subB);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('warning');
    expect(result?.text).toContain('reside on separate VLANs');
  });

  it('does not apply IPv4 overlap checks to MS/TP or ARCNET networks', () => {
    const serial = { ...baseSubnetA, id: 'serial', networkType: 'mstp' as const, bacnetNetworkNumber: 2001 };
    expect(classifyOverlap(baseSubnetA, serial)).toBeNull();
  });
});
