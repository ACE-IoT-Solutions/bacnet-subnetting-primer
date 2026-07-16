import { getSubnetDetails, ipToLong } from './subnet';
import type { PlannerSubnet } from './planner';

export type DeviceKind = 'controller' | 'workstation' | 'server' | 'sensor' | 'other';
export type InfrastructureKind = 'router' | 'switch' | 'firewall' | 'bbmd' | 'gateway' | 'sc-hub' | 'sc-hub-cluster';
export type PathOutcome = 'success' | 'failure';
export type DiagramTestType = 'ping' | 'bacnet-whois' | 'custom';
export type DiagramNetworkType = 'bacnet-ip' | 'bacnet-sc' | 'mstp' | 'arcnet';

export interface DiagramDeviceAddress {
  id: string;
  subnetId: string;
  ip: string;
  label: string;
}

export interface DiagramNic {
  id: string;
  name: string;
  addresses: DiagramDeviceAddress[];
  bacnetIpEnabled?: boolean;
  bacnetScEnabled?: boolean;
  scHubRole?: 'node' | 'hub' | 'ha-hub';
  scHubUri?: string;
  scFailoverHubUri?: string;
  scHubId?: string;
  scHubL3Reachable?: boolean;
}

export interface DiagramDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  notes: string;
  nics: DiagramNic[];
  /** Legacy fields retained only while importing version 1 projects. */
  ip?: string;
  additionalInterfaces?: DiagramDeviceAddress[];
  requiredForRouting?: boolean;
  bacnetIpEnabled?: boolean;
  bacnetScEnabled?: boolean;
  scHubRole?: 'node' | 'hub' | 'ha-hub';
  scHubUri?: string;
  scFailoverHubUri?: string;
  scHubId?: string;
  scHubL3Reachable?: boolean;
}

export interface DiagramSubnet {
  id: string;
  name: string;
  address: string;
  cidr: number;
  vlan: string;
  color: string;
  devices: DiagramDevice[];
  networkType?: DiagramNetworkType;
  udpPort?: number | '';
  bacnetNetworkNumber?: string;
  mstpBaudRate?: number;
  mstpMaxMaster?: number;
  arcnetDataRate?: number;
  upstreamSubnetId?: string;
  routerId?: string;
  scDirectConnections?: boolean;
}

export interface DiagramInfrastructure {
  id: string;
  name: string;
  kind: InfrastructureKind;
  ip: string;
  subnetIds: string[];
  notes: string;
  uri?: string;
  failoverIp?: string;
  failoverUri?: string;
  peerInfrastructureIds?: string[];
  underlaySubnetIds?: string[];
}

export interface DiagramTestPath {
  id: string;
  name: string;
  testType: DiagramTestType;
  protocol: string;
  broadcastAddress: string;
  udpPort?: number;
  outcome: PathOutcome;
  hops: string[];
  notes: string;
}

export interface DiagramProject {
  version: 1;
  title: string;
  notes: string;
  subnets: DiagramSubnet[];
  infrastructure: DiagramInfrastructure[];
  paths: DiagramTestPath[];
  viewMode?: 'detailed' | 'networks';
}

export interface DiagramDiagnostic {
  level: 'error' | 'warning';
  message: string;
}

export const SUBNET_COLORS = ['#c1d200', '#94d8ff', '#a78bfa', '#fb923c', '#2dd4bf', '#f472b6'];

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDeviceAddress(subnetId = '', label = 'Primary'): DiagramDeviceAddress {
  return { id: createId('address'), subnetId, ip: '', label };
}

export function createNic(subnetId = '', index = 1): DiagramNic {
  return { id: createId('nic'), name: `NIC ${index}`, addresses: [createDeviceAddress(subnetId)], bacnetIpEnabled: true, bacnetScEnabled: false, scHubRole: 'node', scHubUri: '', scFailoverHubUri: '', scHubId: '', scHubL3Reachable: false };
}

export function createDevice(index = 1, subnetId = ''): DiagramDevice {
  return { id: createId('device'), name: `Device ${index}`, kind: 'controller', notes: '', nics: [createNic(subnetId)] };
}

export function createSubnet(index = 1): DiagramSubnet {
  const thirdOctet = Math.min(254, index - 1);
  return {
    id: createId('subnet'),
    name: `Subnet ${index}`,
    address: `192.168.${thirdOctet}.0`,
    cidr: 24,
    vlan: '',
    color: SUBNET_COLORS[(index - 1) % SUBNET_COLORS.length],
    devices: [],
    networkType: 'bacnet-ip',
    udpPort: 47808,
    bacnetNetworkNumber: '',
    mstpBaudRate: 38400,
    mstpMaxMaster: 127,
    arcnetDataRate: 2500,
    upstreamSubnetId: '',
    routerId: ''
  };
}

export function createInfrastructure(index = 1): DiagramInfrastructure {
  return { id: createId('infra'), name: `Router ${index}`, kind: 'router', ip: '', subnetIds: [], notes: '', uri: '', failoverIp: '', failoverUri: '', peerInfrastructureIds: [], underlaySubnetIds: [] };
}

export function createTestPath(endpointIds: string[] = []): DiagramTestPath {
  return {
    id: createId('path'),
    name: 'Ping test',
    testType: 'ping',
    protocol: 'ICMP',
    broadcastAddress: '',
    udpPort: 47808,
    outcome: 'success',
    hops: endpointIds.slice(0, 2),
    notes: ''
  };
}

export function createDefaultProject(): DiagramProject {
  const first = createSubnet(1);
  first.name = 'Controls LAN';
  first.vlan = '10';
  first.devices = [
    { ...createDevice(1, first.id), name: 'BACnet Controller' },
    { ...createDevice(2, first.id), name: 'Operator Workstation', kind: 'workstation' }
  ];
  first.devices[0].nics[0].addresses[0].ip = '192.168.0.20';
  first.devices[1].nics[0].addresses[0].ip = '192.168.0.50';
  return {
    version: 1,
    title: 'BACnet Network Condition',
    notes: '',
    subnets: [first],
    infrastructure: [],
    paths: [],
    viewMode: 'detailed'
  };
}

export function createDiagramProjectFromPlan(plan: PlannerSubnet[]): DiagramProject {
  const idMap = new Map(plan.map(subnet => [subnet.id, `plan-${subnet.id}`]));
  const subnets = plan.map((source, index) => {
    const subnet = createSubnet(index + 1);
    subnet.id = idMap.get(source.id)!;
    subnet.name = source.name;
    subnet.networkType = source.networkType || 'bacnet-ip';
    subnet.address = source.ip;
    subnet.cidr = source.cidr;
    subnet.vlan = source.vlan === '' ? '' : String(source.vlan);
    subnet.udpPort = source.port || 47808;
    subnet.bacnetNetworkNumber = source.bacnetNetworkNumber === '' ? '' : String(source.bacnetNetworkNumber ?? '');
    subnet.mstpBaudRate = source.mstpBaudRate ?? 38400;
    subnet.mstpMaxMaster = source.mstpMaxMaster ?? 127;
    subnet.arcnetDataRate = source.arcnetDataRate ?? 2500;
    subnet.upstreamSubnetId = source.upstreamIpSubnetId ? idMap.get(source.upstreamIpSubnetId) || '' : '';
    subnet.devices = [];
    return subnet;
  });
  const routerByKey = new Map<string, DiagramDevice>();
  for (const source of plan.filter(item => item.networkType === 'mstp' || item.networkType === 'arcnet')) {
    const segment = subnets.find(item => item.id === idMap.get(source.id));
    const upstream = subnets.find(item => item.id === segment?.upstreamSubnetId);
    if (!segment || !upstream || !source.routerName?.trim()) continue;
    const key = `${upstream.id}|${source.routerName}|${source.routerIp || ''}`;
    let router = routerByKey.get(key);
    if (!router) {
      router = createDevice(upstream.devices.length + 1, upstream.id);
      router.name = source.routerName;
      router.kind = 'controller';
      router.notes = 'Required BACnet routing device imported from Network Planner';
      router.requiredForRouting = true;
      router.nics[0].addresses[0].ip = source.routerIp || '';
      upstream.devices.push(router);
      routerByKey.set(key, router);
    }
    segment.routerId = router.id;
  }
  const infrastructure = plan.filter(item => (!item.networkType || item.networkType === 'bacnet-ip') && item.scEnabled && item.scPrimaryHubName?.trim()).map(source => {
    const hub = createInfrastructure(subnets.length + 1);
    hub.name = source.scFailoverEnabled ? `${source.scPrimaryHubName} HA Cluster` : source.scPrimaryHubName!;
    hub.kind = source.scFailoverEnabled ? 'sc-hub-cluster' : 'sc-hub';
    hub.ip = source.scPrimaryHubIp || '';
    hub.uri = source.scPrimaryHubUri || '';
    hub.failoverIp = source.scFailoverHubIp || '';
    hub.failoverUri = source.scFailoverHubUri || '';
    hub.subnetIds = [idMap.get(source.id)!];
    hub.underlaySubnetIds = [...hub.subnetIds];
    hub.notes = source.scFailoverEnabled ? `Primary: ${source.scPrimaryHubName}; failover: ${source.scFailoverHubName || 'unnamed'}` : 'BACnet/SC primary hub';
    return hub;
  });
  return { version: 1, title: 'Planned BACnet Network Topology', notes: 'Imported from Network Planner', subnets, infrastructure, paths: [], viewMode: 'networks' };
}

export function subnetCidr(subnet: DiagramSubnet): string {
  if (subnet.networkType === 'bacnet-sc') return `BACnet/SC · Network ${subnet.bacnetNetworkNumber || 'not set'}`;
  if (subnet.networkType === 'mstp') return `MS/TP · Network ${subnet.bacnetNetworkNumber || 'not set'} · ${subnet.mstpBaudRate || 38400} baud`;
  if (subnet.networkType === 'arcnet') return `ARCNET · Network ${subnet.bacnetNetworkNumber || 'not set'} · ${subnet.arcnetDataRate || 2500} kbps`;
  const details = getSubnetDetails(subnet.address, subnet.cidr);
  return details ? `${details.network}/${subnet.cidr}` : `${subnet.address}/${subnet.cidr}`;
}

export function deviceAddressState(device: DiagramDevice, subnet: DiagramSubnet): 'empty' | 'invalid' | 'outside' | 'valid' {
  const address = device.nics.flatMap(nic => nic.addresses).find(item => item.subnetId === subnet.id)
    ?? device.nics[0]?.addresses[0];
  return addressState(address, subnet);
}

export function addressState(item: DiagramDeviceAddress | undefined, subnet: DiagramSubnet | undefined): 'empty' | 'invalid' | 'outside' | 'valid' {
  if (!item?.ip.trim()) return 'empty';
  if (!subnet) return 'invalid';
  if (subnet.networkType === 'mstp') {
    const mac = Number(item.ip);
    return Number.isInteger(mac) && mac >= 0 && mac <= Math.min(127, subnet.mstpMaxMaster ?? 127) ? 'valid' : 'invalid';
  }
  if (subnet.networkType === 'arcnet') {
    const node = Number(item.ip);
    return Number.isInteger(node) && node >= 0 && node <= 255 ? 'valid' : 'invalid';
  }
  if (subnet.networkType === 'bacnet-sc') return ipToLong(item.ip) === null ? 'invalid' : 'valid';
  const ip = ipToLong(item.ip);
  const details = getSubnetDetails(subnet.address, subnet.cidr);
  if (ip === null || !details) return 'invalid';
  return ip >= details.networkLong && ip <= details.broadcastLong ? 'valid' : 'outside';
}

export function getDiagramDiagnostics(project: DiagramProject): DiagramDiagnostic[] {
  const diagnostics: DiagramDiagnostic[] = [];
  const usedIps = new Map<string, string[]>();

  for (const subnet of project.subnets) {
    if ((!subnet.networkType || subnet.networkType === 'bacnet-ip') && !getSubnetDetails(subnet.address, subnet.cidr)) {
      diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed subnet'} has an invalid network address.` });
    }
    const bipNics = project.subnets.flatMap(owner => owner.devices.flatMap(device => device.nics)).filter(nic => nic.bacnetIpEnabled && nic.addresses.some(address => address.subnetId === subnet.id));
    if ((!subnet.networkType || subnet.networkType === 'bacnet-ip') && bipNics.length && (!Number.isInteger(subnet.udpPort) || Number(subnet.udpPort) < 1 || Number(subnet.udpPort) > 65535)) {
      diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed subnet'} has BACnet/IP devices but no valid UDP port.` });
    }
    if ((subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' || subnet.networkType === 'bacnet-sc')
      && (!Number.isInteger(Number(subnet.bacnetNetworkNumber)) || Number(subnet.bacnetNetworkNumber) < 1 || Number(subnet.bacnetNetworkNumber) > 65534)) {
      diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed network'} needs a BACnet network number from 1–65534.` });
    }
    if (subnet.networkType === 'mstp' || subnet.networkType === 'arcnet') {
      const upstream = project.subnets.find(item => item.id === subnet.upstreamSubnetId && item.id !== subnet.id
        && ((!item.networkType || item.networkType === 'bacnet-ip') || item.networkType === subnet.networkType));
      const router = project.subnets.flatMap(item => item.devices).find(device => device.id === subnet.routerId);
      const routerAddress = router?.nics.flatMap(nic => nic.addresses).find(address => address.subnetId === upstream?.id);
      if (!upstream) diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed field bus'} must select an upstream BACnet/IP or ${subnet.networkType === 'mstp' ? 'MS/TP' : 'ARCNET'} network.` });
      if (!router) diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed field bus'} must be routed by a BACnet device on the upstream network.` });
      else if (!routerAddress || addressState(routerAddress, upstream) !== 'valid') diagnostics.push({ level: 'error', message: `${router.name || 'Field-bus router'} needs a valid address on the selected upstream network.` });
    }
    for (const device of subnet.devices) {
      for (const nic of device.nics) {
        if (!nic.bacnetIpEnabled && !nic.bacnetScEnabled) diagnostics.push({ level: 'warning', message: `${device.name || 'Unnamed device'} ${nic.name || 'NIC'} has neither BACnet/IP nor BACnet/SC enabled.` });
        for (const address of nic.addresses) {
          const addressSubnet = project.subnets.find(candidate => candidate.id === address.subnetId);
          const ownerType = subnet.networkType || 'bacnet-ip';
          const addressType = addressSubnet?.networkType || 'bacnet-ip';
          const state = addressState(address, addressSubnet);
          const addressName = `${device.name || 'Unnamed device'} ${nic.name || 'NIC'} ${address.label || 'address'}`;
          if (!addressSubnet) diagnostics.push({ level: 'error', message: `${addressName} is not assigned to an available subnet.` });
          else if (ownerType !== addressType && ownerType !== 'bacnet-sc' && addressType !== 'bacnet-sc') diagnostics.push({ level: 'error', message: `${addressName} cannot use ${subnetCidr(addressSubnet)} because the device belongs to a different datalink type.` });
          else if (state === 'invalid') diagnostics.push({ level: 'error', message: `${addressName} has an invalid ${addressSubnet.networkType === 'mstp' ? 'MS/TP MAC' : addressSubnet.networkType === 'arcnet' ? 'ARCNET node' : addressSubnet.networkType === 'bacnet-sc' ? 'BACnet/SC node IP' : 'IP'} address.` });
          else if (state === 'outside') diagnostics.push({ level: 'warning', message: `${addressName} (${address.ip}) is outside ${subnetCidr(addressSubnet)}.` });
          else if (state === 'valid') {
            const key = addressSubnet.networkType === 'mstp' || addressSubnet.networkType === 'arcnet' || addressSubnet.networkType === 'bacnet-sc' ? `${addressSubnet.id}:${address.ip.trim()}` : address.ip.trim();
            usedIps.set(key, [...(usedIps.get(key) ?? []), addressName]);
          }
        }
      }
    }
  }

  const bipNetworks = project.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip');
  for (let firstIndex = 0; firstIndex < bipNetworks.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < bipNetworks.length; secondIndex++) {
      const first = bipNetworks[firstIndex];
      const second = bipNetworks[secondIndex];
      const firstDetails = getSubnetDetails(first.address, first.cidr);
      const secondDetails = getSubnetDetails(second.address, second.cidr);
      if (!firstDetails || !secondDetails || first.vlan !== second.vlan) continue;
      const overlap = firstDetails.networkLong <= secondDetails.broadcastLong && secondDetails.networkLong <= firstDetails.broadcastLong;
      if (overlap && first.udpPort !== '' && second.udpPort !== '' && (first.udpPort ?? 47808) === (second.udpPort ?? 47808)) {
        diagnostics.push({ level: 'error', message: `${first.name} and ${second.name} share an IP/VLAN range and UDP ${first.udpPort ?? 47808}; distinct BACnet/IP networks on one IP subnet require distinct UDP ports.` });
      } else if (overlap && first.udpPort !== '' && second.udpPort !== '' && first.udpPort !== second.udpPort) {
        const firstNetwork = Number(first.bacnetNetworkNumber);
        const secondNetwork = Number(second.bacnetNetworkNumber);
        if (!Number.isInteger(firstNetwork) || firstNetwork < 1 || firstNetwork > 65534 || !Number.isInteger(secondNetwork) || secondNetwork < 1 || secondNetwork > 65534 || firstNetwork === secondNetwork) {
          diagnostics.push({ level: 'error', message: `${first.name} and ${second.name} use different UDP ports on one IP/VLAN range; assign each B/IP datalink a distinct BACnet network number from 1–65534.` });
        }
      }
    }
  }

  for (const item of project.infrastructure) {
    if (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') {
      if (!item.uri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub'} needs a primary wss:// hub URI.` });
      if (!item.ip.trim() || ipToLong(item.ip) === null) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub'} needs a valid primary hub IP for L3 reachability checks.` });
      if (item.kind === 'sc-hub-cluster') {
        if (!item.failoverUri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub cluster'} needs a failover wss:// hub URI.` });
        if (!item.failoverIp?.trim() || ipToLong(item.failoverIp) === null) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub cluster'} needs a valid failover hub IP.` });
      }
      const underlays = item.subnetIds.map(id => project.subnets.find(subnet => subnet.id === id && (!subnet.networkType || subnet.networkType === 'bacnet-ip'))).filter((subnet): subnet is DiagramSubnet => Boolean(subnet));
      if (!underlays.length) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub'} must attach to at least one physical IP underlay.` });
      else if (ipToLong(item.ip) !== null && !underlays.some(subnet => addressState({ id: '', subnetId: subnet.id, ip: item.ip, label: '' }, subnet) === 'valid')) diagnostics.push({ level: 'warning', message: `${item.name} is outside its attached IP-underlay prefixes; document the routed path to the hub.` });
    }
    if (item.ip.trim()) {
      if (ipToLong(item.ip) === null) diagnostics.push({ level: 'error', message: `${item.name || 'Unnamed infrastructure'} has an invalid IP address.` });
      else usedIps.set(item.ip.trim(), [...(usedIps.get(item.ip.trim()) ?? []), item.name || 'Unnamed infrastructure']);
    }
  }

  const scHubs = project.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster');
  for (const hub of scHubs) {
    for (const peerId of hub.peerInfrastructureIds ?? []) {
      const peer = scHubs.find(item => item.id === peerId);
      if (!peer) diagnostics.push({ level: 'error', message: `${hub.name} references a missing BACnet/SC hub connection.` });
      else if (!(peer.peerInfrastructureIds ?? []).includes(hub.id)) diagnostics.push({ level: 'warning', message: `${hub.name} → ${peer.name} is modeled one-way; verify the intended BACnet/SC hub continuity.` });
    }
  }
  const deviceNics = project.subnets.flatMap(owner => owner.devices.flatMap(device => device.nics.map(nic => ({ device, nic }))));
  const deviceHubNics = new Map(deviceNics.filter(({ nic }) => nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub')).map(entry => [entry.nic.id, entry]));
  const infrastructureHubIds = new Set(scHubs.map(hub => hub.id));
  for (const { device, nic } of deviceNics.filter(entry => entry.nic.bacnetScEnabled)) {
    const label = `${device.name || 'Unnamed device'} ${nic.name || 'NIC'}`;
    const role = nic.scHubRole ?? 'node';
    if ((role === 'hub' || role === 'ha-hub') && !nic.scHubUri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${label} is an SC hub and needs a wss:// hub URI.` });
    if (role === 'ha-hub' && !nic.scFailoverHubUri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${label} is an HA SC hub and needs a failover wss:// URI.` });
    if (role === 'node' && !nic.scHubId) diagnostics.push({ level: 'error', message: `${label} must be assigned to a BACnet/SC hub or HA hub.` });
    if (nic.scHubId === nic.id) diagnostics.push({ level: 'error', message: `${label} cannot federate with itself.` });
    if (nic.scHubId && !infrastructureHubIds.has(nic.scHubId) && !deviceHubNics.has(nic.scHubId)) diagnostics.push({ level: 'error', message: `${label} references a missing BACnet/SC hub.` });
    if (nic.scHubId && !nic.scHubL3Reachable) diagnostics.push({ level: 'error', message: `${label} has no verified L3/TLS path to its SC hub. Verify forward and return routing, DNS, firewall policy, TCP reachability, and TLS trust.` });

    const visited = new Set<string>([nic.id]);
    let parentId = nic.scHubId;
    while (parentId && deviceHubNics.has(parentId)) {
      if (visited.has(parentId)) {
        diagnostics.push({ level: 'error', message: `${label} is part of a BACnet/SC hub federation cycle.` });
        break;
      }
      visited.add(parentId);
      parentId = deviceHubNics.get(parentId)?.nic.scHubId;
    }
  }
  const assignedInfrastructureHubs = [...new Set(deviceNics.flatMap(({ nic }) => nic.bacnetScEnabled && nic.scHubId && infrastructureHubIds.has(nic.scHubId) ? [nic.scHubId] : []))];
  if (assignedInfrastructureHubs.length > 1) {
    const visited = new Set<string>();
    const queue = [assignedInfrastructureHubs[0]];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const hub = scHubs.find(item => item.id === id);
      for (const peer of hub?.peerInfrastructureIds ?? []) if (!visited.has(peer)) queue.push(peer);
      for (const reverse of scHubs.filter(item => (item.peerInfrastructureIds ?? []).includes(id))) if (!visited.has(reverse.id)) queue.push(reverse.id);
    }
    if (assignedInfrastructureHubs.some(id => !visited.has(id))) diagnostics.push({ level: 'error', message: 'BACnet/SC nodes are assigned to hubs without a modeled hub-to-hub path. Add the required hub connections.' });
  }

  for (const [ip, names] of usedIps) {
    if (names.length > 1) diagnostics.push({ level: 'error', message: `${ip.includes(':') ? 'Duplicate datalink address' : 'Duplicate IP'} ${ip.includes(':') ? ip.split(':').pop() : ip}: ${names.join(', ')}.` });
  }
  const endpointIds = new Set([
    ...project.infrastructure.map(item => item.id),
    ...project.subnets.flatMap(subnet => subnet.devices.flatMap(device => device.nics.flatMap(nic => nic.addresses.map(address => address.id))))
  ]);
  for (const path of project.paths) {
    if (path.hops.length < 2) diagnostics.push({ level: 'warning', message: `${path.name || 'Unnamed test path'} needs at least two endpoints.` });
    else if (path.hops.some(id => !endpointIds.has(id))) diagnostics.push({ level: 'warning', message: `${path.name || 'Unnamed test path'} references an endpoint that no longer exists.` });
    if (path.testType === 'bacnet-whois') {
      const broadcast = ipToLong(path.broadcastAddress);
      if (broadcast === null) diagnostics.push({ level: 'error', message: `${path.name || 'BACnet Who-Is'} needs a valid broadcast address.` });
      const suggested = getWhoIsSuggestedBroadcast(project, path);
      if (broadcast !== null && suggested && path.broadcastAddress !== suggested && path.broadcastAddress !== '255.255.255.255') {
        diagnostics.push({ level: 'warning', message: `${path.name || 'BACnet Who-Is'} uses ${path.broadcastAddress}; the source subnet broadcast is ${suggested}.` });
      }
      if (!Number.isInteger(path.udpPort) || (path.udpPort ?? 0) < 1 || (path.udpPort ?? 0) > 65535) diagnostics.push({ level: 'error', message: `${path.name || 'BACnet Who-Is'} needs a valid destination UDP port.` });
    }
  }
  return diagnostics;
}

export function getWhoIsSuggestedBroadcast(project: DiagramProject, path: DiagramTestPath): string {
  const sourceId = path.hops[0];
  for (const subnet of project.subnets) {
    for (const device of subnet.devices) {
      for (const nic of device.nics) {
        const address = nic.addresses.find(item => item.id === sourceId);
        if (!address) continue;
        const addressSubnet = project.subnets.find(item => item.id === address.subnetId);
        return addressSubnet ? getSubnetDetails(addressSubnet.address, addressSubnet.cidr)?.broadcast ?? '' : '';
      }
    }
  }
  return '';
}

export function normalizeDiagramProject(project: DiagramProject): DiagramProject {
  project.viewMode ??= 'detailed';
  for (const legacy of project.subnets.filter(subnet => subnet.networkType === 'bacnet-sc')) {
    const hubs = project.infrastructure.filter(item => (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') && item.subnetIds.includes(legacy.id));
    const underlayId = hubs.flatMap(hub => hub.underlaySubnetIds ?? []).find(id => project.subnets.some(subnet => subnet.id === id && (!subnet.networkType || subnet.networkType === 'bacnet-ip')));
    const underlay = project.subnets.find(subnet => subnet.id === underlayId);
    if (!underlay) continue;
    for (const device of legacy.devices) {
      device.bacnetScEnabled = true;
      device.bacnetIpEnabled ??= false;
      for (const address of device.nics?.flatMap(nic => nic.addresses) ?? []) address.subnetId = underlay.id;
      underlay.devices.push(device);
    }
    for (const hub of hubs) {
      hub.subnetIds = [...new Set(hub.subnetIds.filter(id => id !== legacy.id).concat(underlay.id))];
      hub.underlaySubnetIds = [...new Set((hub.underlaySubnetIds ?? []).concat(underlay.id))];
    }
    project.subnets = project.subnets.filter(subnet => subnet.id !== legacy.id);
  }
  for (const subnet of project.subnets) {
    subnet.networkType ??= 'bacnet-ip';
    if (subnet.udpPort === undefined) subnet.udpPort = 47808;
    subnet.bacnetNetworkNumber ??= '';
    subnet.mstpBaudRate ??= 38400;
    subnet.mstpMaxMaster ??= 127;
    subnet.arcnetDataRate ??= 2500;
    subnet.upstreamSubnetId ??= '';
    subnet.routerId ??= '';
    subnet.scDirectConnections ??= false;
    for (const device of subnet.devices) {
      if (!Array.isArray(device.nics)) {
        const nic = createNic(subnet.id);
        nic.addresses[0].ip = device.ip ?? '';
        nic.addresses.push(...(device.additionalInterfaces ?? []).map((address, index) => ({
          ...address,
          id: address.id || createId('address'),
          label: address.label && address.label !== 'Secondary NIC' ? address.label : `Address ${index + 2}`
        })));
        device.nics = [nic];
      }
      device.nics.forEach((nic, index) => {
        const isLegacyPrimaryNic = index === 0;
        nic.bacnetIpEnabled ??= isLegacyPrimaryNic ? (device.bacnetIpEnabled ?? subnet.networkType !== 'bacnet-sc') : true;
        nic.bacnetScEnabled ??= isLegacyPrimaryNic ? (device.bacnetScEnabled ?? subnet.networkType === 'bacnet-sc') : false;
        nic.scHubRole ??= isLegacyPrimaryNic ? (device.scHubRole ?? 'node') : 'node';
        nic.scHubUri ??= isLegacyPrimaryNic ? (device.scHubUri ?? '') : '';
        nic.scFailoverHubUri ??= isLegacyPrimaryNic ? (device.scFailoverHubUri ?? '') : '';
        nic.scHubId ??= isLegacyPrimaryNic ? (device.scHubId ?? '') : '';
        nic.scHubL3Reachable ??= isLegacyPrimaryNic ? (device.scHubL3Reachable ?? false) : false;
      });
      delete device.ip;
      delete device.additionalInterfaces;
      delete device.bacnetIpEnabled;
      delete device.bacnetScEnabled;
      delete device.scHubRole;
      delete device.scHubUri;
      delete device.scFailoverHubUri;
      delete device.scHubId;
      delete device.scHubL3Reachable;
    }
  }
  for (const item of project.infrastructure) {
    item.uri ??= '';
    item.failoverIp ??= '';
    item.failoverUri ??= '';
    item.peerInfrastructureIds ??= [];
    item.underlaySubnetIds ??= [];
  }
  if (!Array.isArray(project.paths)) project.paths = [];
  const devices = project.subnets.flatMap(subnet => subnet.devices);
  for (const path of project.paths) {
    if (!path.testType) path.testType = path.protocol.toLowerCase().includes('who-is') ? 'bacnet-whois' : 'ping';
    if (typeof path.broadcastAddress !== 'string') path.broadcastAddress = '';
    path.udpPort ??= 47808;
    path.hops = path.hops.map(endpointId => {
      const legacyHost = devices.find(device => device.id === endpointId);
      return legacyHost?.nics[0]?.addresses[0]?.id ?? endpointId;
    });
  }
  return project;
}

export function isDiagramProject(value: unknown): value is DiagramProject {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DiagramProject>;
  if (candidate.version !== 1 || typeof candidate.title !== 'string' || typeof candidate.notes !== 'string'
    || !Array.isArray(candidate.subnets) || !Array.isArray(candidate.infrastructure)) return false;

  const devicesValid = (devices: unknown): devices is DiagramDevice[] => Array.isArray(devices) && devices.every(device => {
    if (!device || typeof device !== 'object') return false;
    const item = device as Partial<DiagramDevice>;
    const legacyInterfacesValid = item.additionalInterfaces === undefined || (Array.isArray(item.additionalInterfaces) && item.additionalInterfaces.every(networkInterface => {
      if (!networkInterface || typeof networkInterface !== 'object') return false;
      const networkItem = networkInterface as Partial<DiagramDeviceAddress>;
      return typeof networkItem.id === 'string' && typeof networkItem.subnetId === 'string'
        && typeof networkItem.ip === 'string' && typeof networkItem.label === 'string';
    }));
    const nicsValid = item.nics === undefined || (Array.isArray(item.nics) && item.nics.every(nic => {
      if (!nic || typeof nic !== 'object') return false;
      const nicItem = nic as Partial<DiagramNic>;
      return typeof nicItem.id === 'string' && typeof nicItem.name === 'string' && Array.isArray(nicItem.addresses)
        && (nicItem.bacnetIpEnabled === undefined || typeof nicItem.bacnetIpEnabled === 'boolean')
        && (nicItem.bacnetScEnabled === undefined || typeof nicItem.bacnetScEnabled === 'boolean')
        && (nicItem.scHubRole === undefined || nicItem.scHubRole === 'node' || nicItem.scHubRole === 'hub' || nicItem.scHubRole === 'ha-hub')
        && (nicItem.scHubUri === undefined || typeof nicItem.scHubUri === 'string')
        && (nicItem.scFailoverHubUri === undefined || typeof nicItem.scFailoverHubUri === 'string')
        && (nicItem.scHubId === undefined || typeof nicItem.scHubId === 'string')
        && (nicItem.scHubL3Reachable === undefined || typeof nicItem.scHubL3Reachable === 'boolean')
        && nicItem.addresses.every(address => typeof address.id === 'string' && typeof address.subnetId === 'string'
          && typeof address.ip === 'string' && typeof address.label === 'string');
    }));
    return typeof item.id === 'string' && typeof item.name === 'string' && (item.ip === undefined || typeof item.ip === 'string')
      && typeof item.notes === 'string' && (item.scHubId === undefined || typeof item.scHubId === 'string')
      && (item.scHubL3Reachable === undefined || typeof item.scHubL3Reachable === 'boolean')
      && (item.bacnetIpEnabled === undefined || typeof item.bacnetIpEnabled === 'boolean') && (item.bacnetScEnabled === undefined || typeof item.bacnetScEnabled === 'boolean')
      && (item.scHubRole === undefined || item.scHubRole === 'node' || item.scHubRole === 'hub' || item.scHubRole === 'ha-hub')
      && ['controller', 'workstation', 'server', 'sensor', 'other'].includes(item.kind ?? '')
      && legacyInterfacesValid && nicsValid && (Array.isArray(item.nics) || typeof item.ip === 'string');
  });
  const subnetsValid = candidate.subnets.every(subnet => {
    if (!subnet || typeof subnet !== 'object') return false;
    const item = subnet as Partial<DiagramSubnet>;
    return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.address === 'string'
      && typeof item.cidr === 'number' && item.cidr >= 0 && item.cidr <= 32 && typeof item.vlan === 'string'
      && typeof item.color === 'string' && devicesValid(item.devices);
  });
  const infrastructureValid = candidate.infrastructure.every(infrastructure => {
    if (!infrastructure || typeof infrastructure !== 'object') return false;
    const item = infrastructure as Partial<DiagramInfrastructure>;
    return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.ip === 'string'
      && typeof item.notes === 'string' && ['router', 'switch', 'firewall', 'bbmd', 'gateway', 'sc-hub', 'sc-hub-cluster'].includes(item.kind ?? '')
      && Array.isArray(item.subnetIds) && item.subnetIds.every(id => typeof id === 'string');
  });
  const pathsValid = candidate.paths === undefined || (Array.isArray(candidate.paths) && candidate.paths.every(path => {
    if (!path || typeof path !== 'object') return false;
    const item = path as Partial<DiagramTestPath>;
    return typeof item.id === 'string' && typeof item.name === 'string'
      && (item.testType === undefined || item.testType === 'ping' || item.testType === 'bacnet-whois' || item.testType === 'custom')
      && typeof item.protocol === 'string' && (item.broadcastAddress === undefined || typeof item.broadcastAddress === 'string')
      && (item.udpPort === undefined || typeof item.udpPort === 'number')
      && (item.outcome === 'success' || item.outcome === 'failure') && Array.isArray(item.hops)
      && item.hops.every(id => typeof id === 'string') && typeof item.notes === 'string';
  }));
  return subnetsValid && infrastructureValid && pathsValid;
}
