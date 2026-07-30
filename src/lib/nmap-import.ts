import { getSubnetDetails, ipToLong } from './subnet';

export interface NmapHost {
  ip: string;
  hostname: string;
  latencySeconds?: number;
}

export interface NmapSubnetGroup {
  network: string;
  cidr: number;
  hosts: NmapHost[];
}

interface PendingHost extends NmapHost {
  isUp: boolean;
}

const REPORT_PATTERN = /^Nmap scan report for (.+?)(?:\s+\((\d{1,3}(?:\.\d{1,3}){3})\))?\s*$/i;
const UP_PATTERN = /^Host is up(?:\s+\(([\d.]+)s latency\))?\./i;

export function parseNmapOutput(output: string): NmapHost[] {
  const parsed: NmapHost[] = [];
  let pending: PendingHost | null = null;

  const finishPending = () => {
    if (!pending?.isUp) return;
    parsed.push({
      ip: pending.ip,
      hostname: pending.hostname,
      ...(pending.latencySeconds === undefined ? {} : { latencySeconds: pending.latencySeconds })
    });
  };

  output.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    const report = REPORT_PATTERN.exec(line);
    if (report) {
      finishPending();
      const label = report[1].trim();
      const ip = report[2] ?? label;
      pending = ipToLong(ip) === null ? null : {
        ip,
        hostname: report[2] ? label : '',
        isUp: false
      };
      return;
    }

    const up = UP_PATTERN.exec(line);
    if (up && pending) {
      pending.isUp = true;
      if (up[1]) pending.latencySeconds = Number(up[1]);
    }
  });
  finishPending();

  const unique = new Map<string, NmapHost>();
  parsed.forEach(host => {
    const existing = unique.get(host.ip);
    if (!existing || (!existing.hostname && host.hostname)) unique.set(host.ip, host);
  });
  return [...unique.values()].sort((a, b) => (ipToLong(a.ip) ?? 0) - (ipToLong(b.ip) ?? 0));
}

export function groupNmapHostsBySubnet(hosts: NmapHost[], cidr: number): NmapSubnetGroup[] {
  const groups = new Map<string, NmapSubnetGroup>();
  hosts.forEach(host => {
    const details = getSubnetDetails(host.ip, cidr);
    if (!details) return;
    const key = `${details.network}/${cidr}`;
    const group = groups.get(key) ?? { network: details.network, cidr, hosts: [] };
    group.hosts.push(host);
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => (ipToLong(a.network) ?? 0) - (ipToLong(b.network) ?? 0));
}

export function nmapHostName(host: NmapHost): string {
  return host.hostname || `Host ${host.ip}`;
}

export function isNmapGatewayHost(host: NmapHost): boolean {
  return /(^|[-_.\s])gateway($|[-_.\s])/i.test(host.hostname);
}
