import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { appendBbmdReportPages } from './export-bbmd-pdf';
import type { BbmdReport } from './bbmd-report';

describe('BBMD PDF schedule export', () => {
  it('adds a peering summary and paginated device table pages', () => {
    const deviceCount = 12;
    const report: BbmdReport = {
      mutualCount: deviceCount - 1,
      oneWayCount: 0,
      peerings: Array.from({ length: deviceCount - 1 }, (_, index) => ({
        id: `peer-${index}`,
        sourceId: 'bbmd-0',
        sourceName: 'Campus BBMD 1',
        sourceEndpoint: '192.0.2.10:47808',
        targetId: `bbmd-${index + 1}`,
        targetName: `Campus BBMD ${index + 2}`,
        targetEndpoint: `198.51.100.${index + 10}:47808`,
        status: 'Mutual'
      })),
      devices: Array.from({ length: deviceCount }, (_, deviceIndex) => ({
        id: `bbmd-${deviceIndex}`,
        name: `Campus BBMD ${deviceIndex + 1}`,
        endpoint: `192.0.2.${deviceIndex + 10}:47808`,
        subnetName: `Controls Network ${deviceIndex + 1}`,
        subnetCidr: `192.0.${deviceIndex + 2}.0/24`,
        inboundPeerIds: [],
        entries: Array.from({ length: 8 }, (_, peerIndex) => ({
          peerId: `peer-${peerIndex}`,
          peerName: `Peer BBMD ${peerIndex + 1}`,
          peerEndpoint: `203.0.113.${peerIndex + 10}:47808`,
          peerSubnet: `Peer Network ${peerIndex + 1} · 203.0.113.0/24`,
          status: 'Mutual'
        }))
      }))
    };
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    appendBbmdReportPages(pdf, report, { projectTitle: 'Synthetic campus', theme: 'light' });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(3);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(1_000);
  });
});
