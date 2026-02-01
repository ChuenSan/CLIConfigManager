import { z } from 'zod'
import { router, publicProcedure } from './context'
import { SettingsService } from '../services/SettingsService'
import { ProjectService } from '../services/ProjectService'
import { SnapshotService } from '../services/SnapshotService'
import { SyncService } from '../services/SyncService'

export const appRouter = router({
  // Settings procedures
  settings: router({
    get: publicProcedure.query(async () => {
      return SettingsService.read()
    }),

    addCli: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        installPath: z.string().min(1)
      }))
      .mutation(async ({ input }) => {
        return SettingsService.addCli(input.name, input.installPath)
      }),

    removeCli: publicProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input }) => {
        return SettingsService.removeCli(input.name)
      }),

    updateIgnoreRules: publicProcedure
      .input(z.object({
        global: z.array(z.string()).optional(),
        perCli: z.record(z.string(), z.array(z.string())).optional()
      }))
      .mutation(async ({ input }) => {
        return SettingsService.updateIgnoreRules(input)
      }),

    updateLanguage: publicProcedure
      .input(z.object({
        language: z.enum(['zh-CN', 'en-US'])
      }))
      .mutation(async ({ input }) => {
        return SettingsService.updateLanguage(input.language)
      }),

    addAdditionalPath: publicProcedure
      .input(z.object({
        cliName: z.string(),
        alias: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
        path: z.string().min(1)
      }))
      .mutation(async ({ input }) => {
        return SettingsService.addAdditionalPath(input.cliName, {
          alias: input.alias,
          path: input.path
        })
      }),

    removeAdditionalPath: publicProcedure
      .input(z.object({
        cliName: z.string(),
        alias: z.string()
      }))
      .mutation(async ({ input }) => {
        return SettingsService.removeAdditionalPath(input.cliName, input.alias)
      })
  }),

  // Projects procedures
  projects: router({
    list: publicProcedure.query(async () => {
      return ProjectService.list()
    }),

    get: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        return ProjectService.getMeta(input.name)
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        cliNames: z.array(z.string())
      }))
      .mutation(async ({ input }) => {
        return ProjectService.create(input.name, input.cliNames)
      }),

    delete: publicProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input }) => {
        return ProjectService.delete(input.name)
      }),

    linkCli: publicProcedure
      .input(z.object({
        projectName: z.string(),
        cliName: z.string()
      }))
      .mutation(async ({ input }) => {
        return ProjectService.linkCli(input.projectName, input.cliName)
      }),

    unlinkCli: publicProcedure
      .input(z.object({
        projectName: z.string(),
        cliName: z.string()
      }))
      .mutation(async ({ input }) => {
        return ProjectService.unlinkCli(input.projectName, input.cliName)
      }),

    getWorkingCopyPath: publicProcedure
      .input(z.object({
        projectName: z.string(),
        cliName: z.string()
      }))
      .query(async ({ input }) => {
        return ProjectService.getWorkingCopyPath(input.projectName, input.cliName)
      })
  }),

  // File operations procedures
  fileOps: router({
    import: publicProcedure
      .input(z.object({
        projectName: z.string(),
        cliName: z.string(),
        skipLargeFileCheck: z.boolean().optional()
      }))
      .mutation(async ({ input }) => {
        return SyncService.import(input.projectName, input.cliName, input.skipLargeFileCheck)
      }),

    apply: publicProcedure
      .input(z.object({
        projectName: z.string(),
        cliName: z.string(),
        selectedPaths: z.array(z.string()).optional()
      }))
      .mutation(async ({ input }) => {
        return SyncService.apply(input.projectName, input.cliName, input.selectedPaths)
      }),

    restore: publicProcedure
      .input(z.object({
        projectName: z.string(),
        timestamp: z.string(),
        cliName: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        return SyncService.restore(input.projectName, input.timestamp, input.cliName)
      }),

    backup: publicProcedure
      .input(z.object({
        projectName: z.string(),
        cliNames: z.array(z.string()),
        notes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const meta = await ProjectService.getMeta(input.projectName)
        if (!meta) return { success: false, error: 'Project not found' }

        // Build additionalFilesMap from settings (use latest additionalPaths)
        const settings = await SettingsService.read()
        const additionalFilesMap: Record<string, Array<{ alias: string; path: string }>> = {}
        for (const cli of input.cliNames) {
          const additionalPaths = settings.cliRegistry[cli]?.additionalPaths
          if (additionalPaths) {
            additionalFilesMap[cli] = additionalPaths
          }
        }

        return SnapshotService.create(
          {
            projectName: input.projectName,
            cliNames: input.cliNames,
            snapshotType: 'full',
            source: 'manual-backup',
            notes: input.notes
          },
          (cli) => meta.linkedCLIs[cli]?.snapshotInstallPath || '',
          additionalFilesMap
        )
      }),

    listSnapshots: publicProcedure
      .input(z.object({ projectName: z.string() }))
      .query(async ({ input }) => {
        return SnapshotService.list(input.projectName)
      }),

    deleteSnapshot: publicProcedure
      .input(z.object({
        projectName: z.string(),
        timestamp: z.string()
      }))
      .mutation(async ({ input }) => {
        return SnapshotService.delete(input.projectName, input.timestamp)
      })
  }),

  // File system procedures (for ColumnView)
  fs: router({
    listDir: publicProcedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => {
        return SyncService.listDir(input.path)
      }),

    readFile: publicProcedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => {
        const fs = await import('fs/promises')
        try {
          const stat = await fs.stat(input.path)
          const content = await fs.readFile(input.path, 'utf-8')
          return { success: true, content, size: stat.size }
        } catch (error) {
          return { success: false, error: 'Failed to read file' }
        }
      }),

    writeFile: publicProcedure
      .input(z.object({
        path: z.string(),
        content: z.string()
      }))
      .mutation(async ({ input }) => {
        const fs = await import('fs/promises')
        try {
          await fs.writeFile(input.path, input.content, 'utf-8')
          return { success: true }
        } catch (error) {
          return { success: false, error: 'Failed to write file' }
        }
      }),

    deleteFile: publicProcedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ input }) => {
        const fs = await import('fs/promises')
        try {
          const stat = await fs.stat(input.path)
          if (stat.isDirectory()) {
            await fs.rm(input.path, { recursive: true, force: true })
          } else {
            await fs.unlink(input.path)
          }
          return { success: true }
        } catch (error) {
          return { success: false, error: 'Failed to delete' }
        }
      }),

    createFile: publicProcedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ input }) => {
        const fs = await import('fs/promises')
        try {
          await fs.access(input.path)
          return { success: false, error: 'File already exists' }
        } catch {
          // File doesn't exist, proceed
        }
        try {
          await fs.writeFile(input.path, '', 'utf-8')
          return { success: true }
        } catch (error) {
          return { success: false, error: 'Failed to create file' }
        }
      }),

    createFolder: publicProcedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ input }) => {
        const fs = await import('fs/promises')
        try {
          await fs.access(input.path)
          return { success: false, error: 'Folder already exists' }
        } catch {
          // Folder doesn't exist, proceed
        }
        try {
          await fs.mkdir(input.path)
          return { success: true }
        } catch (error) {
          return { success: false, error: 'Failed to create folder' }
        }
      }),

    rename: publicProcedure
      .input(z.object({
        oldPath: z.string(),
        newName: z.string()
      }))
      .mutation(async ({ input }) => {
        const fs = await import('fs/promises')
        const path = await import('path')

        // Validate new name
        if (!input.newName.trim()) {
          return { success: false, error: 'Name cannot be empty' }
        }
        if (/[<>:"/\\|?*]/.test(input.newName) || input.newName.includes('..')) {
          return { success: false, error: 'Invalid characters in name' }
        }

        const dir = path.dirname(input.oldPath)
        const newPath = path.join(dir, input.newName)

        // Check if target exists
        try {
          await fs.access(newPath)
          return { success: false, error: 'A file with this name already exists' }
        } catch {
          // Target doesn't exist, proceed
        }

        try {
          await fs.rename(input.oldPath, newPath)
          return { success: true, newPath }
        } catch (error) {
          return { success: false, error: 'Failed to rename' }
        }
      })
  }),

  // Health check
  ping: publicProcedure.query(() => 'pong')
})

export type AppRouter = typeof appRouter
