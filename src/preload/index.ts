import { contextBridge } from 'electron'
import { exposeElectronTRPC } from 'electron-trpc/main'

process.once('loaded', () => {
  exposeElectronTRPC()
})
