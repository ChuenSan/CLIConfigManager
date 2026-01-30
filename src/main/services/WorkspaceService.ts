import fs from 'fs/promises'
import path from 'path'
import { WORKSPACE_ROOT, PROJECTS_DIR, SETTINGS_FILE } from '../paths'
import { DEFAULT_SETTINGS } from '@shared/constants'

export class WorkspaceService {
  static async init(): Promise<void> {
    // Create workspace directories
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true })
    await fs.mkdir(PROJECTS_DIR, { recursive: true })

    // Create default settings if not exists
    try {
      await fs.access(SETTINGS_FILE)
    } catch {
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8')
    }
  }

  static getWorkspaceRoot(): string {
    return WORKSPACE_ROOT
  }

  static getProjectsDir(): string {
    return PROJECTS_DIR
  }

  static getProjectPath(projectName: string): string {
    // Sanitize project name to prevent path traversal
    const sanitized = projectName.replace(/[<>:"/\\|?*]/g, '_')
    return path.join(PROJECTS_DIR, sanitized)
  }

  static async projectExists(projectName: string): Promise<boolean> {
    try {
      await fs.access(this.getProjectPath(projectName))
      return true
    } catch {
      return false
    }
  }
}
