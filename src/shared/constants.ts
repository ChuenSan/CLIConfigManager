// Thresholds - shared between main and renderer
export const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024 // 100MB
export const EDITOR_READONLY_THRESHOLD = 10 * 1024 * 1024 // 10MB
export const MAX_SNAPSHOTS_PER_PROJECT = 5

// Default settings
export const DEFAULT_SETTINGS = {
  cliRegistry: {},
  ignoreRules: {
    global: ['**/*.log', '**/.DS_Store', '**/Thumbs.db', '**/tmp/'],
    perCli: {}
  }
}
