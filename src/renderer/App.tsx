import { useState } from 'react'
import { trpc, TRPCProvider } from './trpc/client'
import { useSettingsStore } from './stores/settingsStore'
import { useProjectStore } from './stores/projectStore'
import { ProjectDetailPage } from './pages/ProjectDetailPage'

type Page = 'home' | 'settings' | 'project'

function Navigation({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="w-48 bg-gray-800 p-4 flex flex-col gap-2">
      <button
        onClick={() => onNavigate('home')}
        className={`text-left px-3 py-2 rounded ${currentPage === 'home' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
      >
        Projects
      </button>
      <button
        onClick={() => onNavigate('settings')}
        className={`text-left px-3 py-2 rounded ${currentPage === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
      >
        Settings
      </button>
    </nav>
  )
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { projects, setProjects, setCurrentProjectName } = useProjectStore()
  const { settings } = useSettingsStore()
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedClis, setSelectedClis] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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

  const cliNames = settings ? Object.keys(settings.cliRegistry) : []
  const canCreate = cliNames.length > 0

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={!canCreate}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New Project
        </button>
      </div>

      {!canCreate && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded p-4 mb-4">
          Please configure CLI paths in Settings before creating a project.
        </div>
      )}

      {projects.length === 0 ? (
        <p className="text-gray-400">No projects yet.</p>
      ) : (
        <div className="grid gap-4">
          {projects.map((name) => (
            <div key={name} className="bg-gray-800 rounded p-4 flex justify-between items-center">
              <span className="font-medium">{name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentProjectName(name)
                    onNavigate('project')
                  }}
                  className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Open
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ name })}
                  className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create Project</h2>
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded mb-4"
            />
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Select CLIs:</p>
              {cliNames.map((cli) => (
                <label key={cli} className="flex items-center gap-2 mb-1">
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
                  />
                  {cli}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate({ name: newProjectName, cliNames: selectedClis })}
                disabled={!newProjectName.trim() || selectedClis.length === 0}
                className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPage() {
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

  if (!settings) return <div className="flex-1 p-6">Loading...</div>

  return (
    <div className="flex-1 p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">CLI Registry</h2>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-3 py-1 bg-blue-600 rounded text-sm"
          >
            Add CLI
          </button>
        </div>

        {Object.entries(settings.cliRegistry).length === 0 ? (
          <p className="text-gray-400">No CLIs registered.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(settings.cliRegistry).map(([name, { installPath }]) => (
              <div key={name} className="bg-gray-800 rounded p-3 flex justify-between items-center">
                <div>
                  <span className="font-medium">{name}</span>
                  <span className="text-gray-400 text-sm ml-2">{installPath}</span>
                </div>
                <button
                  onClick={() => removeCliMutation.mutate({ name })}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Global Ignore Rules</h2>
          <button
            onClick={() => {
              setIgnoreText(settings.ignoreRules.global.join('\n'))
              setEditingIgnore(true)
            }}
            className="px-3 py-1 bg-gray-700 rounded text-sm"
          >
            Edit
          </button>
        </div>
        <div className="bg-gray-800 rounded p-3 font-mono text-sm">
          {settings.ignoreRules.global.map((rule, i) => (
            <div key={i} className="text-gray-300">{rule}</div>
          ))}
        </div>
      </section>

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Add CLI</h2>
            <input
              type="text"
              placeholder="CLI name (e.g., Claude)"
              value={newCliName}
              onChange={(e) => setNewCliName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded mb-3"
            />
            <input
              type="text"
              placeholder="Install path (e.g., C:\Users\a\.claude)"
              value={newCliPath}
              onChange={(e) => setNewCliPath(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 bg-gray-700 rounded">
                Cancel
              </button>
              <button
                onClick={() => addCliMutation.mutate({ name: newCliName, installPath: newCliPath })}
                disabled={!newCliName.trim() || !newCliPath.trim()}
                className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {editingIgnore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 w-[500px]">
            <h2 className="text-xl font-bold mb-4">Edit Ignore Rules</h2>
            <textarea
              value={ignoreText}
              onChange={(e) => setIgnoreText(e.target.value)}
              className="w-full h-48 px-3 py-2 bg-gray-700 rounded font-mono text-sm mb-4"
              placeholder="One rule per line (gitignore syntax)"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingIgnore(false)} className="px-4 py-2 bg-gray-700 rounded">
                Cancel
              </button>
              <button
                onClick={() => updateIgnoreMutation.mutate({
                  global: ignoreText.split('\n').filter(Boolean)
                })}
                className="px-4 py-2 bg-blue-600 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { setSettings } = useSettingsStore()

  // Load settings on mount
  trpc.settings.get.useQuery(undefined, {
    onSuccess: setSettings
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
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
