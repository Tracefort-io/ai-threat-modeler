import type { SourceLocation, Threat } from '@/types/threatModel'
import type { Risk } from '@/types/threatModel'
import type { ThreatModelingJob } from '@/types/threatModelingJob'

function locationKey(loc: SourceLocation): string {
  const lines = (loc.line_numbers ?? '').trim()
  return `${loc.file}:${lines}`
}

export function formatSourceLocation(loc: SourceLocation): string {
  const lines = (loc.line_numbers ?? '').trim()
  return lines ? `${loc.file}:${lines}` : loc.file
}

export function formatSourceLocations(locs: SourceLocation[] | undefined | null): string {
  if (!locs?.length) return ''
  const seen = new Set<string>()
  const parts: string[] = []
  for (const loc of locs) {
    const key = locationKey(loc)
    if (seen.has(key)) continue
    seen.add(key)
    parts.push(formatSourceLocation(loc))
  }
  return parts.join('; ')
}

export function resolveRiskSourceLocations(
  risk: Pick<Risk, 'source_locations' | 'related_threats'>,
  threats: Threat[] | undefined,
): SourceLocation[] {
  if (risk.source_locations?.length) {
    return risk.source_locations
  }
  if (!risk.related_threats?.length || !threats?.length) {
    return []
  }
  const byId = new Map(threats.map((t) => [t.id, t]))
  const seen = new Set<string>()
  const merged: SourceLocation[] = []
  for (const tid of risk.related_threats) {
    const threat = byId.get(tid)
    if (!threat?.source_locations?.length) continue
    for (const loc of threat.source_locations) {
      const key = locationKey(loc)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(loc)
    }
  }
  return merged
}

function parseLineAnchor(lineNumbers: string | undefined): string {
  const raw = (lineNumbers ?? '').trim()
  if (!raw) return ''
  const rangeMatch = raw.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    return `#L${rangeMatch[1]}-L${rangeMatch[2]}`
  }
  const singleMatch = raw.match(/^(\d+)$/)
  if (singleMatch) {
    return `#L${singleMatch[1]}`
  }
  return ''
}

function stripSourceUrlSuffix(sourceUrl: string): string {
  const at = sourceUrl.lastIndexOf('@')
  if (at <= 'https://'.length) return sourceUrl
  return sourceUrl.slice(0, at)
}

export function buildSourceHref(
  job: Pick<
    ThreatModelingJob,
    'sourceType' | 'sourceUrl' | 'gitRef' | 'gitCommit' | 'gitBranch'
  >,
  loc: SourceLocation,
): string | null {
  if (job.sourceType !== 'github' || !job.sourceUrl) {
    return null
  }
  const baseRepoUrl = stripSourceUrlSuffix(job.sourceUrl)
  const ref = job.gitCommit || job.gitRef || job.gitBranch || 'HEAD'
  const anchor = parseLineAnchor(loc.line_numbers)
  const filePath = loc.file.replace(/^\//, '')
  return `${baseRepoUrl}/blob/${ref}/${filePath}${anchor}`
}
