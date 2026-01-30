import fs from 'fs/promises'
import path from 'path'
import { SnapshotMeta, SnapshotMetaSchema } from '@shared/types'
import { MAX_SNAPSHOTS_PER_PROJECT } from '@shared/constants'
import { ProjectService } from './ProjectService'

export interface SnapshotOptions {
  projectName: string
  cliNames: string[]
  snapshotType: 'full' | 'partial'
  source: SnapshotMeta['source']
  notes?: string
}

export class SnapshotService {
  static generateTimestamp(): string {
    // Use UTC+8 timezone
    const now = new Date()
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const pad = (n: number, len: number) => n.toString().padStart(len, '0')
    return [
      utc8.getUTCFullYear(),
      pad(utc8.getUTCMonth() + 1, 2),
      pad(utc8.getUTCDate(), 2),
      pad(utc8.getUTCHours(), 2),
      pad(utc8.getUTCMinutes(), 2),
      pad(utc8.getUTCSeconds(), 2),
      pad(utc8.getUTCMilliseconds(), 3)
    ].join('')
  }

  static toUTC8ISOString(date: Date = new Date()): string {
    const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return utc8.toISOString().replace('Z', '+08:00')
  }

  static async list(projectName: string): Promise<SnapshotMeta[]> {
    const backupDir = path.join(ProjectService.getProjectPath(projectName), 'backup')
    try {
      const entries = await fs.readdir(backupDir, { withFileTypes: true })
      const snapshots: SnapshotMeta[] = []

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('bak')) {
          const metaPath = path.join(backupDir, entry.name, 'meta.json')
          try {
            const content = await fs.readFile(metaPath, 'utf-8')
            snapshots.push(SnapshotMetaSchema.parse(JSON.parse(content)))
          } catch {
            // Skip invalid snapshots
          }
        }
      }

      // Sort by timestamp descending (newest first)
      return snapshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    } catch {
      return []
    }
  }

  static async create(
    options: SnapshotOptions,
    sourceGetter: (cli: string) => string
  ): Promise<{ success: boolean; timestamp?: string; error?: string }> {
    const timestamp = this.generateTimestamp()
    const backupDir = path.join(ProjectService.getProjectPath(options.projectName), 'backup')
    const tempDir = path.join(backupDir, `bak${timestamp}.tmp`)
    const finalDir = path.join(backupDir, `bak${timestamp}`)

    try {
      await fs.mkdir(tempDir, { recursive: true })

      // Copy files for each CLI
      for (const cli of options.cliNames) {
        const sourcePath = sourceGetter(cli)
        const destPath = path.join(tempDir, cli)
        await this.copyDirectory(sourcePath, destPath)
      }

      // Write meta.json
      const meta: SnapshotMeta = {
        timestamp,
        snapshotType: options.snapshotType,
        includedCLIs: options.cliNames,
        source: options.source,
        createdTime: this.toUTC8ISOString(),
        notes: options.notes || ''
      }
      await fs.writeFile(
        path.join(tempDir, 'meta.json'),
        JSON.stringify(meta, null, 2),
        'utf-8'
      )

      // Atomic commit: rename temp to final
      await fs.rename(tempDir, finalDir)

      // Cleanup old snapshots (BR-18)
      await this.enforceRetention(options.projectName)

      return { success: true, timestamp }
    } catch (error) {
      // Rollback: delete temp directory
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backup failed'
      }
    }
  }

  static async delete(projectName: string, timestamp: string): Promise<{ success: boolean }> {
    const snapshotDir = path.join(
      ProjectService.getProjectPath(projectName),
      'backup',
      `bak${timestamp}`
    )
    try {
      await fs.rm(snapshotDir, { recursive: true, force: true })
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  static async getMeta(projectName: string, timestamp: string): Promise<SnapshotMeta | null> {
    const metaPath = path.join(
      ProjectService.getProjectPath(projectName),
      'backup',
      `bak${timestamp}`,
      'meta.json'
    )
    try {
      const content = await fs.readFile(metaPath, 'utf-8')
      return SnapshotMetaSchema.parse(JSON.parse(content))
    } catch {
      return null
    }
  }

  static getSnapshotPath(projectName: string, timestamp: string): string {
    return path.join(ProjectService.getProjectPath(projectName), 'backup', `bak${timestamp}`)
  }

  private static async enforceRetention(projectName: string): Promise<void> {
    const snapshots = await this.list(projectName)
    if (snapshots.length > MAX_SNAPSHOTS_PER_PROJECT) {
      // Delete oldest snapshots
      const toDelete = snapshots.slice(MAX_SNAPSHOTS_PER_PROJECT)
      for (const snapshot of toDelete) {
        await this.delete(projectName, snapshot.timestamp)
      }
    }
  }

  private static async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      // Skip symlinks (BR-13)
      if (entry.isSymbolicLink()) {
        continue
      }

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }
}
