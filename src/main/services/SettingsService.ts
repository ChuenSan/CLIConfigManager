import fs from 'fs/promises'
import { SETTINGS_FILE } from '../paths'
import { DEFAULT_SETTINGS } from '@shared/constants'
import { Settings, SettingsSchema, Language, AdditionalPath } from '@shared/types'

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

  static async updateLanguage(language: Language): Promise<{ success: boolean }> {
    const settings = await this.read()
    settings.language = language
    await this.write(settings)
    return { success: true }
  }

  static async addAdditionalPath(
    cliName: string,
    additionalPath: AdditionalPath
  ): Promise<{ success: boolean; error?: string }> {
    const settings = await this.read()

    const cliKey = Object.keys(settings.cliRegistry).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) {
      return { success: false, error: 'CLI not found' }
    }

    // Validate alias is not reserved
    if (additionalPath.alias.toLowerCase() === '_main') {
      return { success: false, error: 'Alias "_main" is reserved' }
    }

    const cli = settings.cliRegistry[cliKey]
    const existing = cli.additionalPaths || []

    // Check for duplicate alias
    if (existing.some(p => p.alias.toLowerCase() === additionalPath.alias.toLowerCase())) {
      return { success: false, error: 'Alias already exists' }
    }

    cli.additionalPaths = [...existing, additionalPath]
    await this.write(settings)
    return { success: true }
  }

  static async removeAdditionalPath(
    cliName: string,
    alias: string
  ): Promise<{ success: boolean }> {
    const settings = await this.read()

    const cliKey = Object.keys(settings.cliRegistry).find(
      k => k.toLowerCase() === cliName.toLowerCase()
    )
    if (!cliKey) return { success: false }

    const cli = settings.cliRegistry[cliKey]
    if (!cli.additionalPaths) return { success: true }

    cli.additionalPaths = cli.additionalPaths.filter(
      p => p.alias.toLowerCase() !== alias.toLowerCase()
    )
    if (cli.additionalPaths.length === 0) {
      delete cli.additionalPaths
    }

    await this.write(settings)
    return { success: true }
  }
}
