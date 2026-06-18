/**
 * Source location formatting and risk-resolution helpers for threat model reports.
 */

export interface SourceLocation {
  file: string;
  line_numbers?: string;
  symbol?: string;
  snippet?: string;
}

export interface ThreatWithLocations {
  id: string;
  source_locations?: SourceLocation[];
}

export interface RiskWithLocations {
  source_locations?: SourceLocation[];
  related_threats?: string[];
}

function locationKey(loc: SourceLocation): string {
  const lines = (loc.line_numbers ?? '').trim();
  return `${loc.file}:${lines}`;
}

export function formatSourceLocation(loc: SourceLocation): string {
  const lines = (loc.line_numbers ?? '').trim();
  return lines ? `${loc.file}:${lines}` : loc.file;
}

export function formatSourceLocations(locs: SourceLocation[] | undefined | null): string {
  if (!locs?.length) return '';
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const loc of locs) {
    const key = locationKey(loc);
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(formatSourceLocation(loc));
  }
  return parts.join('; ');
}

export function resolveRiskSourceLocations(
  risk: RiskWithLocations,
  threats: ThreatWithLocations[] | undefined,
): SourceLocation[] {
  if (risk.source_locations?.length) {
    return risk.source_locations;
  }
  if (!risk.related_threats?.length || !threats?.length) {
    return [];
  }
  const byId = new Map(threats.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const merged: SourceLocation[] = [];
  for (const tid of risk.related_threats) {
    const threat = byId.get(tid);
    if (!threat?.source_locations?.length) continue;
    for (const loc of threat.source_locations) {
      const key = locationKey(loc);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(loc);
    }
  }
  return merged;
}
