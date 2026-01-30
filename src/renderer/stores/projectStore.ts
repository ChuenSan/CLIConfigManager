import { create } from 'zustand'
import { ProjectMeta } from '@shared/types'

interface ProjectState {
  projects: string[]
  currentProject: ProjectMeta | null
  currentProjectName: string | null
  loading: boolean
  setProjects: (projects: string[]) => void
  setCurrentProject: (project: ProjectMeta | null) => void
  setCurrentProjectName: (name: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  currentProjectName: null,
  loading: true,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setCurrentProjectName: (currentProjectName) => set({ currentProjectName }),
  setLoading: (loading) => set({ loading })
}))
