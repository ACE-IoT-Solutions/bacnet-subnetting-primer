import { describe, expect, it } from 'vitest';
import { bbmdRelationshipClass, createBbmdReport } from './bbmd-report';
import { createDefaultProject, createDevice, createSubnet } from './network-diagram';

describe('BBMD report model', () => {
  it('builds de-duplicated mutual and directional peering summaries', () => {
    const project = createDefaultProject();
    const firstSubnet = project.subnets[0];
    const secondSubnet = createSubnet(2);
    const thirdSubnet = createSubnet(3);
    const first = firstSubnet.devices[0];
    const second = createDevice(1, secondSubnet.id);
    const third = createDevice(1, thirdSubnet.id);
    first.name = 'BBMD Alpha'; first.bbmdEnabled = true;
    second.name = 'BBMD Bravo'; second.bbmdEnabled = true;
    third.name = 'BBMD Charlie'; third.bbmdEnabled = true;
    first.nics[0].addresses[0].ip = '192.0.2.10';
    second.nics[0].addresses[0].ip = '198.51.100.10';
    third.nics[0].addresses[0].ip = '203.0.113.10';
    first.bdtPeerDeviceIds = [second.id, third.id];
    second.bdtPeerDeviceIds = [first.id];
    secondSubnet.devices.push(second);
    thirdSubnet.devices.push(third);
    project.subnets.push(secondSubnet, thirdSubnet);

    const report = createBbmdReport(project);
    expect(report.devices).toHaveLength(3);
    expect(report.peerings).toHaveLength(2);
    expect(report.mutualCount).toBe(1);
    expect(report.oneWayCount).toBe(1);
    expect(report.devices[0].entries.map(entry => entry.status)).toEqual(['Mutual', 'One-way outgoing']);
    expect(bbmdRelationshipClass(report, first.id, second.id)).toBe('mutual');
    expect(bbmdRelationshipClass(report, first.id, third.id)).toBe('outbound');
    expect(bbmdRelationshipClass(report, third.id, first.id)).toBe('inbound');
  });

  it('retains missing peer references in the device BDT table', () => {
    const project = createDefaultProject();
    const device = project.subnets[0].devices[0];
    device.bbmdEnabled = true;
    device.bdtPeerDeviceIds = ['missing-peer'];
    expect(createBbmdReport(project).devices[0].entries[0]).toMatchObject({ status: 'Missing peer', peerEndpoint: 'Unavailable' });
  });
});
