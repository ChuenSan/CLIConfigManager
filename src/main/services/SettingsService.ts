import fs from 'fs/promises'
import { SETTINGS_FILE } from '../paths'
import { DEFAULT_SETTINGS } from '@shared/constants'
import { Settings, SettingsSchema } from '@shared/types'

export class SettingsService {
  private static cache: Settings | null = null

  static async read(): Promise<Settings> {
    if (this.cache) return this.cache

    try {
      const content = await fs.readFile(SETTINGS_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      this.cache = SettingsSchema.parse(parsed)
      return this.cache
    } catch {
      this.cache = DEFAULT_SETTINGS as Settings
      return this.cache
    }
  }

  static async write(settings: Settings): Promise<void> {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
    this.cache = settings
  }

  static async addCli(name: string, installPath: string): Promise<{ success: boolean; error?: string }> {
    const settings = await this.read()

    // Case-insensitive check (BR-14)
    const normalizedName = name.toLowerCase()
    const existingKey = Object.keys(settings.cliRegistry).find(
      k => k.toLowerCase() === normalizedName
    )

    if (existingKey) {
      return { success: false, error: 'CLI already exists (case-insensitive)' }
    }

    settings.cliRegistry[name] = { installPath }
    await this.write(settings)
    return { success: true }
  }

  static async removeCli(name: string): Promise<{ success: boolean }> {
    const settings = await this.read()

    // Case-insensitive find
    const key = Object.keys(settings.cliRegistry).find(
      k => k.toLowerCase() === name.toLowerCase()
    )

    if (key) {
      delete settings.cliRegistry[key]
      delete settings.ignoreRules.perCli[key]
      await this.write(settings)
    }

    return { success: true }
  }

  static async updateIgnoreRules(update: {
    global?: string[]
    perCli?: Record<string, string[]>
  }): Promise<{ success: boolean }> {
    const settings = await this.read()

    if (update.global) {
      settings.ignoreRules.global = update.global
    }
    if (update.perCli) {
      settings.ignoreRules.perCli = { ...settings.ignoreRules.perCli, ...update.perCli }
    }

    await this.write(settings)
    return { success: true }
  }
}
