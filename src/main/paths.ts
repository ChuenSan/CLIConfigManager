import { app } from 'electron'
import path from 'path'

// Workspace location: %APPDATA%/CLIConfigManager/
export const WORKSPACE_ROOT = path.join(app.getPath('appData'), 'CLIConfigManager')
export const SETTINGS_FILE = path.join(WORKSPACE_ROOT, 'settings.json')
export const PROJECTS_DIR = path.join(WORKSPACE_ROOT, 'Projects')
