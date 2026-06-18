import {
  formatSourceLocation,
  formatSourceLocations,
  resolveRiskSourceLocations,
} from '../../utils/sourceLocation';

describe('sourceLocation utils', () => {
  it('formatSourceLocation includes line numbers when present', () => {
    expect(formatSourceLocation({ file: 'src/db.py', line_numbers: '42' })).toBe('src/db.py:42');
    expect(formatSourceLocation({ file: 'src/db.py' })).toBe('src/db.py');
  });

  it('formatSourceLocations deduplicates and joins with semicolons', () => {
    const formatted = formatSourceLocations([
      { file: 'a.ts', line_numbers: '1' },
      { file: 'a.ts', line_numbers: '1' },
      { file: 'b.ts' },
    ]);
    expect(formatted).toBe('a.ts:1; b.ts');
  });

  it('resolveRiskSourceLocations prefers risk-level locations', () => {
    const resolved = resolveRiskSourceLocations(
      { source_locations: [{ file: 'risk.ts' }], related_threats: ['T-1'] },
      [{ id: 'T-1', source_locations: [{ file: 'threat.ts' }] }],
    );
    expect(resolved).toEqual([{ file: 'risk.ts' }]);
  });

  it('resolveRiskSourceLocations falls back to related threat locations', () => {
    const resolved = resolveRiskSourceLocations(
      { related_threats: ['T-001', 'T-002'] },
      [
        { id: 'T-001', source_locations: [{ file: 'src/db.py', line_numbers: '42' }] },
        { id: 'T-002', source_locations: [{ file: 'src/api.py', line_numbers: '10' }] },
      ],
    );
    expect(formatSourceLocations(resolved)).toBe('src/db.py:42; src/api.py:10');
  });
});
