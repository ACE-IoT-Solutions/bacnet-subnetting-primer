import type { DiagramDiagnostic } from './network-diagram';

export interface DiagramDiagnosticGroup {
  key: string;
  title: string;
  description: string;
  level: DiagramDiagnostic['level'];
  errorCount: number;
  warningCount: number;
  items: DiagramDiagnostic[];
}

const DIAGNOSTIC_CLASSES = [
  { key: 'fdr', title: 'Foreign Device Registration', description: 'Foreign-device eligibility and registration targets.', pattern: /foreign device|registration BBMD|\bFDR\b/i },
  { key: 'bdt', title: 'BBMD & BDT relationships', description: 'Broadcast distribution peers, reciprocity, ports, and subnet placement.', pattern: /BBMD|BDT relationship|BDT peer/i },
  { key: 'bacnet-sc', title: 'BACnet/SC connectivity', description: 'Hub assignments, federation, WebSocket endpoints, and L3/TLS reachability.', pattern: /BACnet\/SC|SC hub|wss:\/\/|L3\/TLS/i },
  { key: 'addressing', title: 'Addressing & subnet membership', description: 'Invalid, duplicate, missing, or out-of-prefix addresses.', pattern: /invalid (?:network|IP|MS\/TP|ARCNET|BACnet\/SC node)|Duplicate| is outside |not assigned to an available subnet|different datalink type/i },
  { key: 'datalink', title: 'BACnet datalinks & routing', description: 'Network numbers, UDP ports, datalink overlaps, and upstream routing.', pattern: /network number|UDP port|IP\/VLAN|upstream|must be routed|BACnet\/IP devices|distinct BACnet\/IP networks/i },
  { key: 'tests', title: 'Connectivity tests', description: 'Missing endpoints, invalid broadcasts, and test-path configuration.', pattern: /test path|endpoint|Who-Is|broadcast address|source subnet broadcast/i },
  { key: 'services', title: 'Device services', description: 'Device interfaces without an enabled BACnet service.', pattern: /neither BACnet\/IP nor BACnet\/SC/i }
] as const;

function diagnosticClass(message: string) {
  return DIAGNOSTIC_CLASSES.find(candidate => candidate.pattern.test(message)) ?? {
    key: 'other',
    title: 'Other configuration findings',
    description: 'Additional items that need review.'
  };
}

export function groupDiagramDiagnostics(diagnostics: DiagramDiagnostic[]): DiagramDiagnosticGroup[] {
  const groups = new Map<string, DiagramDiagnosticGroup>();
  diagnostics.forEach(diagnostic => {
    const diagnosticClassInfo = diagnosticClass(diagnostic.message);
    let group = groups.get(diagnosticClassInfo.key);
    if (!group) {
      group = {
        key: diagnosticClassInfo.key,
        title: diagnosticClassInfo.title,
        description: diagnosticClassInfo.description,
        level: diagnostic.level,
        errorCount: 0,
        warningCount: 0,
        items: []
      };
      groups.set(group.key, group);
    }
    group.items.push(diagnostic);
    if (diagnostic.level === 'error') {
      group.errorCount += 1;
      group.level = 'error';
    } else {
      group.warningCount += 1;
    }
  });
  return [...groups.values()].sort((first, second) => {
    if (first.level !== second.level) return first.level === 'error' ? -1 : 1;
    return second.items.length - first.items.length;
  });
}
