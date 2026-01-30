import fs from 'fs/promises'
import path from 'path'
import { PROJECTS_DIR } from '../paths'
import { ProjectMeta, ProjectMetaSchema } from '@shared/types'
import { SettingsService } from './SettingsService'
import { SnapshotService } from './SnapshotService'

export class ProjectService {
  static async list(): Promise<string[]> {
    try {
      const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true })
      return entries.filter(e => e.isDirectory()).map(e => e.name)
    } catch {
      return []
    }
  }

  static getProjectPath(name: string): string {
    const sanitized = name.replace(/[<>:"/\\|?*]/g, '_')
    return path.join(PROJECTS_DIR, sanitized)
  }

  static async exists(name: string): Promise<boolean> {
    // Case-insensitive check (BR-14)
    const projects = await this.list()
    return projects.some(p => p.toLowerCase() === name.toLowerCase())
  }

  static async getMeta(name: string): Promise<ProjectMeta | null> {
    const projectPath = this.getProjectPath(name)
    const metaPath = path.join(projectPath, 'project.json')
    try {
      const content = await fs.readFile(metaPath, 'utf-8')
      return ProjectMetaSchema.parse(JSON.parse(content))
    } catch {
      return null
    }
  }

  static async create(name: string, cliNames: string[]): Promise<{ success: boolean; error?: string }> {
    // Validate name
    if (!name.trim()) {
      return { success: false, error: 'Project name cannot be empty' }
    }

    // Check for path traversal
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { success: false, error: 'Invalid project name' }
    }

    // Case-insensitive duplicate check
    if (await this.exists(name)) {
      return { success: false, error: 'Project already exists' }
    }

    // Validate CLIs are registered
    const settings = await SettingsService.read()
    const linkedCLIs: ProjectMeta['linkedCLIs'] = {}

    for (const cliName of cliNames) {
      const cliKey = Object.keys(settings.cliRegistry).find(
        k => k.toLowerCase() === cliName.toLowerCase()
      )
      if (!cliKey) {
        return { success: false, error: `CLI "${cliName}" is not registered` }
      }
      linkedCLIs[cliKey] = {
        snapshotInstallPath: settings.cliRegistry[cliKey].installPath
      }
    }

    // Create project directory
    const projectPath = this.getProjectPath(name)
    await fs.mkdir(projectPath, { recursive: true })
    await fs.mkdir(path.join(projectPath, 'backup'), { recursive: true })

    // Create CLI directories
    for (const cliKey of Object.keys(linkedCLIs)) {
      await fs.mkdir(path.join(projectPath, cliKey), { recursive: true })
    }

    // Write project.json
    const meta: ProjectMeta = {
      projectName: name,
      createdTime: SnapshotService.toUTC8ISOString(),
      linkedCLIs
    }
    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(meta, null, 2),
      'utf-8'
    )

    return { success: true }
  }

  static async delete(name: string): Promise<{ success: boolean }> {
    const projectPath = this.getProjectPath(name)
    try {
      await fs.rm(projectPath, { recursive: true, force: true })
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  static async linkCli(projectName: string, cliName: string): Promise<{ success: boolean; error?: string }> {
    const meta = await this.getMeta(projectName)
    if (!meta) {
      return { success: false, error: 'Project not found' }
    }

    const settings = await SettingsService.read()
    const cliKey = Object.keys(settings.cliRegistry).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) {
      return { success: false, error: 'CLI not registered' }
    }

    // Check if already linked
    if (Object.keys(meta.linkedCLIs).some(k => k.toLowerCase() === cliName.toLowerCase())) {
      return { success: false, error: 'CLI already linked' }
    }

    // Add to linkedCLIs
    meta.linkedCLIs[cliKey] = {
      snapshotInstallPath: settings.cliRegistry[cliKey].installPath
    }

    // Create CLI directory
    const projectPath = this.getProjectPath(projectName)
    await fs.mkdir(path.join(projectPath, cliKey), { recursive: true })

    // Update project.json
    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(meta, null, 2),
      'utf-8'
    )

    return { success: true }
  }

  static async unlinkCli(projectName: string, cliName: string): Promise<{ success: boolean }> {
    const meta = await this.getMeta(projectName)
    if (!meta) return { success: false }

    const cliKey = Object.keys(meta.linkedCLIs).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) return { success: true }

    // Remove from linkedCLIs
    delete meta.linkedCLIs[cliKey]

    // Delete CLI directory (but keep backups)
    const projectPath = this.getProjectPath(projectName)
    await fs.rm(path.join(projectPath, cliKey), { recursive: true, force: true })

    // Update project.json
    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(meta, null, 2),
      'utf-8'
    )

    return { success: true }
  }

  static async getWorkingCopyPath(projectName: string, cliName: string): Promise<{ path: string | null }> {
    const meta = await this.getMeta(projectName)
    if (!meta) return { path: null }

    const cliKey = Object.keys(meta.linkedCLIs).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) return { path: null }

    return { path: path.join(this.getProjectPath(projectName), cliKey) }
  }
}
