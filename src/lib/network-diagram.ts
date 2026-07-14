import { getSubnetDetails, ipToLong } from './subnet';
import type { PlannerSubnet } from './planner';

export type DeviceKind = 'controller' | 'workstation' | 'server' | 'sensor' | 'other';
export type InfrastructureKind = 'router' | 'switch' | 'firewall' | 'bbmd' | 'gateway';
export type PathOutcome = 'success' | 'failure';
export type DiagramTestType = 'ping' | 'bacnet-whois' | 'custom';
export type DiagramNetworkType = 'bacnet-ip' | 'mstp' | 'arcnet';

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
  bacnetNetworkNumber?: string;
  mstpBaudRate?: number;
  mstpMaxMaster?: number;
  arcnetDataRate?: number;
  upstreamSubnetId?: string;
  routerId?: string;
}

export interface DiagramInfrastructure {
  id: string;
  name: string;
  kind: InfrastructureKind;
  ip: string;
  subnetIds: string[];
  notes: string;
}

export interface DiagramTestPath {
  id: string;
  name: string;
  testType: DiagramTestType;
  protocol: string;
  broadcastAddress: string;
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
  return { id: createId('nic'), name: `NIC ${index}`, addresses: [createDeviceAddress(subnetId)] };
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
    bacnetNetworkNumber: '',
    mstpBaudRate: 38400,
    mstpMaxMaster: 127,
    arcnetDataRate: 2500,
    upstreamSubnetId: '',
    routerId: ''
  };
}

export function createInfrastructure(index = 1): DiagramInfrastructure {
  return { id: createId('infra'), name: `Router ${index}`, kind: 'router', ip: '', subnetIds: [], notes: '' };
}

export function createTestPath(endpointIds: string[] = []): DiagramTestPath {
  return {
    id: createId('path'),
    name: 'Ping test',
    testType: 'ping',
    protocol: 'ICMP',
    broadcastAddress: '',
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
  return { version: 1, title: 'Planned BACnet Network Topology', notes: 'Imported from Network Planner', subnets, infrastructure: [], paths: [], viewMode: 'networks' };
}

export function subnetCidr(subnet: DiagramSubnet): string {
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
    if ((subnet.networkType === 'mstp' || subnet.networkType === 'arcnet')
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
        for (const address of nic.addresses) {
          const addressSubnet = project.subnets.find(candidate => candidate.id === address.subnetId);
          const ownerType = subnet.networkType || 'bacnet-ip';
          const addressType = addressSubnet?.networkType || 'bacnet-ip';
          const state = addressState(address, addressSubnet);
          const addressName = `${device.name || 'Unnamed device'} ${nic.name || 'NIC'} ${address.label || 'address'}`;
          if (!addressSubnet) diagnostics.push({ level: 'error', message: `${addressName} is not assigned to an available subnet.` });
          else if (ownerType !== addressType) diagnostics.push({ level: 'error', message: `${addressName} cannot use ${subnetCidr(addressSubnet)} because the device belongs to a different datalink type.` });
          else if (state === 'invalid') diagnostics.push({ level: 'error', message: `${addressName} has an invalid ${addressSubnet.networkType === 'mstp' ? 'MS/TP MAC' : addressSubnet.networkType === 'arcnet' ? 'ARCNET node' : 'IP'} address.` });
          else if (state === 'outside') diagnostics.push({ level: 'warning', message: `${addressName} (${address.ip}) is outside ${subnetCidr(addressSubnet)}.` });
          else if (state === 'valid') {
            const key = addressSubnet.networkType === 'mstp' || addressSubnet.networkType === 'arcnet' ? `${addressSubnet.id}:${address.ip.trim()}` : address.ip.trim();
            usedIps.set(key, [...(usedIps.get(key) ?? []), addressName]);
          }
        }
      }
    }
  }

  for (const item of project.infrastructure) {
    if (item.ip.trim()) {
      if (ipToLong(item.ip) === null) diagnostics.push({ level: 'error', message: `${item.name || 'Unnamed infrastructure'} has an invalid IP address.` });
      else usedIps.set(item.ip.trim(), [...(usedIps.get(item.ip.trim()) ?? []), item.name || 'Unnamed infrastructure']);
    }
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
  for (const subnet of project.subnets) {
    subnet.networkType ??= 'bacnet-ip';
    subnet.bacnetNetworkNumber ??= '';
    subnet.mstpBaudRate ??= 38400;
    subnet.mstpMaxMaster ??= 127;
    subnet.arcnetDataRate ??= 2500;
    subnet.upstreamSubnetId ??= '';
    subnet.routerId ??= '';
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
      delete device.ip;
      delete device.additionalInterfaces;
    }
  }
  if (!Array.isArray(project.paths)) project.paths = [];
  const devices = project.subnets.flatMap(subnet => subnet.devices);
  for (const path of project.paths) {
    if (!path.testType) path.testType = path.protocol.toLowerCase().includes('who-is') ? 'bacnet-whois' : 'ping';
    if (typeof path.broadcastAddress !== 'string') path.broadcastAddress = '';
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
        && nicItem.addresses.every(address => typeof address.id === 'string' && typeof address.subnetId === 'string'
          && typeof address.ip === 'string' && typeof address.label === 'string');
    }));
    return typeof item.id === 'string' && typeof item.name === 'string' && (item.ip === undefined || typeof item.ip === 'string')
      && typeof item.notes === 'string' && ['controller', 'workstation', 'server', 'sensor', 'other'].includes(item.kind ?? '')
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
      && typeof item.notes === 'string' && ['router', 'switch', 'firewall', 'bbmd', 'gateway'].includes(item.kind ?? '')
      && Array.isArray(item.subnetIds) && item.subnetIds.every(id => typeof id === 'string');
  });
  const pathsValid = candidate.paths === undefined || (Array.isArray(candidate.paths) && candidate.paths.every(path => {
    if (!path || typeof path !== 'object') return false;
    const item = path as Partial<DiagramTestPath>;
    return typeof item.id === 'string' && typeof item.name === 'string'
      && (item.testType === undefined || item.testType === 'ping' || item.testType === 'bacnet-whois' || item.testType === 'custom')
      && typeof item.protocol === 'string' && (item.broadcastAddress === undefined || typeof item.broadcastAddress === 'string')
      && (item.outcome === 'success' || item.outcome === 'failure') && Array.isArray(item.hops)
      && item.hops.every(id => typeof id === 'string') && typeof item.notes === 'string';
  }));
  return subnetsValid && infrastructureValid && pathsValid;
}
