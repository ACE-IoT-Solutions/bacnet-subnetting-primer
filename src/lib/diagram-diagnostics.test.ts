import { describe, expect, it } from 'vitest';
import { groupDiagramDiagnostics } from './diagram-diagnostics';

describe('diagram diagnostic grouping', () => {
  it('collapses repeated findings by class and tracks severity counts', () => {
    const groups = groupDiagramDiagnostics([
      { level: 'warning', message: 'BBMD A and BBMD B do not have a mutual BDT relationship.' },
      { level: 'warning', message: 'BBMD A and BBMD C share one IP subnet; a BDT relationship is normally used across subnet boundaries.' },
      { level: 'error', message: 'Duplicate IP 192.0.2.10: Device A, Device B.' },
      { level: 'warning', message: 'Device C Primary (192.0.2.50) is outside 198.51.100.0/24.' }
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ key: 'addressing', level: 'error', errorCount: 1, warningCount: 1 });
    expect(groups[1]).toMatchObject({ key: 'bdt', warningCount: 2 });
  });

  it('keeps unmatched findings in a general review group', () => {
    expect(groupDiagramDiagnostics([{ level: 'warning', message: 'A new diagnostic class.' }])[0]?.key).toBe('other');
  });
});
