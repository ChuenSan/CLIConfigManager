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

  static isIgnored(ig: Ignore, relativePath: string): boolean {
    // Normalize path separators for cross-platform compatibility
    const normalized = relativePath.replace(/\\/g, '/')
    return ig.ignores(normalized)
  }

  static filterPaths(ig: Ignore, paths: string[]): string[] {
    return paths.filter(p => !this.isIgnored(ig, p))
  }
}
