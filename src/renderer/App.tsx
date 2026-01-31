import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc, TRPCProvider } from './trpc/client'
import { useQueryClient } from '@tanstack/react-query'
import { useSettingsStore } from './stores/settingsStore'
import { useProjectStore } from './stores/projectStore'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ConfirmDialog } from './components/ConfirmDialog'
import { FolderOpen, Settings, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { clsx } from 'clsx'
import i18n from './i18n'

type Page = 'home' | 'settings' | 'project'

interface EditCliDialogProps {
  projectName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  cliNames: string[]
  onLink: (cliName: string) => void
  onUnlink: (cliName: string) => void
}

function EditCliDialog({ projectName, open, onOpenChange, cliNames, onLink, onUnlink }: EditCliDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const projectQuery = trpc.projects.get.useQuery(
    { name: projectName! },
    { enabled: !!projectName && open }
  )
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null)

  const linkedClis = projectQuery.data ? Object.keys(projectQuery.data.linkedCLIs) : []

  const handleToggle = async (cliName: string, isLinked: boolean) => {
    if (isLinked) {
      setConfirmUnlink(cliName)
    } else {
      onLink(cliName)
      setTimeout(() => queryClient.invalidateQueries(), 100)
    }
  }

  const handleConfirmUnlink = () => {
    if (confirmUnlink) {
      onUnlink(confirmUnlink)
      setTimeout(() => queryClient.invalidateQueries(), 100)
      setConfirmUnlink(null)
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-xl p-6 w-96 border border-app-border shadow-2xl animate-slide-in">
            <Dialog.Title className="text-lg font-semibold text-app-text mb-4">
              {t('editCli.title', { projectName })}
            </Dialog.Title>

            {projectQuery.isLoading ? (
              <p className="text-app-text-muted">{t('editCli.loading')}</p>
            ) : cliNames.length === 0 ? (
              <p className="text-app-text-muted">{t('editCli.noClisRegistered')}</p>
            ) : (
              <div className="space-y-2 mb-4">
                {cliNames.map((cli) => {
                  const isLinked = linkedClis.some(l => l.toLowerCase() === cli.toLowerCase())
                  return (
                    <label key={cli} className="flex items-center gap-3 p-2 rounded-md hover:bg-app-surface-hover cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={() => handleToggle(cli, isLinked)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      <span className={clsx('text-sm', isLinked ? 'text-app-text' : 'text-app-text-muted')}>
                        {cli}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors">
                  {t('editCli.done')}
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 text-app-text-muted hover:text-app-text transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={!!confirmUnlink}
        onOpenChange={(open) => !open && setConfirmUnlink(null)}
        title={t('dialog.confirm')}
        description={t('editCli.unlinkConfirm')}
        variant="danger"
        confirmLabel={t('dialog.delete')}
        onConfirm={handleConfirmUnlink}
      />
    </>
  )
}

function Sidebar({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const { t } = useTranslation()
  const navItems = [
    { id: 'home' as const, labelKey: 'nav.projects', icon: FolderOpen },
    { id: 'settings' as const, labelKey: 'nav.settings', icon: Settings }
  ]

  return (
    <nav className="w-52 bg-app-surface border-r border-app-border flex flex-col">
      <div className="px-4 py-4">
        <h2 className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
          {t('nav.configManager')}
        </h2>
      </div>
      <div className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-app-text-muted hover:bg-app-surface-hover hover:text-app-text'
              )}
            >
              <Icon size={18} />
              {t(item.labelKey)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t } = useTranslation()
  const { projects, setProjects, setCurrentProjectName } = useProjectStore()
  const { settings } = useSettingsStore()
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedClis, setSelectedClis] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null)

  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    onSuccess: setProjects
  })

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      projectsQuery.refetch()
      setShowCreateDialog(false)
      setNewProjectName('')
      setSelectedClis([])
    }
  })

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => projectsQuery.refetch()
  })

  const linkCliMutation = trpc.projects.linkCli.useMutation({
    onSuccess: () => projectsQuery.refetch()
  })

  const unlinkCliMutation = trpc.projects.unlinkCli.useMutation({
    onSuccess: () => projectsQuery.refetch()
  })

  const cliNames = settings ? Object.keys(settings.cliRegistry) : []
  const canCreate = cliNames.length > 0

  return (
    <div className="flex-1 p-6 bg-app-bg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-app-text">{t('home.title')}</h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={!canCreate}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('home.newProject')}
        </button>
      </div>

      {!canCreate && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4 text-sm">
          {t('home.configureCliFirst')}
        </div>
      )}

      {projects.length === 0 ? (
        <p className="text-app-text-muted">{t('home.noProjects')}</p>
      ) : (
        <div className="grid gap-3">
          {projects.map((name) => (
            <div key={name} className="bg-app-surface rounded-lg p-4 flex justify-between items-center border border-app-border">
              <span className="font-medium text-app-text">{name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentProjectName(name)
                    onNavigate('project')
                  }}
                  className="px-3 py-1.5 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors"
                >
                  {t('home.open')}
                </button>
                <button
                  onClick={() => {
                    setEditingProjectName(name)
                    setShowEditDialog(true)
                  }}
                  className="px-3 py-1.5 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors"
                >
                  {t('home.edit')}
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ name })}
                  className="px-3 py-1.5 bg-danger-surface text-danger rounded-md text-sm hover:bg-danger/20 transition-colors"
                >
                  {t('home.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-xl p-6 w-96 border border-app-border shadow-2xl animate-slide-in">
            <Dialog.Title className="text-lg font-semibold text-app-text mb-4">{t('createProject.title')}</Dialog.Title>
            <input
              type="text"
              placeholder={t('createProject.namePlaceholder')}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text placeholder:text-app-text-muted mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mb-4">
              <p className="text-sm text-app-text-muted mb-2">{t('createProject.selectClis')}</p>
              {cliNames.map((cli) => (
                <label key={cli} className="flex items-center gap-2 mb-2 text-sm text-app-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClis.includes(cli)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClis([...selectedClis, cli])
                      } else {
                        setSelectedClis(selectedClis.filter((c) => c !== cli))
                      }
                    }}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  {cli}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors">
                  {t('createProject.cancel')}
                </button>
              </Dialog.Close>
              <button
                onClick={() => createMutation.mutate({ name: newProjectName, cliNames: selectedClis })}
                disabled={!newProjectName.trim() || selectedClis.length === 0}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {t('createProject.create')}
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 text-app-text-muted hover:text-app-text transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit CLI Dialog */}
      <EditCliDialog
        projectName={editingProjectName}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        cliNames={cliNames}
        onLink={(cliName) => linkCliMutation.mutate({ projectName: editingProjectName!, cliName })}
        onUnlink={(cliName) => unlinkCliMutation.mutate({ projectName: editingProjectName!, cliName })}
      />
    </div>
  )
}

function SettingsPage() {
  const { t } = useTranslation()
  const { settings, setSettings } = useSettingsStore()
  const [newCliName, setNewCliName] = useState('')
  const [newCliPath, setNewCliPath] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingIgnore, setEditingIgnore] = useState(false)
  const [ignoreText, setIgnoreText] = useState('')

  const settingsQuery = trpc.settings.get.useQuery(undefined, {
    onSuccess: setSettings
  })

  const addCliMutation = trpc.settings.addCli.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        settingsQuery.refetch()
        setShowAddDialog(false)
        setNewCliName('')
        setNewCliPath('')
      }
    }
  })

  const removeCliMutation = trpc.settings.removeCli.useMutation({
    onSuccess: () => settingsQuery.refetch()
  })

  const updateIgnoreMutation = trpc.settings.updateIgnoreRules.useMutation({
    onSuccess: () => {
      settingsQuery.refetch()
      setEditingIgnore(false)
    }
  })

  const updateLanguageMutation = trpc.settings.updateLanguage.useMutation({
    onSuccess: () => settingsQuery.refetch()
  })

  const handleLanguageChange = (lang: 'zh-CN' | 'en-US') => {
    i18n.changeLanguage(lang)
    updateLanguageMutation.mutate({ language: lang })
  }

  if (!settings) return <div className="flex-1 p-6 bg-app-bg text-app-text-muted">{t('editCli.loading')}</div>

  return (
    <div className="flex-1 p-6 overflow-auto bg-app-bg">
      <h1 className="text-xl font-semibold text-app-text mb-6">{t('settings.title')}</h1>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-app-text">{t('settings.language')}</h2>
        </div>
        <select
          value={settings.language || 'zh-CN'}
          onChange={(e) => handleLanguageChange(e.target.value as 'zh-CN' | 'en-US')}
          className="px-3 py-2 bg-app-surface border border-app-border rounded-md text-app-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </section>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-app-text">{t('settings.cliRegistry')}</h2>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors"
          >
            {t('settings.addCli')}
          </button>
        </div>

        {Object.entries(settings.cliRegistry).length === 0 ? (
          <p className="text-app-text-muted">{t('settings.noClisRegistered')}</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(settings.cliRegistry).map(([name, { installPath }]) => (
              <div key={name} className="bg-app-surface rounded-lg p-3 flex justify-between items-center border border-app-border">
                <div>
                  <span className="font-medium text-app-text">{name}</span>
                  <span className="text-app-text-muted text-sm ml-2">{installPath}</span>
                </div>
                <button
                  onClick={() => removeCliMutation.mutate({ name })}
                  className="text-danger hover:text-red-400 transition-colors text-sm"
                >
                  {t('settings.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-app-text">{t('settings.globalIgnoreRules')}</h2>
          <button
            onClick={() => {
              setIgnoreText(settings.ignoreRules.global.join('\n'))
              setEditingIgnore(true)
            }}
            className="px-3 py-1.5 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors"
          >
            {t('settings.edit')}
          </button>
        </div>
        <div className="bg-app-surface rounded-lg p-3 font-mono text-sm border border-app-border">
          {settings.ignoreRules.global.map((rule, i) => (
            <div key={i} className="text-app-text-muted">{rule}</div>
          ))}
        </div>
      </section>

      <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-xl p-6 w-96 border border-app-border shadow-2xl animate-slide-in">
            <Dialog.Title className="text-lg font-semibold text-app-text mb-4">{t('addCli.title')}</Dialog.Title>
            <input
              type="text"
              placeholder={t('addCli.namePlaceholder')}
              value={newCliName}
              onChange={(e) => setNewCliName(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text placeholder:text-app-text-muted mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder={t('addCli.pathPlaceholder')}
              value={newCliPath}
              onChange={(e) => setNewCliPath(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text placeholder:text-app-text-muted mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors">
                  {t('addCli.cancel')}
                </button>
              </Dialog.Close>
              <button
                onClick={() => addCliMutation.mutate({ name: newCliName, installPath: newCliPath })}
                disabled={!newCliName.trim() || !newCliPath.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {t('addCli.add')}
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 text-app-text-muted hover:text-app-text transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={editingIgnore} onOpenChange={setEditingIgnore}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-xl p-6 w-[500px] border border-app-border shadow-2xl animate-slide-in">
            <Dialog.Title className="text-lg font-semibold text-app-text mb-4">{t('editIgnore.title')}</Dialog.Title>
            <textarea
              value={ignoreText}
              onChange={(e) => setIgnoreText(e.target.value)}
              className="w-full h-48 px-3 py-2 bg-app-bg border border-app-border rounded-md font-mono text-sm text-app-text placeholder:text-app-text-muted mb-4 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder={t('editIgnore.placeholder')}
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors">
                  {t('editIgnore.cancel')}
                </button>
              </Dialog.Close>
              <button
                onClick={() => updateIgnoreMutation.mutate({
                  global: ignoreText.split('\n').filter(Boolean)
                })}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors"
              >
                {t('editIgnore.save')}
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 text-app-text-muted hover:text-app-text transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { settings, setSettings } = useSettingsStore()

  trpc.settings.get.useQuery(undefined, {
    onSuccess: (data) => {
      setSettings(data)
      if (data.language && data.language !== i18n.language) {
        i18n.changeLanguage(data.language)
      }
    }
  })

  return (
    <div className="h-screen w-full bg-app-bg text-app-text flex overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
      {currentPage === 'settings' && <SettingsPage />}
      {currentPage === 'project' && <ProjectDetailPage />}
    </div>
  )
}

function App() {
  return (
    <TRPCProvider>
      <AppContent />
    </TRPCProvider>
  )
}

export default App
