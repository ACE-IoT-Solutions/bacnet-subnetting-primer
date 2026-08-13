import { describe, expect, it } from 'vitest';
import { createDiagramProjectFromAceBbmdState, parseAceBbmdState } from './ace-bbmd-state';
import { getDiagramDiagnostics } from './network-diagram';

const syntheticState = {
  bbmds: {
    '192.0.2.10:47808': {
      address: '192.0.2.10:47808',
      last_read: '2026-01-01T00:00:00Z',
      bdt: [
        { address: '198.51.100.20:47808', mask: '255.255.255.255' },
        { address: '203.0.113.30:47808', mask: '255.255.255.255' }
      ]
    },
    '198.51.100.20:47808': {
      address: '198.51.100.20:47808',
      last_read: '2026-01-01T00:00:01Z',
      bdt: [{ address: '192.0.2.10:47808', mask: '255.255.255.255' }]
    },
    '203.0.113.30:47808': {
      address: '203.0.113.30:47808',
      last_read: '2026-01-01T00:00:02Z',
      bdt: [{ address: '198.51.100.99:47808', mask: '255.255.255.255' }]
    }
  }
};

describe('ACE BBMD Manager state import', () => {
  it('parses records without depending on site-specific names or addresses', () => {
    const parsed = parseAceBbmdState(syntheticState);
    expect(parsed.records).toHaveLength(3);
    expect(parsed.reciprocalBdtPairs).toBe(1);
    expect(parsed.oneWayBdtEntries).toBe(1);
    expect(parsed.unresolvedBdtEntries).toBe(1);
  });

  it('creates device-level BBMDs on inferred /24 networks and preserves BDT directionality', () => {
    const diagram = createDiagramProjectFromAceBbmdState(parseAceBbmdState(syntheticState));
    expect(diagram.subnets.map(subnet => `${subnet.address}/${subnet.cidr}`)).toEqual([
      '192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24'
    ]);
    const devices = diagram.subnets.flatMap(subnet => subnet.devices);
    expect(devices).toHaveLength(3);
    expect(devices.every(device => device.bbmdEnabled)).toBe(true);
    expect(devices[0].bdtPeerDeviceIds).toEqual([devices[1].id, devices[2].id]);
    expect(devices[1].bdtPeerDeviceIds).toEqual([devices[0].id]);
    expect(getDiagramDiagnostics(diagram).some(item => item.message.includes('mutual BDT'))).toBe(true);
  });

  it('rejects unrelated JSON', () => {
    expect(() => parseAceBbmdState({ devices: [] })).toThrow('BBMD record map');
  });
});
