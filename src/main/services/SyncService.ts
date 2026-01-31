import fs from 'fs/promises'
import path from 'path'
import { Ignore } from 'ignore'
import { LARGE_FILE_THRESHOLD } from '@shared/constants'
import { FileNode, OperationResult } from '@shared/types'
import { ProjectService } from './ProjectService'
import { SettingsService } from './SettingsService'
import { IgnoreService } from './IgnoreService'
import { SnapshotService } from './SnapshotService'

const DEBUG = true
function debugLog(msg: string, data?: unknown) {
  if (DEBUG) console.log(`[SyncService] ${msg}`, data ?? '')
}

export interface LargeFileInfo {
  path: string
  size: number
}

export class SyncService {
  // Import: installPath -> Working Copy
  static async import(
    projectName: string,
    cliName: string,
    skipLargeFileCheck = false
  ): Promise<OperationResult & { largeFiles?: LargeFileInfo[] }> {
    const meta = await ProjectService.getMeta(projectName)
    if (!meta) return { success: false, errors: ['Project not found'] }

    const cliKey = Object.keys(meta.linkedCLIs).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) return { success: false, errors: ['CLI not linked to project'] }

    const installPath = meta.linkedCLIs[cliKey].snapshotInstallPath
    const workingCopy = path.join(ProjectService.getProjectPath(projectName), cliKey)

    // Compile ignore rules
    const settings = await SettingsService.read()
    const ig = IgnoreService.compile(cliKey, settings)

    // Check for large files first
    if (!skipLargeFileCheck) {
      const largeFiles = await this.findLargeFiles(installPath, ig)
      if (largeFiles.length > 0) {
        return { success: false, largeFiles, warnings: ['Large files detected'] }
      }
    }

    // Clear existing working copy
    await fs.rm(workingCopy, { recursive: true, force: true })
    await fs.mkdir(workingCopy, { recursive: true })

    // Copy files
    const warnings: string[] = []
    await this.copyWithIgnore(installPath, workingCopy, ig, '', warnings)

    return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
  }

  // Apply: Working Copy -> installPath (with auto-backup)
  static async apply(
    projectName: string,
    cliName: string,
    selectedPaths?: string[]
  ): Promise<OperationResult> {
    debugLog(`apply: project=${projectName}, cli=${cliName}, selectedPaths=${selectedPaths?.length ?? 'all'}`)

    const meta = await ProjectService.getMeta(projectName)
    if (!meta) return { success: false, errors: ['Project not found'] }

    const cliKey = Object.keys(meta.linkedCLIs).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) return { success: false, errors: ['CLI not linked to project'] }

    const installPath = meta.linkedCLIs[cliKey].snapshotInstallPath
    const workingCopy = path.join(ProjectService.getProjectPath(projectName), cliKey)

    debugLog(`installPath: ${installPath} (len=${installPath.length})`)
    debugLog(`workingCopy: ${workingCopy} (len=${workingCopy.length})`)

    // Compile ignore rules
    const settings = await SettingsService.read()
    const ig = IgnoreService.compile(cliKey, settings)

    // Step 1: Create auto-backup (BR-05)
    const snapshotType = selectedPaths ? 'partial' : 'full'
    const backupResult = await SnapshotService.create(
      {
        projectName,
        cliNames: [cliKey],
        snapshotType,
        source: 'auto-apply-backup'
      },
      () => installPath
    )

    if (!backupResult.success) {
      return { success: false, errors: [`Backup failed: ${backupResult.error}`] }
    }

    // Step 2: Apply changes
    try {
      const warnings: string[] = []

      if (selectedPaths && selectedPaths.length > 0) {
        // Partial apply: only selected paths
        for (const relPath of selectedPaths) {
          if (IgnoreService.isIgnored(ig, relPath)) continue

          const srcPath = path.join(workingCopy, relPath)
          const destPath = path.join(installPath, relPath)

          const stat = await fs.stat(srcPath)
          if (stat.isDirectory()) {
            await this.copyWithIgnore(srcPath, destPath, ig, relPath, warnings)
          } else {
            await fs.mkdir(path.dirname(destPath), { recursive: true })
            await this.safeCopyFile(srcPath, destPath, relPath)
          }
        }
      } else {
        // Full apply
        await this.copyWithIgnore(workingCopy, installPath, ig, '', warnings)
      }

      return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
    } catch (error) {
      // Step 3: Auto-rollback on failure (BR-12)
      const err = error as NodeJS.ErrnoException
      debugLog(`Apply FAILED, starting rollback...`)
      debugLog(`Error: ${err.code} - ${err.message}`)
      debugLog(`Error details:`, {
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
        path: err.path,
        dest: (err as { dest?: string }).dest
      })

      const snapshotPath = SnapshotService.getSnapshotPath(projectName, backupResult.timestamp!)
      const backupCliPath = path.join(snapshotPath, cliKey)

      try {
        await fs.rm(installPath, { recursive: true, force: true })
        await this.copyDirectory(backupCliPath, installPath)
        debugLog(`Rollback SUCCESS`)
      } catch (rollbackErr) {
        debugLog(`Rollback FAILED:`, rollbackErr)
      }

      const errMsg = err.code === 'EPERM'
        ? `EPERM: 权限被拒绝，文件可能被占用或只读\n源: ${err.path}\n目标: ${(err as { dest?: string }).dest}`
        : (error instanceof Error ? error.message : 'Unknown error')

      return {
        success: false,
        errors: [`Apply failed and rolled back: ${errMsg}`]
      }
    }
  }

  // Restore: Snapshot -> installPath
  static async restore(
    projectName: string,
    timestamp: string,
    cliName?: string
  ): Promise<OperationResult> {
    const snapshotMeta = await SnapshotService.getMeta(projectName, timestamp)
    if (!snapshotMeta) return { success: false, errors: ['Snapshot not found'] }

    // Check partial snapshot constraint (BR-10)
    if (snapshotMeta.snapshotType === 'partial' && !cliName) {
      return { success: false, errors: ['Partial snapshot cannot restore entire project'] }
    }

    const meta = await ProjectService.getMeta(projectName)
    if (!meta) return { success: false, errors: ['Project not found'] }

    const snapshotPath = SnapshotService.getSnapshotPath(projectName, timestamp)
    const clisToRestore = cliName
      ? [cliName]
      : snapshotMeta.includedCLIs

    const errors: string[] = []

    for (const cli of clisToRestore) {
      const cliKey = Object.keys(meta.linkedCLIs).find(
        k => k.toLowerCase() === cli.toLowerCase()
      )
      if (!cliKey) {
        errors.push(`CLI "${cli}" not linked to project`)
        continue
      }

      const installPath = meta.linkedCLIs[cliKey].snapshotInstallPath
      const backupCliPath = path.join(snapshotPath, cliKey)

      try {
        // Restore ignores current ignore rules (BR-08)
        await fs.rm(installPath, { recursive: true, force: true })
        await fs.mkdir(installPath, { recursive: true })
        await this.copyDirectory(backupCliPath, installPath)
      } catch (error) {
        errors.push(`Failed to restore ${cli}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  // List directory for ColumnView
  static async listDir(dirPath: string): Promise<FileNode[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes: FileNode[] = []

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        let size: number | undefined

        if (entry.isFile()) {
          const stat = await fs.stat(fullPath)
          size = stat.size
        }

        nodes.push({
          name: entry.name,
          path: entry.name,
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
          size
        })
      }

      // Sort: directories first, then alphabetically
      return nodes.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    } catch {
      return []
    }
  }

  private static async findLargeFiles(dir: string, ig: Ignore, basePath = ''): Promise<LargeFileInfo[]> {
    const largeFiles: LargeFileInfo[] = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const relPath = basePath ? `${basePath}/${entry.name}` : entry.name

        if (IgnoreService.isIgnored(ig, relPath, entry.isDirectory())) continue
        if (entry.isSymbolicLink()) continue

        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          const subLarge = await this.findLargeFiles(fullPath, ig, relPath)
          largeFiles.push(...subLarge)
        } else {
          const stat = await fs.stat(fullPath)
          if (stat.size > LARGE_FILE_THRESHOLD) {
            largeFiles.push({ path: relPath, size: stat.size })
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return largeFiles
  }

  private static async copyWithIgnore(
    src: string,
    dest: string,
    ig: Ignore,
    basePath: string,
    warnings: string[]
  ): Promise<void> {
    debugLog(`copyWithIgnore: ${src} -> ${dest}`)
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const relPath = basePath ? `${basePath}/${entry.name}` : entry.name
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      // Check ignore rules
      if (IgnoreService.isIgnored(ig, relPath, entry.isDirectory())) continue

      // Skip symlinks (BR-13)
      if (entry.isSymbolicLink()) {
        warnings.push(`Skipped symlink: ${relPath}`)
        continue
      }

      if (entry.isDirectory()) {
        await this.copyWithIgnore(srcPath, destPath, ig, relPath, warnings)
      } else {
        await this.safeCopyFile(srcPath, destPath, relPath)
      }
    }
  }

  private static async safeCopyFile(src: string, dest: string, relPath: string): Promise<void> {
    debugLog(`Copying file: ${relPath}`)
    debugLog(`  src: ${src} (len=${src.length})`)
    debugLog(`  dest: ${dest} (len=${dest.length})`)

    const maxRetries = 3
    const retryDelay = 500

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check source file stats
        const srcStat = await fs.stat(src)
        debugLog(`  srcStat: size=${srcStat.size}, mode=${srcStat.mode.toString(8)}`)

        // Check if dest exists
        try {
          const destStat = await fs.stat(dest)
          debugLog(`  destStat: size=${destStat.size}, mode=${destStat.mode.toString(8)}`)
          // Try to remove readonly attribute on Windows
          if (process.platform === 'win32') {
            await fs.chmod(dest, 0o666)
            debugLog(`  Removed readonly from dest`)
          }
        } catch {
          debugLog(`  dest does not exist (OK)`)
        }

        await fs.copyFile(src, dest)
        debugLog(`  Copy SUCCESS`)
        return
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        debugLog(`  Copy FAILED (attempt ${attempt}/${maxRetries}): ${err.code} - ${err.message}`)
        debugLog(`  Error details:`, {
          code: err.code,
          errno: err.errno,
          syscall: err.syscall,
          path: err.path,
          dest: err.dest
        })

        if (attempt < maxRetries && (err.code === 'EPERM' || err.code === 'EBUSY')) {
          debugLog(`  Retrying in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          throw error
        }
      }
    }
  }

  private static async copyDirectory(src: string, dest: string): Promise<void> {
    debugLog(`copyDirectory: ${src} -> ${dest}`)
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isSymbolicLink()) continue

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await this.safeCopyFile(srcPath, destPath, entry.name)
      }
    }
  }
}
