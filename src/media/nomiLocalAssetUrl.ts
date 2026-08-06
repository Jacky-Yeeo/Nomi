export type NomiLocalAssetTarget = {
  projectId: string
  relativePath: string
}

/**
 * Parse the ownership encoded in a local project asset URL.
 *
 * The URL is the authority for cross-project assets: an "All assets" card can
 * belong to a different project than the workbench that is currently open.
 */
export function parseNomiLocalAssetUrl(url: unknown): NomiLocalAssetTarget | null {
  if (typeof url !== 'string') return null
  const prefix = 'nomi-local://asset/'
  if (!url.startsWith(prefix)) return null
  const pathPart = url.slice(prefix.length).split(/[?#]/, 1)[0]
  const segments = pathPart.split('/').filter(Boolean)
  if (segments.length < 2) return null
  try {
    const projectId = decodeURIComponent(segments[0]).trim()
    const relativePath = segments.slice(1).map((segment) => decodeURIComponent(segment)).join('/').trim()
    return projectId && relativePath ? { projectId, relativePath } : null
  } catch {
    return null
  }
}
