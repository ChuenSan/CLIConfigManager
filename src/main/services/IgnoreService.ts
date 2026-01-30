import ignore, { Ignore } from 'ignore'
import { Settings } from '@shared/types'

export class IgnoreService {
  static compile(cli: string, settings: Settings): Ignore {
    const ig = ignore()
    ig.add(settings.ignoreRules.global)
    const perCli = settings.ignoreRules.perCli[cli]
    if (perCli) {
      ig.add(perCli)
    }
    return ig
  }

  static isIgnored(ig: Ignore, relativePath: string, isDirectory = false): boolean {
    // Normalize path separators for cross-platform compatibility
    let normalized = relativePath.replace(/\\/g, '/')
    // For directories, append trailing slash to match rules like "**/bin/"
    if (isDirectory && !normalized.endsWith('/')) {
      normalized += '/'
    }
    return ig.ignores(normalized)
  }

  static filterPaths(ig: Ignore, paths: string[]): string[] {
    return paths.filter(p => !this.isIgnored(ig, p))
  }
}
