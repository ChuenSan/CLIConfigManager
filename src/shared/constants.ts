// Thresholds - shared between main and renderer
export const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024 // 100MB
export const EDITOR_READONLY_THRESHOLD = 10 * 1024 * 1024 // 10MB
export const MAX_SNAPSHOTS_PER_PROJECT = 5

// Default settings
export const DEFAULT_SETTINGS = {
  cliRegistry: {},
  ignoreRules: {
    global: [
      '# 1️⃣ 默认忽略所有内容',
      '**',
      '# 2️⃣ 放行需要保留的目录',
      '!agents/',
      '!agents/**',
      '!commands/',
      '!commands/**',
      '!plugins/',
      '!plugins/**',
      '!skills/',
      '!skills/**',
      '!prompts/',
      '!prompts/**',
      '# 3️⃣ 放行需要保留的文件',
      '!auth.json',
      '!settings.json',
      '!config.toml',
      '!CLAUDE.md',
      '# 4️⃣ 明确忽略的杂项 / 工作目录',
      '**/*.log',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/tmp/',
      '**/bin/',
      '**/todos/',
      '**/backup/',
      '**/cache/',
      '**/debug/',
      '**/downloads/',
      '**/file-history/',
      '**/ide/',
      '**/plans/',
      '**/projects/',
      '**/session-env/',
      '**/shell-snapshots/',
      '**/statsig/',
      '**/telemetry/'
    ],
    perCli: {}
  },
  language: 'zh-CN' as const
}
