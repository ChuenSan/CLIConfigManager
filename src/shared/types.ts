import { z } from 'zod'

// CLI Registry entry
export const CliEntrySchema = z.object({
  installPath: z.string().min(1)
})
export type CliEntry = z.infer<typeof CliEntrySchema>

// Settings schema
export const SettingsSchema = z.object({
  cliRegistry: z.record(z.string(), CliEntrySchema),
  ignoreRules: z.object({
    global: z.array(z.string()),
    perCli: z.record(z.string(), z.array(z.string()))
  })
})
export type Settings = z.infer<typeof SettingsSchema>

// Project metadata
export const ProjectMetaSchema = z.object({
  projectName: z.string().min(1),
  createdTime: z.string(), // ISO 8601 UTC
  linkedCLIs: z.record(z.string(), z.object({
    snapshotInstallPath: z.string()
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
