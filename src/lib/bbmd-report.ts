import { subnetCidr, type DiagramDevice, type DiagramProject, type DiagramSubnet } from './network-diagram';

export interface BbmdReportEntry {
  peerId: string;
  peerName: string;
  peerEndpoint: string;
  peerSubnet: string;
  status: 'Mutual' | 'One-way outgoing' | 'Missing peer';
}

export interface BbmdReportDevice {
  id: string;
  name: string;
  endpoint: string;
  subnetName: string;
  subnetCidr: string;
  entries: BbmdReportEntry[];
  inboundPeerIds: string[];
}

export interface BbmdPeeringSummary {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceEndpoint: string;
  targetId: string;
  targetName: string;
  targetEndpoint: string;
  status: 'Mutual' | 'One-way';
}

export interface BbmdReport {
  devices: BbmdReportDevice[];
  peerings: BbmdPeeringSummary[];
  mutualCount: number;
  oneWayCount: number;
}

interface BbmdSource {
  device: DiagramDevice;
  subnet: DiagramSubnet;
  endpoint: string;
}

function deviceEndpoint(device: DiagramDevice, subnet: DiagramSubnet) {
  const address = device.nics.flatMap(nic => nic.addresses).find(item => item.subnetId === subnet.id)
    ?? device.nics.flatMap(nic => nic.addresses)[0];
  return `${address?.ip || 'Address not set'}:${subnet.udpPort || 47808}`;
}

export function createBbmdReport(project: DiagramProject): BbmdReport {
  const sources: BbmdSource[] = project.subnets.flatMap(subnet => subnet.devices
    .filter(device => device.bbmdEnabled)
    .map(device => ({ device, subnet, endpoint: deviceEndpoint(device, subnet) })));
  const byId = new Map(sources.map(source => [source.device.id, source]));
  const inboundById = new Map(sources.map(source => [source.device.id, [] as string[]]));
  sources.forEach(source => (source.device.bdtPeerDeviceIds ?? []).forEach(peerId => {
    if (inboundById.has(peerId)) inboundById.get(peerId)!.push(source.device.id);
  }));

  const devices = sources.map(source => ({
    id: source.device.id,
    name: source.device.name || 'Unnamed BBMD',
    endpoint: source.endpoint,
    subnetName: source.subnet.name || 'Unnamed subnet',
    subnetCidr: subnetCidr(source.subnet),
    inboundPeerIds: inboundById.get(source.device.id) ?? [],
    entries: (source.device.bdtPeerDeviceIds ?? []).map(peerId => {
      const peer = byId.get(peerId);
      const mutual = peer?.device.bdtPeerDeviceIds?.includes(source.device.id) ?? false;
      return {
        peerId,
        peerName: peer?.device.name || 'Missing or disabled BBMD',
        peerEndpoint: peer?.endpoint || 'Unavailable',
        peerSubnet: peer ? `${peer.subnet.name || 'Unnamed subnet'} · ${subnetCidr(peer.subnet)}` : 'Unavailable',
        status: peer ? mutual ? 'Mutual' as const : 'One-way outgoing' as const : 'Missing peer' as const
      };
    })
  }));

  const seenMutual = new Set<string>();
  const peerings = sources.flatMap(source => (source.device.bdtPeerDeviceIds ?? []).flatMap(peerId => {
    const peer = byId.get(peerId);
    if (!peer) return [];
    const mutual = peer.device.bdtPeerDeviceIds?.includes(source.device.id) ?? false;
    const pairKey = [source.device.id, peerId].sort().join('|');
    if (mutual && seenMutual.has(pairKey)) return [];
    if (mutual) seenMutual.add(pairKey);
    return [{
      id: mutual ? `mutual-${pairKey}` : `one-way-${source.device.id}-${peerId}`,
      sourceId: source.device.id,
      sourceName: source.device.name || 'Unnamed BBMD',
      sourceEndpoint: source.endpoint,
      targetId: peerId,
      targetName: peer.device.name || 'Unnamed BBMD',
      targetEndpoint: peer.endpoint,
      status: mutual ? 'Mutual' as const : 'One-way' as const
    }];
  }));

  return {
    devices,
    peerings,
    mutualCount: peerings.filter(peering => peering.status === 'Mutual').length,
    oneWayCount: peerings.filter(peering => peering.status === 'One-way').length
  };
}

export function bbmdRelationshipClass(report: BbmdReport, focusId: string, candidateId: string) {
  if (!focusId || focusId === candidateId) return focusId === candidateId ? 'focus' : 'none';
  const focus = report.devices.find(device => device.id === focusId);
  const candidate = report.devices.find(device => device.id === candidateId);
  if (!focus || !candidate) return 'none';
  const outbound = focus.entries.some(entry => entry.peerId === candidateId);
  const inbound = candidate.entries.some(entry => entry.peerId === focusId);
  if (outbound && inbound) return 'mutual';
  if (outbound) return 'outbound';
  if (inbound) return 'inbound';
  return 'none';
}
