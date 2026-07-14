import { describe, expect, it } from 'vitest';
import {
  createDefaultProject, createDevice, createDeviceAddress, createDiagramProjectFromPlan, createNic, createSubnet, createTestPath, deviceAddressState,
  getDiagramDiagnostics, getWhoIsSuggestedBroadcast, isDiagramProject, normalizeDiagramProject, type DiagramDevice, type DiagramProject
} from './network-diagram';

describe('network diagram validation', () => {
  it('recognizes whether a device belongs to its subnet', () => {
    const project = createDefaultProject();
    const subnet = project.subnets[0];
    expect(deviceAddressState(subnet.devices[0], subnet)).toBe('valid');
    subnet.devices[0].nics[0].addresses[0].ip = '192.168.2.20';
    expect(deviceAddressState(subnet.devices[0], subnet)).toBe('outside');
  });

  it('reports duplicate addresses across diagram elements', () => {
    const project = createDefaultProject();
    project.subnets[0].devices[1].nics[0].addresses[0].ip = project.subnets[0].devices[0].nics[0].addresses[0].ip;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('Duplicate IP'))).toBe(true);
  });

  it('validates multiple addresses on one NIC against their selected subnets', () => {
    const project = createDefaultProject();
    const secondSubnet = createSubnet(2);
    project.subnets.push(secondSubnet);
    const secondaryAddress = createDeviceAddress(secondSubnet.id, 'Alias');
    secondaryAddress.ip = '192.168.9.10';
    project.subnets[0].devices[0].nics[0].addresses.push(secondaryAddress);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('outside 192.168.1.0/24'))).toBe(true);
  });

  it('supports multiple NICs with independent addresses', () => {
    const project = createDefaultProject();
    const secondSubnet = createSubnet(2);
    project.subnets.push(secondSubnet);
    const secondNic = createNic(secondSubnet.id, 2);
    secondNic.addresses[0].ip = '192.168.1.20';
    project.subnets[0].devices[0].nics.push(secondNic);
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('accepts and normalizes projects saved before interfaces and paths were added', () => {
    const legacy = createDefaultProject() as DiagramProject;
    delete (legacy as Partial<DiagramProject>).paths;
    const legacyDevice = legacy.subnets[0].devices[0] as Partial<DiagramDevice>;
    legacyDevice.ip = legacyDevice.nics?.[0].addresses[0].ip;
    legacyDevice.additionalInterfaces = [];
    delete legacyDevice.nics;
    expect(isDiagramProject(legacy)).toBe(true);
    const normalized = normalizeDiagramProject(legacy);
    expect(normalized.paths).toEqual([]);
    expect(normalized.subnets[0].devices[0].nics[0].addresses[0].ip).toBe('192.168.0.20');
    expect(normalized.subnets[0].devices[0].additionalInterfaces).toBeUndefined();
  });

  it('reports test paths whose endpoints have been removed', () => {
    const project = createDefaultProject();
    project.paths.push(createTestPath([project.subnets[0].devices[0].id, 'missing-endpoint']));
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('no longer exists'))).toBe(true);
  });

  it('uses individual device addresses as connectivity-test endpoints', () => {
    const project = createDefaultProject();
    const source = project.subnets[0].devices[0].nics[0].addresses[0];
    const destination = project.subnets[0].devices[1].nics[0].addresses[0];
    project.paths.push(createTestPath([source.id, destination.id]));
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('migrates legacy host endpoints to their primary addresses', () => {
    const project = createDefaultProject();
    const sourceHost = project.subnets[0].devices[0];
    const destinationHost = project.subnets[0].devices[1];
    project.paths.push(createTestPath([sourceHost.id, destinationHost.id]));
    normalizeDiagramProject(project);
    expect(project.paths[0].hops).toEqual([
      sourceHost.nics[0].addresses[0].id,
      destinationHost.nics[0].addresses[0].id
    ]);
  });

  it('suggests and validates the source subnet broadcast for BACnet Who-Is', () => {
    const project = createDefaultProject();
    const source = project.subnets[0].devices[0].nics[0].addresses[0];
    const destination = project.subnets[0].devices[1].nics[0].addresses[0];
    const path = createTestPath([source.id, destination.id]);
    path.testType = 'bacnet-whois';
    path.protocol = 'BACnet/IP Who-Is';
    path.broadcastAddress = getWhoIsSuggestedBroadcast(project, path);
    project.paths.push(path);
    expect(path.broadcastAddress).toBe('192.168.0.255');
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('warns when a Who-Is uses a different directed broadcast', () => {
    const project = createDefaultProject();
    const source = project.subnets[0].devices[0].nics[0].addresses[0];
    const destination = project.subnets[0].devices[1].nics[0].addresses[0];
    const path = createTestPath([source.id, destination.id]);
    path.testType = 'bacnet-whois';
    path.broadcastAddress = '192.168.9.255';
    project.paths.push(path);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('source subnet broadcast'))).toBe(true);
  });

  it('validates MS/TP MAC and ARCNET node addresses', () => {
    const project = createDefaultProject();
    const mstp = project.subnets[0];
    mstp.networkType = 'mstp';
    mstp.bacnetNetworkNumber = '2001';
    mstp.mstpMaxMaster = 63;
    mstp.devices[0].nics[0].addresses[0].ip = '63';
    mstp.devices[1].nics[0].addresses[0].ip = '64';
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('invalid MS/TP MAC'))).toBe(true);

    mstp.networkType = 'arcnet';
    mstp.devices[0].nics[0].addresses[0].ip = '255';
    mstp.devices[1].nics[0].addresses[0].ip = '256';
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('invalid ARCNET node'))).toBe(true);
  });

  it('requires field buses to be reached through an IP-side router', () => {
    const project = createDefaultProject();
    const fieldBus = createSubnet(2);
    fieldBus.networkType = 'mstp';
    fieldBus.bacnetNetworkNumber = '2001';
    project.subnets.push(fieldBus);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('upstream BACnet/IP'))).toBe(true);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('BACnet device on the upstream'))).toBe(true);

    const router = project.subnets[0].devices[0];
    fieldBus.upstreamSubnetId = project.subnets[0].id;
    fieldBus.routerId = router.id;
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('supports a same-datalink MS/TP router while rejecting cross-type device addresses', () => {
    const project = createDefaultProject();
    const ipRouter = project.subnets[0].devices[0];
    const upstream = createSubnet(2);
    upstream.networkType = 'mstp'; upstream.bacnetNetworkNumber = '2001'; upstream.upstreamSubnetId = project.subnets[0].id; upstream.routerId = ipRouter.id;
    const mstpRouter = createDevice(1, upstream.id);
    mstpRouter.name = 'MS/TP Router'; mstpRouter.nics[0].addresses[0].ip = '10'; upstream.devices.push(mstpRouter);
    const downstream = createSubnet(3);
    downstream.networkType = 'mstp'; downstream.bacnetNetworkNumber = '2002'; downstream.upstreamSubnetId = upstream.id; downstream.routerId = mstpRouter.id;
    project.subnets.push(upstream, downstream);
    expect(getDiagramDiagnostics(project)).toEqual([]);

    mstpRouter.nics[0].addresses[0].subnetId = project.subnets[0].id;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('different datalink type'))).toBe(true);
  });

  it('turns a planner field bus into a network-only routed diagram', () => {
    const base = { gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none' as const, fdrTargetSubnetId: '' };
    const diagram = createDiagramProjectFromPlan([
      { ...base, id: 'ip', name: 'IP LAN', ip: '192.168.10.0', cidr: 24, networkType: 'bacnet-ip' },
      { ...base, id: 'mstp', name: 'VAV Trunk', ip: '', cidr: 24, networkType: 'mstp', bacnetNetworkNumber: 2001, upstreamIpSubnetId: 'ip', routerName: 'VAV Router', routerIp: '192.168.10.20' }
    ]);
    expect(diagram.viewMode).toBe('networks');
    expect(diagram.subnets[1].upstreamSubnetId).toBe(diagram.subnets[0].id);
    expect(diagram.subnets[0].devices[0].requiredForRouting).toBe(true);
    expect(diagram.subnets[1].routerId).toBe(diagram.subnets[0].devices[0].id);
    expect(getDiagramDiagnostics(diagram)).toEqual([]);
  });
});
