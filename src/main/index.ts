import { app, BrowserWindow } from 'electron'
import path from 'path'
import { createIPCHandler } from 'electron-trpc/main'
import { appRouter } from './trpc/router'
import { WorkspaceService } from './services/WorkspaceService'

let mainWindow: BrowserWindow | null = null

// Single instance lock (BR-16)
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    // Initialize workspace
    await WorkspaceService.init()

    // Create window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Set up tRPC IPC handler
    createIPCHandler({ router: appRouter, windows: [mainWindow] })

    // Load renderer
    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
