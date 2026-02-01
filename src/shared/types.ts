import { z } from 'zod'

// Additional path entry
export const AdditionalPathSchema = z.object({
  alias: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, 'Alias must be alphanumeric with _ or -'),
  path: z.string().min(1)
})
export type AdditionalPath = z.infer<typeof AdditionalPathSchema>

// CLI Registry entry
export const CliEntrySchema = z.object({
  installPath: z.string().min(1),
  additionalPaths: z.array(AdditionalPathSchema).optional()
})
export type CliEntry = z.infer<typeof CliEntrySchema>

// Language type
export type Language = 'zh-CN' | 'en-US'

// Settings schema
export const SettingsSchema = z.object({
  cliRegistry: z.record(z.string(), CliEntrySchema),
  ignoreRules: z.object({
    global: z.array(z.string()),
    perCli: z.record(z.string(), z.array(z.string()))
  }),
  language: z.enum(['zh-CN', 'en-US']).default('zh-CN')
})
export type Settings = z.infer<typeof SettingsSchema>

// Project metadata
export const ProjectMetaSchema = z.object({
  projectName: z.string().min(1),
  createdTime: z.string(), // ISO 8601 UTC
  linkedCLIs: z.record(z.string(), z.object({
    snapshotInstallPath: z.string(),
    snapshotAdditionalPaths: z.array(AdditionalPathSchema).optional()
  }))
})
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>

// Snapshot metadata
export const SnapshotMetaSchema = z.object({
  timestamp: z.string().length(17), // yyyyMMddHHmmssSSS
  snapshotType: z.enum(['full', 'partial']),
  includedCLIs: z.array(z.string()),
  source: z.enum(['auto-apply-backup', 'manual-backup', 'pre-import-backup']),
  createdTime: z.string(), // ISO 8601 UTC
  notes: z.string()
})
export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>

// File tree node for ColumnView
export interface FileNode {
  name: string
  path: string // relative path
  isDirectory: boolean
  isSymlink: boolean
  size?: number
}

// Selection state for Apply
export interface SelectionState {
  overrides: Map<string, 'checked' | 'unchecked'>
}

// Operation result
export interface OperationResult {
  success: boolean
  message?: string
  warnings?: string[]
  errors?: string[]
}
