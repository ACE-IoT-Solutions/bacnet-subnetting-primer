import { describe, expect, it } from 'vitest';
import { groupNmapHostsBySubnet, isNmapGatewayHost, nmapHostName, parseNmapOutput } from './nmap-import';

const SAMPLE = `Nmap scan report for _gateway (10.115.12.1)
Host is up (0.0015s latency).
Nmap scan report for 10.115.12.6
Host is up (0.00077s latency).
Nmap scan report for 10.115.12.7
Host is up (0.00063s latency).
Nmap scan report for besplustech-0009-northview-hs (10.115.12.248)
Host is up (0.00055s latency).
Nmap scan report for besplustech-0009-northview-hs (10.115.12.249)
Host is up (0.00040s latency).`;

describe('Nmap output import', () => {
  it('parses named and unnamed responsive IPv4 hosts', () => {
    const hosts = parseNmapOutput(SAMPLE);
    expect(hosts).toHaveLength(5);
    expect(hosts[0]).toEqual({ ip: '10.115.12.1', hostname: '_gateway', latencySeconds: 0.0015 });
    expect(hosts[1]).toEqual({ ip: '10.115.12.6', hostname: '', latencySeconds: 0.00077 });
    expect(hosts.at(-1)?.hostname).toBe('besplustech-0009-northview-hs');
  });

  it('ignores down, malformed, and duplicate reports', () => {
    const hosts = parseNmapOutput(`Nmap scan report for 10.1.2.3
Host is up.
Nmap scan report for host-a (10.1.2.3)
Host is up (0.02s latency).
Nmap scan report for 10.1.2.4
Host seems down.
Nmap scan report for 999.1.2.3
Host is up.`);
    expect(hosts).toEqual([{ ip: '10.1.2.3', hostname: 'host-a', latencySeconds: 0.02 }]);
  });

  it('groups hosts using the user-selected CIDR', () => {
    const groups = groupNmapHostsBySubnet(parseNmapOutput(`${SAMPLE}
Nmap scan report for 10.115.13.2
Host is up.`), 24);
    expect(groups.map(group => `${group.network}/${group.cidr}`)).toEqual(['10.115.12.0/24', '10.115.13.0/24']);
    expect(groups[0].hosts).toHaveLength(5);
  });

  it('processes a full discovery scan into one /24 inventory', () => {
    const addresses = [
      '10.115.12.1',
      ...Array.from({ length: 13 }, (_, index) => `10.115.12.${index + 6}`),
      '10.115.12.27',
      '10.115.12.248',
      '10.115.12.249'
    ];
    const output = addresses.map((ip, index) => {
      const name = ip === '10.115.12.1'
        ? `_gateway (${ip})`
        : ip.endsWith('.248') || ip.endsWith('.249')
          ? `besplustech-0009-northview-hs (${ip})`
          : ip;
      return `Nmap scan report for ${name}\nHost is up (0.00${index + 1}s latency).`;
    }).join('\n');
    const hosts = parseNmapOutput(output);
    const groups = groupNmapHostsBySubnet(hosts, 24);

    expect(hosts).toHaveLength(17);
    expect(groups).toHaveLength(1);
    expect(groups[0].network).toBe('10.115.12.0');
    expect(hosts.filter(host => host.hostname === 'besplustech-0009-northview-hs')).toHaveLength(2);
  });

  it('identifies explicit gateway names without guessing from the address', () => {
    const hosts = parseNmapOutput(SAMPLE);
    expect(isNmapGatewayHost(hosts[0])).toBe(true);
    expect(isNmapGatewayHost(hosts[1])).toBe(false);
    expect(nmapHostName(hosts[1])).toBe('Host 10.115.12.6');
  });
});
